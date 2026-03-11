import { create } from "zustand";
import type { TranscriptSegment } from "../types";

type RecordingStore = {
  isRecording: boolean;
  transcriptSegments: TranscriptSegment[];
  setRecording: (isRecording: boolean) => void;
  setTranscriptSegments: (segments: TranscriptSegment[]) => void;
};

export const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  transcriptSegments: [],
  setRecording: (isRecording) => set({ isRecording }),
  setTranscriptSegments: (transcriptSegments) => set({ transcriptSegments }),
}));
