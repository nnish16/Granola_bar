import { create } from "zustand";
import { noteflowIpc } from "../lib/ipc";
import type { CreateMeetingInput, Meeting } from "../types";

type MeetingsStore = {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  loadMeetings: () => Promise<void>;
  searchMeetings: (query: string) => Promise<void>;
  loadMeeting: (id: string) => Promise<void>;
  createMeeting: (input: CreateMeetingInput) => Promise<Meeting>;
};

export const useMeetingsStore = create<MeetingsStore>((set) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  error: null,
  loadMeetings: async () => {
    set({ isLoading: true, error: null });

    try {
      const meetings = await noteflowIpc.meetings.list();
      set({ meetings, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load meetings.",
      });
    }
  },
  searchMeetings: async (query) => {
    set({ isLoading: true, error: null });

    try {
      const meetings = query.trim()
        ? await noteflowIpc.meetings.search(query)
        : await noteflowIpc.meetings.list();
      set({ meetings, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to search meetings.",
      });
    }
  },
  loadMeeting: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const currentMeeting = await noteflowIpc.meetings.get(id);
      set({ currentMeeting, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load the meeting.",
      });
    }
  },
  createMeeting: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const meeting = await noteflowIpc.meetings.create(input);
      const meetings = await noteflowIpc.meetings.list();
      set({ meetings, currentMeeting: meeting, isLoading: false });
      return meeting;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the meeting.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },
}));
