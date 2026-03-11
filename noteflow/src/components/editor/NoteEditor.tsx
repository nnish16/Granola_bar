import { Plus } from "lucide-react";
import Button from "../ui/Button";
import type { NoteBlock as NoteBlockModel } from "../../types";
import NoteBlock from "./NoteBlock";

type NoteEditorProps = {
  blocks: NoteBlockModel[];
  isSaving?: boolean;
  onBlocksChange: (blocks: NoteBlockModel[]) => void;
  onSave: (blocks: NoteBlockModel[]) => Promise<void>;
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

function normalizeBlocks(blocks: NoteBlockModel[]): NoteBlockModel[] {
  return blocks.map((block, index) => ({
    ...block,
    id: block.id ?? crypto.randomUUID(),
    blockOrder: index,
  }));
}

export default function NoteEditor({
  blocks,
  isSaving = false,
  onBlocksChange,
  onSave,
}: NoteEditorProps): JSX.Element {
  const resolvedBlocks = blocks.length > 0 ? normalizeBlocks(blocks) : [createEmptyBlock(0)];

  const updateBlocks = (nextBlocks: NoteBlockModel[]): void => {
    onBlocksChange(normalizeBlocks(nextBlocks));
  };

  return (
    <section className="panel-surface p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-user">Notes</p>
          <p className="text-xs text-secondary">
            User notes stay dark. AI enhancements appear in gray with a subtle left rule.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary">{isSaving ? "Saving…" : "Saved locally"}</span>
          <Button
            variant="secondary"
            className="h-9 rounded-full px-4"
            onClick={() => {
              updateBlocks([...resolvedBlocks, createEmptyBlock(resolvedBlocks.length)]);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add note
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {resolvedBlocks.map((block, index) => (
          <NoteBlock
            key={block.id ?? `${block.source}-${index}`}
            block={block}
            isSaving={isSaving}
            onChange={(nextBlock) => {
              updateBlocks(resolvedBlocks.map((candidate, candidateIndex) => (candidateIndex === index ? nextBlock : candidate)));
            }}
            onEnhance={async () => {
              const aiBlock: NoteBlockModel = {
                id: crypto.randomUUID(),
                blockOrder: index + 1,
                blockType: "paragraph",
                content: `[AI enhanced: ${block.content || "Add context here"}]`,
                source: "ai",
                transcriptRef: block.transcriptRef,
              };
              const nextBlocks = [
                ...resolvedBlocks.slice(0, index + 1),
                aiBlock,
                ...resolvedBlocks.slice(index + 1),
              ];
              updateBlocks(nextBlocks);
              await onSave(normalizeBlocks(nextBlocks));
            }}
            onSave={() => {
              void onSave(resolvedBlocks);
            }}
          />
        ))}
      </div>
    </section>
  );
}
