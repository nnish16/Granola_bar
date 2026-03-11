import { create } from "zustand";
import type { ThemeMode } from "../types";

type UiStore = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
