import { ipcMain } from "electron";
import { callDatabaseWorker } from "../db/worker-client";
import type { CreateMeetingInput, UpdateMeetingInput } from "../../src/types";

export function registerMeetingsIpcHandlers(): void {
  ipcMain.handle("meetings:list", () => callDatabaseWorker("meetings:list"));
  ipcMain.handle("meetings:get", (_event, id: string) => callDatabaseWorker("meetings:get", id));
  ipcMain.handle("meetings:create", (_event, input: CreateMeetingInput) => callDatabaseWorker("meetings:create", input));
  ipcMain.handle("meetings:update", (_event, input: UpdateMeetingInput) => callDatabaseWorker("meetings:update", input));
  ipcMain.handle("meetings:delete", (_event, id: string) => callDatabaseWorker("meetings:delete", id));
  ipcMain.handle("meetings:search", (_event, query: string) => callDatabaseWorker("meetings:search", query));
}
