import type { NoteBlock } from "../types";

export function normalizeNoteBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    id: block.id ?? crypto.randomUUID(),
    blockOrder: index,
  }));
}

export function serializeNoteBlocks(blocks: NoteBlock[]): string {
  return JSON.stringify(
    blocks.map((block) => ({
      id: block.id ?? null,
      blockOrder: block.blockOrder,
      blockType: block.blockType,
      content: block.content,
      source: block.source,
      transcriptRef: block.transcriptRef,
    })),
  );
}
