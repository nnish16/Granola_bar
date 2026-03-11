import { Plus } from "lucide-react";
import { useState } from "react";
import type { NoteBlock as NoteBlockModel } from "../../types";
import { useNotePersistence } from "../../hooks/useNotePersistence";
import { enhanceMeetingNote } from "../../lib/gemini";
import { noteflowIpc } from "../../lib/ipc";
import Button from "../ui/Button";
import NoteBlock from "./NoteBlock";

type NoteEditorProps = {
  blocks: NoteBlockModel[];
  meetingId: string;
};

function createEmptyBlock(blockOrder: number): NoteBlockModel {
  return {
    id: crypto.randomUUID(),
    blockOrder,
    blockType: blockOrder === 0 ? "heading" : "paragraph",
    content: "",
    source: "user",
    transcriptRef: null,
  };
}

function createFallbackBlocks(): NoteBlockModel[] {
  return [createEmptyBlock(0)];
}

export default function NoteEditor({ blocks, meetingId }: NoteEditorProps): JSX.Element {
  const [enhancingBlockId, setEnhancingBlockId] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const { addBlock, draftBlocks, isSaving, replaceBlocks, saveNow, updateBlock } = useNotePersistence({
    blocks,
    meetingId,
    createFallbackBlocks,
  });

  const handleEnhance = async (blockId: string): Promise<void> => {
    const sourceBlock = draftBlocks.find((block) => block.id === blockId && block.source === "user");
    if (!sourceBlock) {
      return;
    }

    if (!sourceBlock.content.trim()) {
      setEnhanceError("Add some note text before generating an AI enhancement.");
      return;
    }

    setEnhanceError(null);
    setEnhancingBlockId(blockId);

    try {
      const settings = await noteflowIpc.settings.get();
      if (!settings.googleAiKey.trim()) {
        throw new Error("Add your Google AI Studio API key in Settings before using AI enhancement.");
      }

      const enhancedText = await enhanceMeetingNote({
        apiKey: settings.googleAiKey.trim(),
        noteText: sourceBlock.content,
      });

      const sourceIndex = draftBlocks.findIndex((block) => block.id === blockId);
      const aiBlock: NoteBlockModel = {
        id: crypto.randomUUID(),
        blockOrder: sourceIndex + 1,
        blockType: "paragraph",
        content: enhancedText,
        source: "ai",
        transcriptRef: sourceBlock.transcriptRef,
      };

      const nextBlocks = [
        ...draftBlocks.slice(0, sourceIndex + 1),
        aiBlock,
        ...draftBlocks.slice(sourceIndex + 1),
      ];
      replaceBlocks(nextBlocks, "flush");
    } catch (error) {
      setEnhanceError(error instanceof Error ? error.message : "Unable to generate AI enhancement.");
    } finally {
      setEnhancingBlockId(null);
    }
  };

  return (
    <section className="panel-surface flex min-h-[520px] flex-col p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-user">Notes</p>
          <p className="text-xs text-secondary">
            User blocks stay editable. AI blocks are read-only and rendered in gray italic text.
          </p>
          {enhanceError ? <p className="mt-2 text-xs text-accent">{enhanceError}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary">{isSaving ? "Saving…" : "Saved locally"}</span>
          <Button
            variant="secondary"
            className="h-9 rounded-full px-4"
            onClick={addBlock}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add note
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {draftBlocks.map((block, index) => (
          <NoteBlock
            key={block.id ?? `${block.source}-${index}`}
            block={block}
            isEnhancing={enhancingBlockId === block.id}
            onChange={updateBlock}
            onEnhance={(blockId) => {
              void handleEnhance(blockId);
            }}
            onSave={saveNow}
          />
        ))}
      </div>
    </section>
  );
}
