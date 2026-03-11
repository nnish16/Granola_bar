import { create } from "zustand";
import { noteflowIpc } from "../lib/ipc";
import type { Settings } from "../types";

const defaultSettings: Settings = {
  theme: "system",
};

type SettingsStore = {
  settings: Settings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (input: Partial<Settings>) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  isLoading: false,
  isSaving: false,
  error: null,
  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await noteflowIpc.settings.get();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load settings.",
      });
    }
  },
  saveSettings: async (input) => {
    set({ isSaving: true, error: null });
    try {
      const settings = await noteflowIpc.settings.set(input);
      set({ settings, isSaving: false });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "Unable to save settings.",
      });
    }
  },
}));
