import { ipcMain } from "electron";
import { callDatabaseWorker } from "../db/worker-client";
import type { NoteBlock } from "../../src/types";

export function registerNotesIpcHandlers(): void {
  ipcMain.handle("notes:get", (_event, meetingId: string) => callDatabaseWorker("notes:get", meetingId));
  ipcMain.handle("notes:save", (_event, payload: { meetingId: string; blocks: NoteBlock[] }) =>
    callDatabaseWorker("notes:save", payload),
  );
}
