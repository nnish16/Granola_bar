import { ipcMain } from "electron";
import type { Settings } from "../../src/types";
import { getSecureSettings, setSecureSettings } from "../settings/secure-settings";

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle("settings:get", () => getSecureSettings());
  ipcMain.handle("settings:set", (_event, partialSettings: Partial<Settings>) => setSecureSettings(partialSettings));
}
