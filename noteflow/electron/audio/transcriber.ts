import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { transcribeAudioChunk } from "./transcription-worker-client";

export type TranscriberSegment = {
  text: string;
  startMs: number;
  endMs: number;
  speakerLabel: string;
};

type CreateTranscriberOptions = {
  meetingStartedAt: number;
  onError?: (error: Error) => void;
  onSegments: (segments: TranscriberSegment[]) => Promise<void> | void;
};

const FLUSH_INTERVAL_MS = 30_000;

function getWhisperModelPath(): string {
  const baseDir = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return app.isPackaged
    ? path.join(baseDir, "models", "ggml-base.en.bin")
    : path.join(baseDir, "resources", "models", "ggml-base.en.bin");
}

function ensureWhisperModelPath(): string {
  const modelPath = getWhisperModelPath();
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Whisper model not found at ${modelPath}. Run npm run download:whisper in the noteflow directory.`);
  }

  return modelPath;
}

export function createTranscriber({
  meetingStartedAt,
  onError,
  onSegments,
}: CreateTranscriberOptions): {
  pushChunk: (pcmF32Buffer: Buffer, timestamp: number, durationMs: number) => void;
  stop: (timestampMs: number) => Promise<void>;
} {
  let bufferedChunks: Buffer[] = [];
  let bufferedDurationMs = 0;
  let flushInFlight = false;
  let flushRequested = false;
  let latestRequestedTimestamp = 0;
  let flushQueue = Promise.resolve();

  const enqueueFlush = (currentTimestampMs: number): Promise<void> => {
    latestRequestedTimestamp = currentTimestampMs;
    flushRequested = true;

    if (flushInFlight) {
      return flushQueue;
    }

    flushQueue = (async () => {
      flushInFlight = true;
      try {
        while (flushRequested) {
          flushRequested = false;
          await flush(latestRequestedTimestamp);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        flushInFlight = false;
      }
    })();

    return flushQueue;
  };

  const flush = async (currentTimestampMs: number): Promise<void> => {
    if (bufferedChunks.length === 0 || bufferedDurationMs === 0) {
      return;
    }

    const rawAudio = Buffer.concat(bufferedChunks);
    const chunkDurationMs = bufferedDurationMs;
    bufferedChunks = [];
    bufferedDurationMs = 0;

    const chunkStartedAt = currentTimestampMs - chunkDurationMs;
    const relativeChunkStartMs = Math.max(0, chunkStartedAt - meetingStartedAt);
    const transcription = await transcribeAudioChunk({
      rawPcmF32: rawAudio,
      modelPath: ensureWhisperModelPath(),
      tempDir: app.getPath("temp"),
    });

    if (transcription.segments.length === 0) {
      return;
    }

    await onSegments(
      transcription.segments.map((segment) => ({
        ...segment,
        startMs: relativeChunkStartMs + segment.startMs,
        endMs: relativeChunkStartMs + segment.endMs,
      })),
    );
  };

  return {
    pushChunk(pcmF32Buffer, timestamp, durationMs) {
      bufferedChunks.push(Buffer.from(pcmF32Buffer));
      bufferedDurationMs += durationMs;

      if (bufferedDurationMs >= FLUSH_INTERVAL_MS) {
        void enqueueFlush(timestamp);
      }
    },
    async stop(timestampMs) {
      await enqueueFlush(timestampMs);
    },
  };
}
