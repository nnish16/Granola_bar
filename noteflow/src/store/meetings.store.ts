import { create } from "zustand";
import { noteflowIpc } from "../lib/ipc";
import type { CreateMeetingInput, Meeting } from "../types";

const DEFAULT_PAGE_SIZE = 50;

type MeetingsStore = {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMeetings: (offset?: number, limit?: number) => Promise<void>;
  loadMoreMeetings: (limit?: number) => Promise<void>;
  searchMeetings: (query: string) => Promise<void>;
  loadMeeting: (id: string) => Promise<void>;
  createMeeting: (input: CreateMeetingInput) => Promise<Meeting>;
};

export const useMeetingsStore = create<MeetingsStore>((set, get) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  hasMore: false,
  error: null,
  loadMeetings: async (offset = 0, limit = DEFAULT_PAGE_SIZE) => {
    set({ isLoading: true, error: null });

    try {
      const result = await noteflowIpc.meetings.list({ offset, limit });
      set((state) => ({
        meetings: offset === 0 ? result.items : [...state.meetings, ...result.items],
        hasMore: result.hasMore,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load meetings.",
      });
    }
  },
  loadMoreMeetings: async (limit = DEFAULT_PAGE_SIZE) => {
    const { hasMore, isLoading, meetings, loadMeetings } = get();
    if (!hasMore || isLoading) {
      return;
    }

    await loadMeetings(meetings.length, limit);
  },
  searchMeetings: async (query) => {
    set({ isLoading: true, error: null });

    try {
      const meetings = query.trim()
        ? await noteflowIpc.meetings.search(query)
        : (await noteflowIpc.meetings.list({ offset: 0, limit: DEFAULT_PAGE_SIZE })).items;
      set({ meetings, hasMore: false, isLoading: false });
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
      const result = await noteflowIpc.meetings.list({ offset: 0, limit: DEFAULT_PAGE_SIZE });
      set({ meetings: result.items, hasMore: result.hasMore, currentMeeting: meeting, isLoading: false });
      return meeting;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the meeting.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },
}));
