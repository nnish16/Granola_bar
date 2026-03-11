import { ipcMain, type BrowserWindow } from "electron";
import { audioCapture } from "../audio/capture";

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

    // Forward chunk metadata to renderer
    // (We send metadata only — PCM data stays in main process for whisper.cpp)
    const chunkHandler = (event: { timestamp: number; durationMs: number }) => {
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

    const stoppedHandler = () => {
      audioCapture.off("audioChunk", chunkHandler);
      audioCapture.off("error", errorHandler);
      audioCapture.off("stopped", stoppedHandler);
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
