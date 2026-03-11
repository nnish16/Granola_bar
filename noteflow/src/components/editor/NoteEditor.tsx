import { Plus } from "lucide-react";
import type { NoteBlock as NoteBlockModel } from "../../types";
import { useNotePersistence } from "../../hooks/useNotePersistence";
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
  const { addBlock, draftBlocks, isSaving, saveNow, updateBlock } = useNotePersistence({
    blocks,
    meetingId,
    createFallbackBlocks,
  });

  return (
    <section className="panel-surface flex min-h-[520px] flex-col p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-user">Notes</p>
          <p className="text-xs text-secondary">
            User blocks stay editable. AI blocks are read-only and rendered in gray italic text.
          </p>
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
            onChange={updateBlock}
            onEnhance={(blockId) => {
              console.log("enhance", blockId);
            }}
            onSave={saveNow}
          />
        ))}
      </div>
    </section>
  );
}
