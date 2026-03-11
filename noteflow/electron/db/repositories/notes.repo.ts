import { randomUUID } from "node:crypto";
import { getDatabase } from "../database";
import { runBatchedInsert } from "./batch-insert";
import type { NoteBlock } from "../../../src/types";

const NOTE_BLOCK_INSERT_BATCH_SIZE = 100;

function getNextBlockOrder(meetingId: string): number {
  const result = getDatabase()
    .prepare("SELECT COALESCE(MAX(block_order), -1) + 1 AS nextBlockOrder FROM note_blocks WHERE meeting_id = ?")
    .get(meetingId) as { nextBlockOrder: number } | undefined;

  return result?.nextBlockOrder ?? 0;
}

export function getNotes(meetingId: string): NoteBlock[] {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          meeting_id AS meetingId,
          block_order AS blockOrder,
          block_type AS blockType,
          content,
          source,
          transcript_ref AS transcriptRef,
          updated_at AS updatedAt
        FROM note_blocks
        WHERE meeting_id = ?
        ORDER BY block_order ASC
      `,
    )
    .all(meetingId) as NoteBlock[];
}

export function getNoteBlock(id: string): NoteBlock | null {
  return (
    (getDatabase()
      .prepare(
        `
          SELECT
            id,
            meeting_id AS meetingId,
            block_order AS blockOrder,
            block_type AS blockType,
            content,
            source,
            transcript_ref AS transcriptRef,
            updated_at AS updatedAt
          FROM note_blocks
          WHERE id = ?
        `,
      )
      .get(id) as NoteBlock | undefined) ?? null
  );
}

export function upsertNoteBlock(meetingId: string, block: NoteBlock): NoteBlock {
  const normalizedBlock = {
    id: block.id || randomUUID(),
    meetingId,
    blockOrder: block.blockOrder ?? getNextBlockOrder(meetingId),
    blockType: block.blockType,
    content: block.content,
    source: block.source,
    transcriptRef: block.transcriptRef ?? null,
    updatedAt: Date.now(),
  };

  getDatabase()
    .prepare(
      `
        INSERT INTO note_blocks (
          id,
          meeting_id,
          block_order,
          block_type,
          content,
          source,
          transcript_ref,
          updated_at
        ) VALUES (
          @id,
          @meeting_id,
          @block_order,
          @block_type,
          @content,
          @source,
          @transcript_ref,
          @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          meeting_id = excluded.meeting_id,
          block_order = excluded.block_order,
          block_type = excluded.block_type,
          content = excluded.content,
          source = excluded.source,
          transcript_ref = excluded.transcript_ref,
          updated_at = excluded.updated_at
      `,
    )
    .run({
      id: normalizedBlock.id,
      meeting_id: normalizedBlock.meetingId,
      block_order: normalizedBlock.blockOrder,
      block_type: normalizedBlock.blockType,
      content: normalizedBlock.content,
      source: normalizedBlock.source,
      transcript_ref: normalizedBlock.transcriptRef,
      updated_at: normalizedBlock.updatedAt,
    });

  return getNoteBlock(normalizedBlock.id) as NoteBlock;
}

export function deleteNoteBlock(id: string): void {
  getDatabase().prepare("DELETE FROM note_blocks WHERE id = ?").run(id);
}

export function replaceNotes(meetingId: string, blocks: NoteBlock[]): NoteBlock[] {
  const db = getDatabase();
  const normalizedBlocks = blocks.map((block, index) => ({
    id: block.id || randomUUID(),
    meetingId,
    blockOrder: block.blockOrder ?? index,
    blockType: block.blockType,
    content: block.content,
    source: block.source,
    transcriptRef: block.transcriptRef ?? null,
    updatedAt: Date.now(),
  }));

  const saveTransaction = db.transaction(() => {
    db.prepare("DELETE FROM note_blocks WHERE meeting_id = ?").run(meetingId);

    if (normalizedBlocks.length === 0) {
      return;
    }

    runBatchedInsert(db, normalizedBlocks, {
      batchSize: NOTE_BLOCK_INSERT_BATCH_SIZE,
      placeholderGroup: "(?, ?, ?, ?, ?, ?, ?, ?)",
      buildStatement: (valuesSql) => `
        INSERT INTO note_blocks (
          id,
          meeting_id,
          block_order,
          block_type,
          content,
          source,
          transcript_ref,
          updated_at
        ) VALUES ${valuesSql}
      `,
      mapParams: (block) => [
        block.id,
        meetingId,
        block.blockOrder,
        block.blockType,
        block.content,
        block.source,
        block.transcriptRef,
        block.updatedAt,
      ],
    });
  });

  saveTransaction();
  return getNotes(meetingId);
}
