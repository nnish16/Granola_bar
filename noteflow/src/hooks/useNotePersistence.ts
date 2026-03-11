import { useEffect, useRef, useState } from "react";
import { noteflowIpc } from "../lib/ipc";
import type { NoteBlock } from "../types";
import { normalizeNoteBlocks, serializeNoteBlocks } from "../lib/note-blocks";
import { useQueuedSave } from "./useQueuedSave";

type UseNotePersistenceOptions = {
  blocks: NoteBlock[];
  meetingId: string;
  createFallbackBlocks: () => NoteBlock[];
};

export function useNotePersistence({
  blocks,
  meetingId,
  createFallbackBlocks,
}: UseNotePersistenceOptions): {
  addBlock: () => void;
  draftBlocks: NoteBlock[];
  isSaving: boolean;
  replaceBlocks: (nextBlocks: NoteBlock[], persistence: "flush" | "schedule") => NoteBlock[];
  saveNow: () => void;
  updateBlock: (blockId: string, newContent: string) => void;
} {
  const resolveBlocks = (incomingBlocks: NoteBlock[]): NoteBlock[] =>
    normalizeNoteBlocks(incomingBlocks.length > 0 ? incomingBlocks : createFallbackBlocks());

  const initialBlocks = resolveBlocks(blocks);
  const [draftBlocks, setDraftBlocks] = useState<NoteBlock[]>(initialBlocks);
  const draftBlocksRef = useRef(draftBlocks);
  const meetingIdRef = useRef(meetingId);
  const isDirtyRef = useRef(false);
  const lastPersistedKeyRef = useRef(serializeNoteBlocks(initialBlocks));

  const syncDraftBlocks = (nextBlocks: NoteBlock[]): void => {
    draftBlocksRef.current = nextBlocks;
    setDraftBlocks(nextBlocks);
  };

  const { flush, isSaving, schedule } = useQueuedSave<NoteBlock[], NoteBlock[]>({
    delayMs: 250,
    onSave: async (nextBlocks) => {
      const savedBlocks = await noteflowIpc.notes.save({
        meetingId: meetingIdRef.current,
        blocks: nextBlocks,
      });
      return normalizeNoteBlocks(savedBlocks.length > 0 ? savedBlocks : nextBlocks);
    },
    onSaved: (savedBlocks) => {
      lastPersistedKeyRef.current = serializeNoteBlocks(savedBlocks);
      isDirtyRef.current = false;
      syncDraftBlocks(savedBlocks);
    },
  });

  useEffect(() => {
    const nextBlocks = resolveBlocks(blocks);
    const nextKey = serializeNoteBlocks(nextBlocks);
    const meetingChanged = meetingIdRef.current !== meetingId;

    meetingIdRef.current = meetingId;

    if (meetingChanged) {
      isDirtyRef.current = false;
      lastPersistedKeyRef.current = nextKey;
      syncDraftBlocks(nextBlocks);
      return;
    }

    if (isDirtyRef.current && nextKey !== lastPersistedKeyRef.current) {
      return;
    }

    lastPersistedKeyRef.current = nextKey;
    if (serializeNoteBlocks(draftBlocksRef.current) !== nextKey) {
      syncDraftBlocks(nextBlocks);
    }
  }, [blocks, meetingId, createFallbackBlocks]);

  const updateBlock = (blockId: string, newContent: string): void => {
    isDirtyRef.current = true;

    const nextBlocks = normalizeNoteBlocks(
      draftBlocksRef.current.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: newContent,
            }
          : block,
      ),
    );

    syncDraftBlocks(nextBlocks);
    schedule(nextBlocks);
  };

  const replaceBlocks = (nextBlocks: NoteBlock[], persistence: "flush" | "schedule"): NoteBlock[] => {
    isDirtyRef.current = true;
    const normalizedBlocks = normalizeNoteBlocks(nextBlocks);
    syncDraftBlocks(normalizedBlocks);

    if (persistence === "flush") {
      flush(normalizedBlocks);
    } else {
      schedule(normalizedBlocks);
    }

    return normalizedBlocks;
  };

  const addBlock = (): void => {
    isDirtyRef.current = true;

    const nextBlocks = normalizeNoteBlocks([
      ...draftBlocksRef.current,
      {
        id: crypto.randomUUID(),
        blockOrder: draftBlocksRef.current.length,
        blockType: "paragraph",
        content: "",
        source: "user",
        transcriptRef: null,
      },
    ]);

    syncDraftBlocks(nextBlocks);
    flush(nextBlocks);
  };

  const saveNow = (): void => {
    flush(draftBlocksRef.current);
  };

  return {
    addBlock,
    draftBlocks,
    isSaving,
    replaceBlocks,
    saveNow,
    updateBlock,
  };
}
