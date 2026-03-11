import type {
  AudioChunkInfo,
  AudioStartResult,
  AudioStatusResult,
  CreateMeetingInput,
  DriveExportInput,
  DriveExportOutcome,
  DriveStatusResult,
  Meeting,
  MeetingListInput,
  MeetingListResult,
  NotionStatusResult,
  NotionSyncInput,
  NotionSyncOutcome,
  NoteBlock,
  NoteFlowApi,
  SaveNotesInput,
  Settings,
  TranscriptSinceInput,
  TranscriptSegment,
  UpdateMeetingInput,
} from "../types";

const MISSING_BRIDGE_MESSAGE =
  "NoteFlow's Electron bridge is unavailable. Start the desktop app with `npm start` instead of opening the dev server URL directly.";

const noopUnsubscribe = (): void => undefined;

function getOptionalNoteflowApi(): NoteFlowApi | null {
  return typeof window !== "undefined" && window.noteflow ? window.noteflow : null;
}

export function isNoteflowBridgeAvailable(): boolean {
  return getOptionalNoteflowApi() !== null;
}

function withNoteflowApi<T>(callback: (api: NoteFlowApi) => Promise<T>): Promise<T> {
  const api = getOptionalNoteflowApi();
  if (!api) {
    return Promise.reject(new Error(MISSING_BRIDGE_MESSAGE));
  }

  return callback(api);
}

export const noteflowIpc = {
  meetings: {
    list: (input?: MeetingListInput): Promise<MeetingListResult> => withNoteflowApi((api) => api.meetings.list(input)),
    get: (id: string): Promise<Meeting | null> => withNoteflowApi((api) => api.meetings.get(id)),
    create: (input: CreateMeetingInput): Promise<Meeting> => withNoteflowApi((api) => api.meetings.create(input)),
    update: (input: UpdateMeetingInput): Promise<Meeting> => withNoteflowApi((api) => api.meetings.update(input)),
    delete: (id: string): Promise<void> => withNoteflowApi((api) => api.meetings.delete(id)),
    search: (query: string): Promise<Meeting[]> => withNoteflowApi((api) => api.meetings.search(query)),
    transcript: (id: string): Promise<TranscriptSegment[]> => withNoteflowApi((api) => api.meetings.transcript(id)),
    transcriptSince: (input: TranscriptSinceInput): Promise<TranscriptSegment[]> =>
      withNoteflowApi((api) => api.meetings.transcriptSince(input)),
  },
  notes: {
    get: (meetingId: string): Promise<NoteBlock[]> => withNoteflowApi((api) => api.notes.get(meetingId)),
    save: (input: SaveNotesInput): Promise<NoteBlock[]> => withNoteflowApi((api) => api.notes.save(input)),
  },
  settings: {
    get: (): Promise<Settings> => withNoteflowApi((api) => api.settings.get()),
    set: (input: Partial<Settings>): Promise<Settings> => withNoteflowApi((api) => api.settings.set(input)),
  },
  audio: {
    start: (meetingId: string): Promise<AudioStartResult> => withNoteflowApi((api) => api.audio.start(meetingId)),
    stop: (): Promise<{ ok: boolean }> => withNoteflowApi((api) => api.audio.stop()),
    status: (): Promise<AudioStatusResult> => withNoteflowApi((api) => api.audio.status()),
    onChunk: (callback: (info: AudioChunkInfo) => void): (() => void) =>
      getOptionalNoteflowApi()?.audio.onChunk(callback) ?? noopUnsubscribe,
    onError: (callback: (info: { message: string }) => void): (() => void) =>
      getOptionalNoteflowApi()?.audio.onError(callback) ?? noopUnsubscribe,
    onStopped: (callback: () => void): (() => void) =>
      getOptionalNoteflowApi()?.audio.onStopped(callback) ?? noopUnsubscribe,
  },
  notion: {
    sync: (input: NotionSyncInput): Promise<NotionSyncOutcome> => withNoteflowApi((api) => api.notion.sync(input)),
    status: (): Promise<NotionStatusResult> => withNoteflowApi((api) => api.notion.status()),
  },
  drive: {
    status: (): Promise<DriveStatusResult> => withNoteflowApi((api) => api.drive.status()),
    exportMeeting: (input: DriveExportInput): Promise<DriveExportOutcome> =>
      withNoteflowApi((api) => api.drive.exportMeeting(input)),
  },
};
