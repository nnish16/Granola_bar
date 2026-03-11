import { useEffect, useRef, useState } from "react";

type UseQueuedSaveOptions<TInput, TResult> = {
  delayMs: number;
  onSave: (input: TInput) => Promise<TResult>;
  onSaved?: (result: TResult, input: TInput) => void;
};

export function useQueuedSave<TInput, TResult>({
  delayMs,
  onSave,
  onSaved,
}: UseQueuedSaveOptions<TInput, TResult>): {
  flush: (input: TInput) => void;
  isSaving: boolean;
  schedule: (input: TInput) => void;
} {
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const queuedInputRef = useRef<TInput | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const runSave = async (input: TInput): Promise<void> => {
    queuedInputRef.current = input;
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    if (isMountedRef.current) {
      setIsSaving(true);
    }

    try {
      while (queuedInputRef.current !== null) {
        const nextInput = queuedInputRef.current;
        queuedInputRef.current = null;
        const result = await onSave(nextInput);
        onSaved?.(result, nextInput);
      }
    } finally {
      isSavingRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const schedule = (input: TInput): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runSave(input);
    }, delayMs);
  };

  const flush = (input: TInput): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    void runSave(input);
  };

  return {
    flush,
    isSaving,
    schedule,
  };
}
