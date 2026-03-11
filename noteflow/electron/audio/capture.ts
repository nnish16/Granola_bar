import { EventEmitter } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { app } from "electron";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioChunkEvent {
  /** Raw IEEE 754 float32 little-endian PCM, mono, 16kHz */
  pcmF32Buffer: Buffer;
  /** Unix timestamp (ms) when the chunk was emitted */
  timestamp: number;
  /** Duration of this chunk in milliseconds (always 3000 for 3-second chunks) */
  durationMs: number;
}

export interface AudioCaptureEvents {
  audioChunk: (event: AudioChunkEvent) => void;
  started: () => void;
  stopped: (info: { code: number | null; signal: string | null }) => void;
  error: (err: Error) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 16kHz * 3s * 4 bytes per float32 = 192,000 bytes per chunk */
const CHUNK_BYTES = 16_000 * 3 * 4;
const CHUNK_DURATION_MS = 3_000;

// ---------------------------------------------------------------------------
// AudioCapture
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of the Swift AudioCapture helper binary.
 *
 * Usage:
 *   audioCapture.on('audioChunk', (e) => processChunk(e.pcmF32Buffer))
 *   await audioCapture.start(meetingId)
 *   // ... later ...
 *   audioCapture.stop()
 */
export class AudioCapture extends EventEmitter {
  declare emit: <K extends keyof AudioCaptureEvents>(
    event: K,
    ...args: Parameters<AudioCaptureEvents[K]>
  ) => boolean;

  declare on: <K extends keyof AudioCaptureEvents>(
    event: K,
    listener: AudioCaptureEvents[K]
  ) => this;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  private process: ChildProcess | null = null;
  private readBuffer: Buffer = Buffer.alloc(0);
  private currentMeetingId: string | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  get isCapturing(): boolean {
    return this.process !== null;
  }

  get meetingId(): string | null {
    return this.currentMeetingId;
  }

  /**
   * Spawns the Swift binary and begins capturing system audio.
   * Resolves once the process has started (not once audio arrives).
   */
  async start(meetingId: string): Promise<void> {
    if (this.process) {
      throw new Error("[AudioCapture] Already capturing. Call stop() first.");
    }

    this.currentMeetingId = meetingId;
    this.readBuffer = Buffer.alloc(0);

    const binaryPath = this.resolveBinaryPath();

    const child = spawn(binaryPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.process = child;

    // Drain binary PCM from stdout in CHUNK_BYTES blocks
    child.stdout?.on("data", (chunk: Buffer) => {
      this.readBuffer = Buffer.concat([this.readBuffer, chunk]);
      this.drainChunks();
    });

    // Log stderr to console (diagnostic output from Swift binary)
    child.stderr?.on("data", (data: Buffer) => {
      console.log("[AudioCapture]", data.toString().trimEnd());
    });

    // Process exit
    child.on("exit", (code, signal) => {
      this.process = null;
      this.currentMeetingId = null;
      this.readBuffer = Buffer.alloc(0);
      this.emit("stopped", { code, signal });
    });

    // Spawn error (e.g. binary not found)
    child.on("error", (err: Error) => {
      this.process = null;
      this.currentMeetingId = null;
      this.emit("error", err);
    });

    // Give the binary a moment to initialise before returning
    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    if (!this.process) {
      throw new Error("[AudioCapture] Binary exited immediately after launch.");
    }

    this.emit("started");
  }

  /**
   * Sends SIGTERM to the Swift binary and resets state.
   */
  stop(): void {
    if (!this.process) return;
    this.process.kill("SIGTERM");
    // 'exit' event handler will clean up state
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private drainChunks(): void {
    while (this.readBuffer.length >= CHUNK_BYTES) {
      const rawChunk = this.readBuffer.subarray(0, CHUNK_BYTES);
      this.readBuffer = Buffer.from(this.readBuffer.subarray(CHUNK_BYTES));

      this.emit("audioChunk", {
        pcmF32Buffer: Buffer.from(rawChunk), // own copy — don't hold ref to large buffer
        timestamp: Date.now(),
        durationMs: CHUNK_DURATION_MS,
      } satisfies AudioChunkEvent);
    }
  }

  private resolveBinaryPath(): string {
    if (app.isPackaged) {
      // Production: binary is bundled inside .app/Contents/Resources/
      return path.join(process.resourcesPath, "AudioCapture");
    }
    // Development: built by scripts/build-swift.sh into resources/AudioCapture
    return path.join(app.getAppPath(), "..", "resources", "AudioCapture");
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const audioCapture = new AudioCapture();
