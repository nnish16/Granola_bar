import { useEffect, useRef, useState } from "react";
import { noteflowIpc } from "../lib/ipc";
import type { TranscriptSegment } from "../types";
import { useTranscriptSegments } from "./useTranscriptSegments";

type UseTranscriptOptions = {
  isLive: boolean;
  meetingId: string;
  startedAt: number;
};

function findActiveSegmentIndex(segments: TranscriptSegment[], elapsedMs: number): number | null {
  for (const segment of segments) {
    if (elapsedMs >= segment.startMs && elapsedMs < segment.endMs) {
      return segment.segmentIndex;
    }
  }

  return null;
}

export function useTranscript({
  isLive,
  meetingId,
  startedAt,
}: UseTranscriptOptions): {
  activeSegmentIndex: number | null;
  isLoading: boolean;
  segments: TranscriptSegment[];
} {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const latestElapsedMsRef = useRef<number | null>(null);
  const { isLoading, requestRefresh, segments, segmentsRef } = useTranscriptSegments({
    isLive,
    meetingId,
  });

  useEffect(() => {
    if (latestElapsedMsRef.current === null || segments.length === 0) {
      return;
    }

    setActiveSegmentIndex(findActiveSegmentIndex(segments, latestElapsedMsRef.current));
  }, [segments]);

  useEffect(() => {
    setActiveSegmentIndex(null);
    latestElapsedMsRef.current = null;

    const unsubscribeChunk = noteflowIpc.audio.onChunk(({ meetingId: activeMeetingId, timestamp }) => {
      if (activeMeetingId !== meetingId) {
        return;
      }

      const elapsedMs = Math.max(0, timestamp - startedAt);
      latestElapsedMsRef.current = elapsedMs;
      setActiveSegmentIndex(findActiveSegmentIndex(segmentsRef.current, elapsedMs));
      requestRefresh();
    });

    const unsubscribeStopped = noteflowIpc.audio.onStopped(() => {
      latestElapsedMsRef.current = null;
      setActiveSegmentIndex(null);
    });

    return () => {
      unsubscribeChunk();
      unsubscribeStopped();
    };
  }, [meetingId, requestRefresh, segmentsRef, startedAt]);

  return {
    activeSegmentIndex,
    isLoading,
    segments,
  };
}
