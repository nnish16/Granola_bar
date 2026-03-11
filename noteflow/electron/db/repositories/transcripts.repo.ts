import { randomUUID } from "node:crypto";
import { getDatabase } from "../database";
import { runBatchedInsert } from "./batch-insert";
import type { TranscriptSegment } from "../../../src/types";

const TRANSCRIPT_INSERT_BATCH_SIZE = 100;

export type TranscriptSegmentInput = Omit<TranscriptSegment, "meetingId" | "segmentIndex"> &
  Partial<Pick<TranscriptSegment, "id" | "meetingId" | "segmentIndex">>;

function getNextSegmentIndex(meetingId: string): number {
  const result = getDatabase()
    .prepare(
      "SELECT COALESCE(MAX(segment_index), -1) + 1 AS nextSegmentIndex FROM transcript_segments WHERE meeting_id = ?",
    )
    .get(meetingId) as { nextSegmentIndex: number } | undefined;

  return result?.nextSegmentIndex ?? 0;
}

function getExistingSegmentIndex(id: string): number | null {
  const result = getDatabase()
    .prepare("SELECT segment_index AS segmentIndex FROM transcript_segments WHERE id = ?")
    .get(id) as { segmentIndex: number } | undefined;

  return result?.segmentIndex ?? null;
}

export function listTranscriptSegments(meetingId: string): TranscriptSegment[] {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          meeting_id AS meetingId,
          speaker_label AS speakerLabel,
          text,
          start_ms AS startMs,
          end_ms AS endMs,
          segment_index AS segmentIndex
        FROM transcript_segments
        WHERE meeting_id = ?
        ORDER BY segment_index ASC
      `,
    )
    .all(meetingId) as TranscriptSegment[];
}

export function listTranscriptSegmentsSince(meetingId: string, afterSegmentIndex: number): TranscriptSegment[] {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          meeting_id AS meetingId,
          speaker_label AS speakerLabel,
          text,
          start_ms AS startMs,
          end_ms AS endMs,
          segment_index AS segmentIndex
        FROM transcript_segments
        WHERE meeting_id = ?
          AND segment_index > ?
        ORDER BY segment_index ASC
      `,
    )
    .all(meetingId, afterSegmentIndex) as TranscriptSegment[];
}

export function getTranscriptSegment(id: string): TranscriptSegment | null {
  return (
    (getDatabase()
      .prepare(
        `
          SELECT
            id,
            meeting_id AS meetingId,
            speaker_label AS speakerLabel,
            text,
            start_ms AS startMs,
            end_ms AS endMs,
            segment_index AS segmentIndex
          FROM transcript_segments
          WHERE id = ?
        `,
      )
      .get(id) as TranscriptSegment | undefined) ?? null
  );
}

export function upsertTranscriptSegment(meetingId: string, segment: TranscriptSegmentInput): TranscriptSegment {
  return upsertTranscriptSegments(meetingId, [segment])[0] as TranscriptSegment;
}

export function upsertTranscriptSegments(
  meetingId: string,
  segments: TranscriptSegmentInput[],
): TranscriptSegment[] {
  if (segments.length === 0) {
    return [];
  }

  const db = getDatabase();
  const upsertStatement = db.prepare(
    `
      INSERT INTO transcript_segments (
        id,
        meeting_id,
        speaker_label,
        text,
        start_ms,
        end_ms,
        segment_index
      ) VALUES (
        @id,
        @meeting_id,
        @speaker_label,
        @text,
        @start_ms,
        @end_ms,
        @segment_index
      )
      ON CONFLICT(id) DO UPDATE SET
        meeting_id = excluded.meeting_id,
        speaker_label = excluded.speaker_label,
        text = excluded.text,
        start_ms = excluded.start_ms,
        end_ms = excluded.end_ms,
        segment_index = excluded.segment_index
    `,
  );

  const transaction = db.transaction((pendingSegments: TranscriptSegmentInput[]) => {
    let nextSegmentIndex = getNextSegmentIndex(meetingId);

    return pendingSegments.map((segment) => {
      const existingSegmentIndex = segment.id ? getExistingSegmentIndex(segment.id) : null;
      const segmentIndex = segment.segmentIndex ?? existingSegmentIndex ?? nextSegmentIndex;
      nextSegmentIndex = Math.max(nextSegmentIndex, segmentIndex + 1);

      const normalizedSegment: TranscriptSegment = {
        id: segment.id || randomUUID(),
        meetingId,
        speakerLabel: segment.speakerLabel,
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        segmentIndex,
      };

      upsertStatement.run({
        id: normalizedSegment.id,
        meeting_id: normalizedSegment.meetingId,
        speaker_label: normalizedSegment.speakerLabel,
        text: normalizedSegment.text,
        start_ms: normalizedSegment.startMs,
        end_ms: normalizedSegment.endMs,
        segment_index: normalizedSegment.segmentIndex,
      });

      return normalizedSegment;
    });
  });

  return transaction(segments);
}

export function deleteTranscriptSegment(id: string): void {
  getDatabase().prepare("DELETE FROM transcript_segments WHERE id = ?").run(id);
}

export function replaceTranscriptSegments(meetingId: string, segments: TranscriptSegment[]): TranscriptSegment[] {
  const db = getDatabase();
  const normalizedSegments = segments.map((segment, index) => ({
    id: segment.id || randomUUID(),
    meetingId,
    speakerLabel: segment.speakerLabel,
    text: segment.text,
    startMs: segment.startMs,
    endMs: segment.endMs,
    segmentIndex: segment.segmentIndex ?? index,
  }));

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM transcript_segments WHERE meeting_id = ?").run(meetingId);

    if (normalizedSegments.length === 0) {
      return;
    }

    runBatchedInsert(db, normalizedSegments, {
      batchSize: TRANSCRIPT_INSERT_BATCH_SIZE,
      placeholderGroup: "(?, ?, ?, ?, ?, ?, ?)",
      buildStatement: (valuesSql) => `
        INSERT INTO transcript_segments (
          id,
          meeting_id,
          speaker_label,
          text,
          start_ms,
          end_ms,
          segment_index
        ) VALUES ${valuesSql}
      `,
      mapParams: (segment) => [
        segment.id,
        meetingId,
        segment.speakerLabel,
        segment.text,
        segment.startMs,
        segment.endMs,
        segment.segmentIndex,
      ],
    });
  });

  transaction();
  return listTranscriptSegments(meetingId);
}
