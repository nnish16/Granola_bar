import type { CreateMeetingInput, Meeting, Settings, UpdateMeetingInput } from "../types";

export const noteflowIpc = {
  meetings: {
    list: (): Promise<Meeting[]> => window.noteflow.meetings.list(),
    get: (id: string): Promise<Meeting | null> => window.noteflow.meetings.get(id),
    create: (input: CreateMeetingInput): Promise<Meeting> => window.noteflow.meetings.create(input),
    update: (input: UpdateMeetingInput): Promise<Meeting> => window.noteflow.meetings.update(input),
    delete: (id: string): Promise<void> => window.noteflow.meetings.delete(id),
    search: (query: string): Promise<Meeting[]> => window.noteflow.meetings.search(query),
  },
  settings: {
    get: (): Promise<Settings> => window.noteflow.settings.get(),
    set: (input: Partial<Settings>): Promise<Settings> => window.noteflow.settings.set(input),
  },
};
