// ---------------------------------------------------------------------------
// Shared types — used by both renderer (React) and main process (Electron)
// ---------------------------------------------------------------------------

export type ShareMode = "private" | "public";
export type ThemeMode = "system" | "light" | "dark";
export type NoteBlockType = "heading" | "bullet" | "paragraph";
export type NoteBlockSource = "user" | "ai";

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

export interface Attendee {
  id?: string;
  meetingId?: string;
  name: string;
  email: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number | null;
  calendarEventId: string | null;
  folderId: string | null;
  templateId: string;
  shareId: string | null;
  shareMode: ShareMode;
  createdAt: number;
  updatedAt: number;
  attendeeCount?: number;
  previewText?: string | null;
  attendees: Attendee[];
}

export interface CreateMeetingInput {
  title?: string;
  startedAt?: number;
  endedAt?: number | null;
  calendarEventId?: string | null;
  folderId?: string | null;
  templateId?: string;
  shareId?: string | null;
  shareMode?: ShareMode;
  attendees?: Attendee[];
}

export interface UpdateMeetingInput extends CreateMeetingInput {
  id: string;
}

export interface MeetingListInput {
  offset?: number;
  limit?: number;
}

export interface MeetingListResult {
  items: Meeting[];
  hasMore: boolean;
}

export interface NoteBlock {
  id?: string;
  meetingId?: string;
  blockOrder: number;
  blockType: NoteBlockType;
  content: string;
  source: NoteBlockSource;
  transcriptRef: number | null;
  updatedAt?: number;
}

export interface SaveNotesInput {
  meetingId: string;
  blocks: NoteBlock[];
}

export interface TranscriptSinceInput {
  meetingId: string;
  afterSegmentIndex: number;
}

export interface TranscriptSegment {
  id?: string;
  meetingId?: string;
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
  segmentIndex: number;
}

export interface Template {
  id: string;
  name: string;
  prompt: string;
  isBuiltIn: boolean;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Settings {
  theme: ThemeMode;
}

// ---------------------------------------------------------------------------
// Audio API
// ---------------------------------------------------------------------------

export interface AudioChunkInfo {
  meetingId: string;
  timestamp: number;
  durationMs: number;
}

export interface AudioStatusResult {
  isCapturing: boolean;
  meetingId: string | null;
}

export interface AudioStartResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Notion API
// ---------------------------------------------------------------------------

export interface NotionSyncResult {
  ok: true;
  pageId: string;
  pageUrl: string;
}

export interface NotionSyncError {
  ok: false;
  error: string;
}

export type NotionSyncOutcome = NotionSyncResult | NotionSyncError;

export interface NotionStatusResult {
  configured: boolean;
}

// ---------------------------------------------------------------------------
// NoteFlow Electron API (window.noteflow)
// ---------------------------------------------------------------------------

export interface NoteFlowApi {
  meetings: {
    list: (input?: MeetingListInput) => Promise<MeetingListResult>;
    get: (id: string) => Promise<Meeting | null>;
    create: (input: CreateMeetingInput) => Promise<Meeting>;
    update: (input: UpdateMeetingInput) => Promise<Meeting>;
    delete: (id: string) => Promise<void>;
    search: (query: string) => Promise<Meeting[]>;
    transcript: (id: string) => Promise<TranscriptSegment[]>;
    transcriptSince: (input: TranscriptSinceInput) => Promise<TranscriptSegment[]>;
  };
  notes: {
    get: (meetingId: string) => Promise<NoteBlock[]>;
    save: (input: SaveNotesInput) => Promise<NoteBlock[]>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (input: Partial<Settings>) => Promise<Settings>;
  };
  audio: {
    start: (meetingId: string) => Promise<AudioStartResult>;
    stop: () => Promise<{ ok: boolean }>;
    status: () => Promise<AudioStatusResult>;
    onChunk: (callback: (info: AudioChunkInfo) => void) => () => void;
    onError: (callback: (info: { message: string }) => void) => () => void;
    onStopped: (callback: () => void) => () => void;
    removeAllListeners: () => void;
  };
  notion: {
    /** Sync a completed meeting to Notion. Returns page URL on success. */
    sync: (meetingId: string) => Promise<NotionSyncOutcome>;
    /** Check if Notion API key + database ID are configured in settings. */
    status: () => Promise<NotionStatusResult>;
  };
}

declare global {
  interface Window {
    noteflow: NoteFlowApi;
  }
}

export {};
