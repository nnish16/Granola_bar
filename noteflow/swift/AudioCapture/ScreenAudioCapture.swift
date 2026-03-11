import Foundation
import ScreenCaptureKit
import AVFoundation

// MARK: - Capture Errors

enum CaptureError: LocalizedError {
    case noDisplayFound
    case permissionDenied
    case streamStartFailed(String)

    var errorDescription: String? {
        switch self {
        case .noDisplayFound:
            return "No display found for audio capture"
        case .permissionDenied:
            return "Screen capture permission denied — grant access in System Settings > Privacy > Screen Recording"
        case .streamStartFailed(let msg):
            return "Stream failed to start: \(msg)"
        }
    }
}

// MARK: - ScreenAudioCapture

@available(macOS 13.0, *)
final class ScreenAudioCapture: NSObject, SCStreamOutput, SCStreamDelegate {

    /// Callback invoked on every audio CMSampleBuffer from SCStream
    private let onSampleBuffer: (CMSampleBuffer) -> Void

    private var stream: SCStream?
    private let streamQueue = DispatchQueue(
        label: "com.noteflow.audiocapture",
        qos: .userInteractive
    )

    init(onSampleBuffer: @escaping (CMSampleBuffer) -> Void) {
        self.onSampleBuffer = onSampleBuffer
        super.init()
    }

    // MARK: - Start

    func start() async throws {
        // 1. Enumerate shareable content (triggers permission dialog on first run)
        let content: SCShareableContent
        do {
            content = try await SCShareableContent.getExcludingDesktopWindows(
                false,
                onScreenWindowsOnly: false
            )
        } catch {
            let desc = error.localizedDescription.lowercased()
            if desc.contains("permission") || desc.contains("denied") || desc.contains("not authorized") {
                throw CaptureError.permissionDenied
            }
            throw error
        }

        guard let display = content.displays.first else {
            throw CaptureError.noDisplayFound
        }

        // 2. Stream configuration — audio only, minimal video
        let config = SCStreamConfiguration()
        config.capturesAudio = true
        config.excludesCurrentProcessAudio = false  // capture all system audio
        config.sampleRate = 48000                   // native rate; resampled to 16kHz in AudioChunker
        config.channelCount = 2                     // stereo; mixed to mono in AudioChunker

        // SCStream requires video enabled; set to absolute minimum
        config.width = 2
        config.height = 2
        config.minimumFrameInterval = CMTime(value: 1, timescale: 1)  // 1 fps

        // 3. Filter: capture whole display (no app exclusions)
        let filter = SCContentFilter(
            display: display,
            excludingApplications: [],
            exceptingWindows: []
        )

        // 4. Create stream
        let newStream = SCStream(filter: filter, configuration: config, delegate: self)
        self.stream = newStream

        // 5. Register audio output handler
        do {
            try newStream.addStreamOutput(
                self,
                type: .audio,
                sampleHandlerQueue: streamQueue
            )
        } catch {
            throw CaptureError.streamStartFailed(error.localizedDescription)
        }

        // 6. Begin capture
        do {
            try await newStream.startCapture()
        } catch {
            throw CaptureError.streamStartFailed(error.localizedDescription)
        }

        fputs("[AudioCapture] Started capturing system audio at 48kHz stereo\n", stderr)
    }

    // MARK: - Stop

    func stop() async {
        guard let s = stream else { return }
        stream = nil
        try? await s.stopCapture()
        fputs("[AudioCapture] Stopped\n", stderr)
    }

    // MARK: - SCStreamOutput

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard outputType == .audio, sampleBuffer.isValid else { return }
        onSampleBuffer(sampleBuffer)
    }

    // MARK: - SCStreamDelegate

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        fputs("[AudioCapture] Stream stopped unexpectedly: \(error.localizedDescription)\n", stderr)
        DispatchQueue.main.async { exit(0) }
    }
}
