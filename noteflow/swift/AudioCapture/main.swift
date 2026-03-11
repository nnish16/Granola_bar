import Foundation
import AVFoundation

// MARK: - Entry Point
//
// Protocol over stdout:
//   Binary stream of raw float32 PCM chunks
//   Each chunk = exactly (targetSampleRate * chunkDuration * 4) bytes
//   e.g. 16000 * 3 * 4 = 192,000 bytes per chunk
//
// Electron reads exactly CHUNK_BYTES at a time from child_process stdout.
//
// Stderr is used for diagnostic logs (visible in Electron when NODE_ENV=development).
//
// Shutdown: send SIGTERM or close stdin; process exits cleanly.

let TARGET_SAMPLE_RATE: Double = 16000
let CHUNK_DURATION: Double = 3.0

// MARK: - Graceful shutdown via SIGTERM / SIGINT

var captureRef: ScreenAudioCapture?

func handleShutdown() {
    Task {
        await captureRef?.stop()
        exit(0)
    }
}

signal(SIGTERM) { _ in handleShutdown() }
signal(SIGINT)  { _ in handleShutdown() }

// Close when stdin is closed (Electron closes the pipe on stop)
let stdinSource = DispatchSource.makeReadSource(fileDescriptor: STDIN_FILENO, queue: .main)
stdinSource.setEventHandler {
    var buf = [UInt8](repeating: 0, count: 1)
    let n = read(STDIN_FILENO, &buf, 1)
    if n <= 0 { handleShutdown() }
}
stdinSource.resume()

// MARK: - Main async task

if #available(macOS 13.0, *) {
    Task {
        // Chunker writes raw PCM bytes to stdout
        let stdout = FileHandle.standardOutput

        let chunker = AudioChunker(
            sourceSampleRate: 48000,
            targetSampleRate: TARGET_SAMPLE_RATE,
            chunkDuration: CHUNK_DURATION
        ) { chunkData in
            // Write entire chunk atomically so Electron reads clean boundaries
            stdout.write(chunkData)
        }

        let capture = ScreenAudioCapture { sampleBuffer in
            chunker.process(sampleBuffer: sampleBuffer)
        }

        captureRef = capture

        do {
            try await capture.start()
            // Block forever — SIGTERM / stdin-close triggers exit
            await withCheckedContinuation { (_: CheckedContinuation<Void, Never>) in }
        } catch {
            fputs("[AudioCapture] Fatal: \(error.localizedDescription)\n", stderr)
            exit(1)
        }
    }

    RunLoop.main.run()
} else {
    fputs("[AudioCapture] Error: macOS 13.0 or later is required for ScreenCaptureKit audio\n", stderr)
    exit(1)
}
