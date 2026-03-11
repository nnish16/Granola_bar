import { ipcMain } from "electron";
import { callDatabaseWorker } from "../db/worker-client";
import type { Settings } from "../../src/types";

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle("settings:get", () => callDatabaseWorker("settings:get"));
  ipcMain.handle("settings:set", (_event, partialSettings: Partial<Settings>) =>
    callDatabaseWorker("settings:set", partialSettings),
  );
}
