import { useCallback, useEffect, useRef, useState } from "react";
import { noteflowIpc } from "../lib/ipc";
import type { TranscriptSegment } from "../types";

const LIVE_REFRESH_INTERVAL_MS = 1500;

type UseTranscriptSegmentsOptions = {
  isLive: boolean;
  meetingId: string;
};

export function useTranscriptSegments({
  isLive,
  meetingId,
}: UseTranscriptSegmentsOptions): {
  isLoading: boolean;
  requestRefresh: () => void;
  segments: TranscriptSegment[];
  segmentsRef: React.MutableRefObject<TranscriptSegment[]>;
} {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const meetingIdRef = useRef(meetingId);
  const lastSegmentIndexRef = useRef(-1);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const commitSegments = useCallback((nextSegments: TranscriptSegment[], replaceAll = false): TranscriptSegment[] => {
    const resolvedSegments = replaceAll ? nextSegments : [...segmentsRef.current, ...nextSegments];
    segmentsRef.current = resolvedSegments;
    lastSegmentIndexRef.current =
      resolvedSegments.length > 0 ? resolvedSegments[resolvedSegments.length - 1].segmentIndex : -1;
    if (isMountedRef.current) {
      setSegments(resolvedSegments);
    }
    return resolvedSegments;
  }, []);

  const refreshTranscript = useCallback(async () => {
    if (!meetingId || isRefreshingRef.current || !isMountedRef.current) {
      return;
    }

    const requestedMeetingId = meetingId;
    isRefreshingRef.current = true;

    try {
      const nextSegments =
        lastSegmentIndexRef.current < 0
          ? await noteflowIpc.meetings.transcript(meetingId)
          : await noteflowIpc.meetings.transcriptSince({
              meetingId,
              afterSegmentIndex: lastSegmentIndexRef.current,
            });

      if (!isMountedRef.current || meetingIdRef.current !== requestedMeetingId) {
        return;
      }

      if (lastSegmentIndexRef.current < 0) {
        commitSegments(nextSegments, true);
      } else if (nextSegments.length > 0) {
        commitSegments(nextSegments);
      }
    } catch {
      if (isMountedRef.current) {
        setSegments([]);
      }
    } finally {
      isRefreshingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }

      if (pendingRefreshRef.current && isMountedRef.current && isLive) {
        pendingRefreshRef.current = false;
        clearRefreshTimer();
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          void refreshTranscript();
        }, LIVE_REFRESH_INTERVAL_MS);
      }
    }
  }, [clearRefreshTimer, commitSegments, isLive, meetingId]);

  const requestRefresh = useCallback(() => {
    if (!isLive || !isMountedRef.current) {
      return;
    }

    pendingRefreshRef.current = true;
    if (isRefreshingRef.current || refreshTimerRef.current !== null) {
      return;
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      pendingRefreshRef.current = false;
      void refreshTranscript();
    }, LIVE_REFRESH_INTERVAL_MS);
  }, [isLive, refreshTranscript]);

  useEffect(() => {
    isMountedRef.current = true;
    meetingIdRef.current = meetingId;
    clearRefreshTimer();
    segmentsRef.current = [];
    lastSegmentIndexRef.current = -1;
    pendingRefreshRef.current = false;
    setSegments([]);
    setIsLoading(true);
    void refreshTranscript();

    return () => {
      isMountedRef.current = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, meetingId, refreshTranscript]);

  useEffect(() => {
    if (!isLive) {
      clearRefreshTimer();
      pendingRefreshRef.current = false;
    }
  }, [clearRefreshTimer, isLive]);

  return {
    isLoading,
    requestRefresh,
    segments,
    segmentsRef,
  };
}
