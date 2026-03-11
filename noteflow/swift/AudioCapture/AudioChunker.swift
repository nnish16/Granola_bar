import Foundation
import AVFoundation
import CoreMedia

/// Receives raw CMSampleBuffers from ScreenCaptureKit, resamples from 48kHz stereo
/// to 16kHz mono float32, accumulates samples, and fires a callback every `chunkDuration` seconds.
///
/// Output format: raw IEEE 754 float32 little-endian PCM, mono, 16kHz
/// Chunk size: 16000 * chunkDuration * 4 bytes (e.g. 192,000 bytes for 3s)
final class AudioChunker {

    // MARK: - Config

    private let sourceSampleRate: Double
    private let targetSampleRate: Double
    private let chunkDuration: Double

    /// Number of float32 samples per chunk at target rate
    private var samplesPerChunk: Int { Int(targetSampleRate * chunkDuration) }

    // MARK: - State

    private var converter: AVAudioConverter?
    private var sampleAccumulator: [Float] = []
    private let onChunk: (Data) -> Void

    // MARK: - Init

    init(
        sourceSampleRate: Double = 48000,
        targetSampleRate: Double = 16000,
        chunkDuration: Double = 3.0,
        onChunk: @escaping (Data) -> Void
    ) {
        self.sourceSampleRate = sourceSampleRate
        self.targetSampleRate = targetSampleRate
        self.chunkDuration = chunkDuration
        self.onChunk = onChunk

        setupConverter()
    }

    // MARK: - Setup

    private func setupConverter() {
        guard
            let inputFormat = AVAudioFormat(
                commonFormat: .pcmFormatFloat32,
                sampleRate: sourceSampleRate,
                channels: 2,
                interleaved: false
            ),
            let outputFormat = AVAudioFormat(
                commonFormat: .pcmFormatFloat32,
                sampleRate: targetSampleRate,
                channels: 1,
                interleaved: false
            )
        else {
            fputs("[AudioChunker] Failed to create audio formats\n", stderr)
            return
        }

        guard let conv = AVAudioConverter(from: inputFormat, to: outputFormat) else {
            fputs("[AudioChunker] Failed to create AVAudioConverter\n", stderr)
            return
        }

        converter = conv
        fputs("[AudioChunker] Converter ready: \(sourceSampleRate)Hz stereo → \(targetSampleRate)Hz mono\n", stderr)
    }

    // MARK: - Process

    /// Called for each CMSampleBuffer from ScreenCaptureKit
    func process(sampleBuffer: CMSampleBuffer) {
        guard let converter = converter else { return }

        // 1. Wrap CMSampleBuffer in AVAudioPCMBuffer
        guard let inputBuffer = pcmBuffer(from: sampleBuffer) else { return }

        // 2. Calculate output frame capacity
        let inputFrames = AVAudioFrameCount(inputBuffer.frameLength)
        let ratio = targetSampleRate / sourceSampleRate
        let outputCapacity = AVAudioFrameCount(Double(inputFrames) * ratio + 1)

        guard
            let outputBuffer = AVAudioPCMBuffer(
                pcmFormat: converter.outputFormat,
                frameCapacity: outputCapacity
            )
        else { return }

        // 3. Convert: resample + downmix stereo → mono
        var error: NSError?
        var inputConsumed = false

        converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if inputConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            inputConsumed = true
            outStatus.pointee = .haveData
            return inputBuffer
        }

        if let err = error {
            fputs("[AudioChunker] Conversion error: \(err.localizedDescription)\n", stderr)
            return
        }

        // 4. Extract float samples and accumulate
        guard
            let channelData = outputBuffer.floatChannelData,
            outputBuffer.frameLength > 0
        else { return }

        let frameCount = Int(outputBuffer.frameLength)
        let samples = Array(UnsafeBufferPointer(start: channelData[0], count: frameCount))
        sampleAccumulator.append(contentsOf: samples)

        // 5. Drain complete chunks
        drainChunks()
    }

    // MARK: - Drain

    private func drainChunks() {
        let chunkSize = samplesPerChunk
        while sampleAccumulator.count >= chunkSize {
            let chunkSamples = Array(sampleAccumulator.prefix(chunkSize))
            sampleAccumulator.removeFirst(chunkSize)

            // Convert [Float] to raw bytes (little-endian IEEE 754)
            let data = chunkSamples.withUnsafeBytes { Data($0) }
            onChunk(data)
        }
    }

    // MARK: - CMSampleBuffer → AVAudioPCMBuffer

    private func pcmBuffer(from sampleBuffer: CMSampleBuffer) -> AVAudioPCMBuffer? {
        guard
            let formatDesc = CMSampleBufferGetFormatDescription(sampleBuffer),
            let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(formatDesc)
        else { return nil }

        let frameCount = CMSampleBufferGetNumSamples(sampleBuffer)

        guard
            let format = AVAudioFormat(streamDescription: asbd),
            let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frameCount))
        else { return nil }

        pcm.frameLength = AVAudioFrameCount(frameCount)

        let status = CMSampleBufferCopyPCMDataIntoAudioBufferList(
            sampleBuffer,
            at: 0,
            frameCount: Int32(frameCount),
            into: pcm.mutableAudioBufferList
        )

        guard status == noErr else {
            fputs("[AudioChunker] CMSampleBuffer copy failed: \(status)\n", stderr)
            return nil
        }

        return pcm
    }
}
