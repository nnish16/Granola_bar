/**
 * transcriber.ts — Phase 4: whisper.cpp transcription pipeline
 *
 * This module will:
 *   1. Receive PCM Float32 audio chunks from audioCapture ('audioChunk' events)
 *   2. Feed them into a whisper.cpp Node native addon (or child_process)
 *   3. Emit transcript segments: { text, startMs, endMs, speakerLabel }
 *   4. Write segments to the database via the meetings IPC worker
 *
 * Phase 3 deliverable: capture.ts already emits 'audioChunk' events with:
 *   { pcmF32Buffer: Buffer, timestamp: number, durationMs: number }
 *
 * To implement in Phase 4:
 *   - Download whisper.cpp model via scripts/download-whisper.sh
 *   - Build nodejs native addon or use whisper-node package
 *   - Wire audioCapture.on('audioChunk', ...) → whisper → DB write
 *
 * PLACEHOLDER — do not use yet.
 */
export function createTranscriber(): null {
  // Phase 4 implementation goes here
  return null;
}
