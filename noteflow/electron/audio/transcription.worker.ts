import { randomUUID } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { parentPort } from "node:worker_threads";

type WhisperOptions = {
  modelPath?: string;
  whisperOptions?: {
    language?: string;
    word_timestamps?: boolean;
  };
};

type WhisperResult = {
  end: string;
  speech: string;
  start: string;
};

type WhisperTranscribe = (filePath: string, options?: WhisperOptions) => Promise<WhisperResult[] | undefined>;

type WorkerRequest = {
  id: number;
  modelPath: string;
  rawPcmF32: Buffer;
  tempDir: string;
};

type WorkerResponse =
  | {
      id: number;
      segments: Array<{ endMs: number; speakerLabel: string; startMs: number; text: string }>;
      success: true;
    }
  | { error: string; id: number; success: false };

let whisperTranscribe: WhisperTranscribe | null = null;

function loadWhisper(): WhisperTranscribe {
  if (whisperTranscribe) {
    return whisperTranscribe;
  }

  // Lazy require so the worker initializes whisper.cpp only when the first transcription job arrives.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whisperModule = require("whisper-node") as {
    default?: WhisperTranscribe;
    whisper?: WhisperTranscribe;
  };
  whisperTranscribe = whisperModule.default ?? whisperModule.whisper ?? null;

  if (!whisperTranscribe) {
    throw new Error("whisper-node did not expose a transcription function.");
  }

  return whisperTranscribe;
}

function parseWhisperTimestamp(value: string): number {
  const normalizedValue = value.trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(normalizedValue)) {
    return Math.round(Number(normalizedValue) * 1000);
  }

  const parts = normalizedValue.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported Whisper timestamp format: ${value}`);
  }

  const seconds = parts[parts.length - 1] ?? 0;
  const minutes = parts[parts.length - 2] ?? 0;
  const hours = parts[parts.length - 3] ?? 0;
  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

function createWavHeader(pcmByteLength: number): Buffer {
  const wavBuffer = Buffer.allocUnsafe(44);
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(36 + pcmByteLength, 4);
  wavBuffer.write("WAVE", 8);
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(1, 22);
  wavBuffer.writeUInt32LE(16_000, 24);
  wavBuffer.writeUInt32LE(32_000, 28);
  wavBuffer.writeUInt16LE(2, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(pcmByteLength, 40);

  return wavBuffer;
}

async function writeChunk(stream: fs.WriteStream, chunk: Buffer): Promise<void> {
  if (stream.write(chunk)) {
    return;
  }

  await once(stream, "drain");
}

function floatPcmChunkToInt16Buffer(floatView: Float32Array, start: number, end: number): Buffer {
  const pcm16Chunk = Int16Array.from(floatView.subarray(start, end), (sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    return clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  });

  return Buffer.from(pcm16Chunk.buffer, pcm16Chunk.byteOffset, pcm16Chunk.byteLength);
}

async function writeTempWavFile(tempDir: string, rawPcmF32: Buffer): Promise<string> {
  const tempFile = path.join(tempDir, `noteflow-whisper-${randomUUID()}.wav`);
  const sampleCount = Math.floor(rawPcmF32.byteLength / Float32Array.BYTES_PER_ELEMENT);
  const floatView = new Float32Array(rawPcmF32.buffer, rawPcmF32.byteOffset, sampleCount);
  const stream = fs.createWriteStream(tempFile);
  const chunkSize = 16_000;

  try {
    await writeChunk(stream, createWavHeader(sampleCount * Int16Array.BYTES_PER_ELEMENT));

    for (let start = 0; start < floatView.length; start += chunkSize) {
      const end = Math.min(start + chunkSize, floatView.length);
      await writeChunk(stream, floatPcmChunkToInt16Buffer(floatView, start, end));
    }

    stream.end();
    await once(stream, "finish");
  } catch (error) {
    stream.destroy();
    await fsPromises.unlink(tempFile).catch(() => undefined);
    throw error;
  }

  return tempFile;
}

async function transcribeAudio(request: WorkerRequest): Promise<WorkerResponse> {
  if (!fs.existsSync(request.modelPath)) {
    throw new Error(`Whisper model not found at ${request.modelPath}. Run npm run download:whisper in the noteflow directory.`);
  }

  const whisper = loadWhisper();
  const wavFilePath = await writeTempWavFile(request.tempDir, request.rawPcmF32);

  try {
    const transcription = (await whisper(wavFilePath, {
      modelPath: request.modelPath,
      whisperOptions: {
        language: "en",
        word_timestamps: false,
      },
    })) ?? [];

    return {
      id: request.id,
      success: true,
      segments: transcription
        .map((segment) => ({
          text: segment.speech.trim(),
          startMs: parseWhisperTimestamp(segment.start),
          endMs: parseWhisperTimestamp(segment.end),
          speakerLabel: "Speaker",
        }))
        .filter((segment) => Boolean(segment.text)),
    };
  } finally {
    await fsPromises.unlink(wavFilePath).catch(() => undefined);
  }
}

if (!parentPort) {
  throw new Error("Transcription worker requires a parent port.");
}

parentPort.on("message", async (message: WorkerRequest) => {
  try {
    const response = await transcribeAudio(message);
    parentPort?.postMessage(response);
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : "Unable to transcribe audio.",
    } satisfies WorkerResponse);
  }
});
