export type ShareMode = "private" | "public";
export type ThemeMode = "system" | "light" | "dark";
export type NoteBlockType = "heading" | "bullet" | "paragraph";
export type NoteBlockSource = "user" | "ai";

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

export interface NoteFlowApi {
  meetings: {
    list: () => Promise<Meeting[]>;
    get: (id: string) => Promise<Meeting | null>;
    create: (input: CreateMeetingInput) => Promise<Meeting>;
    update: (input: UpdateMeetingInput) => Promise<Meeting>;
    delete: (id: string) => Promise<void>;
    search: (query: string) => Promise<Meeting[]>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (input: Partial<Settings>) => Promise<Settings>;
  };
}

declare global {
  interface Window {
    noteflow: NoteFlowApi;
  }
}

export {};
