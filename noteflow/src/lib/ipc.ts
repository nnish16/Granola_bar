import type {
  CreateMeetingInput,
  Meeting,
  MeetingListInput,
  MeetingListResult,
  NoteBlock,
  SaveNotesInput,
  Settings,
  TranscriptSinceInput,
  TranscriptSegment,
  UpdateMeetingInput,
} from "../types";

export const noteflowIpc = {
  meetings: {
    list: (input?: MeetingListInput): Promise<MeetingListResult> => window.noteflow.meetings.list(input),
    get: (id: string): Promise<Meeting | null> => window.noteflow.meetings.get(id),
    create: (input: CreateMeetingInput): Promise<Meeting> => window.noteflow.meetings.create(input),
    update: (input: UpdateMeetingInput): Promise<Meeting> => window.noteflow.meetings.update(input),
    delete: (id: string): Promise<void> => window.noteflow.meetings.delete(id),
    search: (query: string): Promise<Meeting[]> => window.noteflow.meetings.search(query),
    transcript: (id: string): Promise<TranscriptSegment[]> => window.noteflow.meetings.transcript(id),
    transcriptSince: (input: TranscriptSinceInput): Promise<TranscriptSegment[]> => window.noteflow.meetings.transcriptSince(input),
  },
  notes: {
    get: (meetingId: string): Promise<NoteBlock[]> => window.noteflow.notes.get(meetingId),
    save: (input: SaveNotesInput): Promise<NoteBlock[]> => window.noteflow.notes.save(input),
  },
  settings: {
    get: (): Promise<Settings> => window.noteflow.settings.get(),
    set: (input: Partial<Settings>): Promise<Settings> => window.noteflow.settings.set(input),
  },
};
