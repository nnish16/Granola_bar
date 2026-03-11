import type { Database } from "better-sqlite3";
import type { Attendee, Meeting } from "../../../src/types";

export type MeetingRow = {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number | null;
  calendarEventId: string | null;
  folderId: string | null;
  templateId: string;
  shareId: string | null;
  shareMode: Meeting["shareMode"];
  createdAt: number;
  updatedAt: number;
  attendeeCount: number;
  previewText: string | null;
};

type SelectMeetingRowsOptions = {
  meetingId?: string;
  searchPrefix?: string;
  limit?: number;
  offset?: number;
};

type QueryFragment = {
  sql: string;
  params: Array<string | number>;
};

function normalizeSearchPrefix(searchPrefix: string): string {
  const trimmedPrefix = searchPrefix.trim();
  if (!trimmedPrefix) {
    return trimmedPrefix;
  }

  const escapedPrefix = trimmedPrefix.replace(/([\\%_])/g, "\\$1");
  return `${escapedPrefix}%`;
}

function normalizeNonNegativeInteger(value: number | undefined, fieldName: "limit" | "offset"): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }

  return value;
}

function buildWhereFragment(options: SelectMeetingRowsOptions): QueryFragment {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (options.meetingId) {
    whereClauses.push("m.id = ?");
    params.push(options.meetingId);
  }

  if (options.searchPrefix) {
    const searchValue = normalizeSearchPrefix(options.searchPrefix);
    whereClauses.push(`
      (
        m.title COLLATE NOCASE LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1
          FROM attendees a
          WHERE a.meeting_id = m.id
            AND a.name COLLATE NOCASE LIKE ? ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1
          FROM attendees a
          WHERE a.meeting_id = m.id
            AND a.email COLLATE NOCASE LIKE ? ESCAPE '\\'
        )
      )
    `);
    params.push(searchValue, searchValue, searchValue);
  }

  return {
    sql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
    params,
  };
}

function buildPaginationFragment(options: SelectMeetingRowsOptions): QueryFragment {
  const limit = normalizeNonNegativeInteger(options.limit, "limit");
  const offset = normalizeNonNegativeInteger(options.offset, "offset");

  if (limit === undefined && offset === undefined) {
    return { sql: "", params: [] };
  }

  const params: Array<string | number> = [];
  let sql = "";

  if (limit !== undefined) {
    sql = "LIMIT ?";
    params.push(limit);
  } else {
    sql = "LIMIT -1";
  }

  if (offset !== undefined) {
    sql = `${sql} OFFSET ?`;
    params.push(offset);
  }

  return { sql, params };
}

function buildMeetingRowsStatement(whereSql: string, paginationSql: string): string {
  return `
    WITH selected_meetings AS (
      SELECT
        m.id,
        m.title,
        m.started_at AS startedAt,
        m.ended_at AS endedAt,
        m.calendar_event_id AS calendarEventId,
        m.folder_id AS folderId,
        m.template_id AS templateId,
        m.share_id AS shareId,
        m.share_mode AS shareMode,
        m.created_at AS createdAt,
        m.updated_at AS updatedAt
      FROM meetings m
      ${whereSql}
      ORDER BY m.started_at DESC
      ${paginationSql}
    ),
    attendee_counts AS (
      SELECT
        a.meeting_id AS meetingId,
        COUNT(*) AS attendeeCount
      FROM attendees a
      INNER JOIN selected_meetings sm ON sm.id = a.meeting_id
      GROUP BY a.meeting_id
    ),
    first_notes AS (
      SELECT
        ranked_notes.meetingId,
        ranked_notes.previewText
      FROM (
        SELECT
          nb.meeting_id AS meetingId,
          nb.content AS previewText,
          ROW_NUMBER() OVER (
            PARTITION BY nb.meeting_id
            ORDER BY nb.block_order ASC
          ) AS rowNumber
        FROM note_blocks nb
        INNER JOIN selected_meetings sm ON sm.id = nb.meeting_id
      ) ranked_notes
      WHERE ranked_notes.rowNumber = 1
    )
    SELECT
      sm.id,
      sm.title,
      sm.startedAt,
      sm.endedAt,
      sm.calendarEventId,
      sm.folderId,
      sm.templateId,
      sm.shareId,
      sm.shareMode,
      sm.createdAt,
      sm.updatedAt,
      COALESCE(ac.attendeeCount, 0) AS attendeeCount,
      fn.previewText AS previewText
    FROM selected_meetings sm
    LEFT JOIN attendee_counts ac ON ac.meetingId = sm.id
    LEFT JOIN first_notes fn ON fn.meetingId = sm.id
    ORDER BY sm.startedAt DESC
  `;
}

export function selectMeetingRows(db: Database, options: SelectMeetingRowsOptions = {}): MeetingRow[] {
  const whereFragment = buildWhereFragment(options);
  const paginationFragment = buildPaginationFragment(options);
  const params = [...whereFragment.params, ...paginationFragment.params];

  return db
    .prepare(
      buildMeetingRowsStatement(whereFragment.sql, paginationFragment.sql),
    )
    .all(...params) as MeetingRow[];
}

function selectAttendeesForMeetings(db: Database, meetingIds: string[]): Map<string, Attendee[]> {
  if (meetingIds.length === 0) {
    return new Map();
  }

  const rows: Attendee[] = [];
  const batchSize = meetingIds.length <= 900 ? meetingIds.length : 400;

  for (let index = 0; index < meetingIds.length; index += batchSize) {
    const batchIds = meetingIds.slice(index, index + batchSize);
    const placeholders = batchIds.map(() => "?").join(", ");
    const batchRows = db
      .prepare(
        `
          SELECT
            id,
            meeting_id AS meetingId,
            name,
            email
          FROM attendees
          WHERE meeting_id IN (${placeholders})
          ORDER BY name COLLATE NOCASE ASC
        `,
      )
      .all(...batchIds) as Attendee[];

    rows.push(...batchRows);
  }

  return rows.reduce<Map<string, Attendee[]>>((accumulator, attendee) => {
    const meetingId = attendee.meetingId ?? "";
    const attendees = accumulator.get(meetingId) ?? [];
    attendees.push(attendee);
    accumulator.set(meetingId, attendees);
    return accumulator;
  }, new Map());
}

export function hydrateMeetingRows(db: Database, rows: MeetingRow[]): Meeting[] {
  const attendeesByMeetingId = selectAttendeesForMeetings(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    attendees: attendeesByMeetingId.get(row.id) ?? [],
  }));
}
