import { useEffect, useRef, useState } from "react";
import { noteflowIpc } from "../lib/ipc";
import type { AudioChunkInfo } from "../types";

type RecordingStatus = {
  recordingStartedAt: number | null;
  now: number;
};

export function useRecordingStatus(): RecordingStatus {
  const recordingStartedAtRef = useRef<number | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;

    const setRecordingState = (value: number | null): void => {
      recordingStartedAtRef.current = value;
      if (isMounted) {
        setRecordingStartedAt(value);
      }
    };

    const syncRecordingState = async (meetingId?: string | null): Promise<void> => {
      try {
        const activeMeetingId = meetingId ?? (await noteflowIpc.audio.status()).meetingId;
        if (!activeMeetingId) {
          setRecordingState(null);
          return;
        }

        const meeting = await noteflowIpc.meetings.get(activeMeetingId);
        setRecordingState(meeting?.startedAt ?? Date.now());
      } catch {
        setRecordingState(null);
      }
    };

    const handleAudioChunk = (chunk: AudioChunkInfo): void => {
      if (recordingStartedAtRef.current === null) {
        void syncRecordingState(chunk.meetingId);
      }
    };

    const handleAudioReset = (): void => {
      setRecordingState(null);
    };

    void syncRecordingState();
    const unsubscribeChunk = noteflowIpc.audio.onChunk(handleAudioChunk);
    const unsubscribeStopped = noteflowIpc.audio.onStopped(handleAudioReset);
    const unsubscribeError = noteflowIpc.audio.onError(handleAudioReset);

    return () => {
      isMounted = false;
      unsubscribeChunk();
      unsubscribeStopped();
      unsubscribeError();
    };
  }, []);

  useEffect(() => {
    if (!recordingStartedAt) {
      setNow(Date.now());
      return;
    }

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(clockInterval);
    };
  }, [recordingStartedAt]);

  return {
    recordingStartedAt,
    now,
  };
}
