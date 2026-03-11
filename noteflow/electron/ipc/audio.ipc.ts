import { ipcMain, type BrowserWindow } from "electron";
import { audioCapture } from "../audio/capture";
import { createTranscriber } from "../audio/transcriber";
import { callDatabaseWorker } from "../db/worker-client";
import type { Meeting, TranscriptSegment } from "../../src/types";

/**
 * Registers IPC handlers for audio capture.
 *
 * Channels (renderer → main, invoke/handle):
 *   audio:start   { meetingId: string }  → { ok: true }
 *   audio:stop    {}                     → { ok: true }
 *   audio:status  {}                     → { isCapturing: boolean; meetingId: string | null }
 *
 * Channels (main → renderer, send):
 *   audio:chunk   { meetingId: string; timestamp: number; durationMs: number }
 *   audio:error   { message: string }
 *   audio:stopped {}
 */
export function registerAudioIpcHandlers(mainWindow: BrowserWindow): void {
  // ---------------------------------------------------------------------------
  // audio:start
  // ---------------------------------------------------------------------------
  ipcMain.handle("audio:start", async (_event, meetingId: string) => {
    if (audioCapture.isCapturing) {
      return { ok: false, error: "Already capturing" };
    }

    const meeting = await callDatabaseWorker<Meeting | null>("meetings:get", meetingId);
    if (!meeting) {
      return { ok: false, error: `Meeting ${meetingId} not found.` };
    }

    const transcriber = createTranscriber({
      meetingStartedAt: meeting.startedAt,
      onError: (error) => {
        if (mainWindow.isDestroyed()) return;
        mainWindow.webContents.send("audio:error", { message: error.message });
      },
      onSegments: async (segments) => {
        if (segments.length === 0) {
          return;
        }

        await callDatabaseWorker("transcripts:appendBatch", {
          meetingId,
          segments,
        });
      },
    });

    // Forward chunk metadata to renderer
    // (We send metadata only — PCM data stays in main process for whisper.cpp)
    const chunkHandler = (event: { pcmF32Buffer: Buffer; timestamp: number; durationMs: number }) => {
      transcriber.pushChunk(event.pcmF32Buffer, event.timestamp, event.durationMs);
      if (mainWindow.isDestroyed()) return;
      mainWindow.webContents.send("audio:chunk", {
        meetingId,
        timestamp: event.timestamp,
        durationMs: event.durationMs,
      });
    };

    const errorHandler = (err: Error) => {
      if (mainWindow.isDestroyed()) return;
      mainWindow.webContents.send("audio:error", { message: err.message });
    };

    const stoppedHandler = async () => {
      audioCapture.off("audioChunk", chunkHandler);
      audioCapture.off("error", errorHandler);
      audioCapture.off("stopped", stoppedHandler);
      try {
        await transcriber.stop(Date.now());
      } catch (error) {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("audio:error", {
            message: error instanceof Error ? error.message : "Unable to flush transcription.",
          });
        }
      }
      if (mainWindow.isDestroyed()) return;
      mainWindow.webContents.send("audio:stopped", {});
    };

    audioCapture.on("audioChunk", chunkHandler);
    audioCapture.on("error", errorHandler);
    audioCapture.on("stopped", stoppedHandler);

    try {
      await audioCapture.start(meetingId);
      return { ok: true };
    } catch (err) {
      audioCapture.off("audioChunk", chunkHandler);
      audioCapture.off("error", errorHandler);
      audioCapture.off("stopped", stoppedHandler);
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  });

  // ---------------------------------------------------------------------------
  // audio:stop
  // ---------------------------------------------------------------------------
  ipcMain.handle("audio:stop", () => {
    audioCapture.stop();
    return { ok: true };
  });

  // ---------------------------------------------------------------------------
  // audio:status
  // ---------------------------------------------------------------------------
  ipcMain.handle("audio:status", () => ({
    isCapturing: audioCapture.isCapturing,
    meetingId: audioCapture.meetingId,
  }));
}
