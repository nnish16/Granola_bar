import { randomUUID } from "node:crypto";
import { getDatabase } from "../database";
import { hydrateMeetingRows, selectMeetingRows } from "./meeting-hydration";
import type { Attendee, CreateMeetingInput, Meeting, MeetingListInput, MeetingListResult, UpdateMeetingInput } from "../../../src/types";

const DEFAULT_MEETING_PAGE_SIZE = 50;

function normalizeMeetingAttendees(attendees: Attendee[], meetingId: string): Attendee[] {
  return attendees.map((attendee) => {
    return {
      id: attendee.id ?? randomUUID(),
      meetingId,
      name: attendee.name,
      email: attendee.email ?? null,
    };
  });
}

function getMeetingById(id: string): Meeting | null {
  const db = getDatabase();
  return hydrateMeetingRows(db, selectMeetingRows(db, { meetingId: id }))[0] ?? null;
}

function getExistingMeetingOrThrow(id: string): Meeting {
  const meeting = getMeetingById(id);
  if (!meeting) {
    throw new Error(`Meeting ${id} was not found.`);
  }

  return meeting;
}

export function listMeetings(options: MeetingListInput = {}): MeetingListResult {
  const db = getDatabase();
  const limit = options.limit ?? DEFAULT_MEETING_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const rows = selectMeetingRows(db, { limit: limit + 1, offset });
  const items = hydrateMeetingRows(db, rows.slice(0, limit));

  return {
    items,
    hasMore: rows.length > limit,
  };
}

export function getMeeting(id: string): Meeting | null {
  return getMeetingById(id);
}

export function createMeeting(input: CreateMeetingInput): Meeting {
  const db = getDatabase();
  const now = Date.now();
  const meetingId = randomUUID();
  const attendees = input.attendees ?? [];
  const normalizedTitle = input.title?.trim() || "Untitled Meeting";
  const startedAt = input.startedAt ?? now;
  const endedAt = input.endedAt ?? null;
  const calendarEventId = input.calendarEventId ?? null;
  const folderId = input.folderId ?? null;
  const templateId = input.templateId ?? "general";
  const shareId = input.shareId ?? null;
  const shareMode = input.shareMode ?? "private";
  const normalizedAttendees = normalizeMeetingAttendees(attendees, meetingId);

  const transaction = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO meetings (
          id,
          title,
          started_at,
          ended_at,
          calendar_event_id,
          folder_id,
          template_id,
          share_id,
          share_mode,
          created_at,
          updated_at
        ) VALUES (
          @id,
          @title,
          @started_at,
          @ended_at,
          @calendar_event_id,
          @folder_id,
          @template_id,
          @share_id,
          @share_mode,
          @created_at,
          @updated_at
        )
      `,
    ).run({
      id: meetingId,
      title: normalizedTitle,
      started_at: startedAt,
      ended_at: endedAt,
      calendar_event_id: calendarEventId,
      folder_id: folderId,
      template_id: templateId,
      share_id: shareId,
      share_mode: shareMode,
      created_at: now,
      updated_at: now,
    });

    const attendeeStatement = db.prepare(
      "INSERT INTO attendees (id, meeting_id, name, email) VALUES (@id, @meeting_id, @name, @email)",
    );

    for (const attendee of normalizedAttendees) {
      attendeeStatement.run({
        id: attendee.id,
        meeting_id: meetingId,
        name: attendee.name,
        email: attendee.email,
      });
    }
  });

  transaction();
  return {
    id: meetingId,
    title: normalizedTitle,
    startedAt,
    endedAt,
    calendarEventId,
    folderId,
    templateId,
    shareId,
    shareMode,
    createdAt: now,
    updatedAt: now,
    attendeeCount: normalizedAttendees.length,
    previewText: null,
    attendees: normalizedAttendees,
  };
}

export function updateMeeting(input: UpdateMeetingInput): Meeting {
  const db = getDatabase();
  const existingMeeting = getExistingMeetingOrThrow(input.id);
  const attendees = input.attendees ?? existingMeeting.attendees;
  const now = Date.now();
  const normalizedAttendees = normalizeMeetingAttendees(attendees, existingMeeting.id);
  const title = input.title?.trim() || existingMeeting.title;
  const startedAt = input.startedAt ?? existingMeeting.startedAt;
  const endedAt = input.endedAt ?? existingMeeting.endedAt;
  const calendarEventId = input.calendarEventId ?? existingMeeting.calendarEventId;
  const folderId = input.folderId ?? existingMeeting.folderId;
  const templateId = input.templateId ?? existingMeeting.templateId;
  const shareId = input.shareId ?? existingMeeting.shareId;
  const shareMode = input.shareMode ?? existingMeeting.shareMode;

  const transaction = db.transaction(() => {
    db.prepare(
      `
        UPDATE meetings
        SET
          title = @title,
          started_at = @started_at,
          ended_at = @ended_at,
          calendar_event_id = @calendar_event_id,
          folder_id = @folder_id,
          template_id = @template_id,
          share_id = @share_id,
          share_mode = @share_mode,
          updated_at = @updated_at
        WHERE id = @id
      `,
    ).run({
      id: existingMeeting.id,
      title,
      started_at: startedAt,
      ended_at: endedAt,
      calendar_event_id: calendarEventId,
      folder_id: folderId,
      template_id: templateId,
      share_id: shareId,
      share_mode: shareMode,
      updated_at: now,
    });

    db.prepare("DELETE FROM attendees WHERE meeting_id = ?").run(existingMeeting.id);
    const attendeeStatement = db.prepare(
      "INSERT INTO attendees (id, meeting_id, name, email) VALUES (@id, @meeting_id, @name, @email)",
    );

    for (const attendee of normalizedAttendees) {
      attendeeStatement.run({
        id: attendee.id,
        meeting_id: existingMeeting.id,
        name: attendee.name,
        email: attendee.email,
      });
    }
  });

  transaction();
  return {
    ...existingMeeting,
    title,
    startedAt,
    endedAt,
    calendarEventId,
    folderId,
    templateId,
    shareId,
    shareMode,
    updatedAt: now,
    attendeeCount: normalizedAttendees.length,
    attendees: normalizedAttendees,
  };
}

export function deleteMeeting(id: string): void {
  getDatabase().prepare("DELETE FROM meetings WHERE id = ?").run(id);
}

export function searchMeetings(query: string): Meeting[] {
  const db = getDatabase();
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return hydrateMeetingRows(db, selectMeetingRows(db, { searchPrefix: normalizedQuery, limit: 50 }));
}
