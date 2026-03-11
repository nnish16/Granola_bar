import { ipcMain } from "electron";
import type { DriveExportInput } from "../../src/types";
import { exportMeetingToDrive, getDriveStatus } from "../drive/export";

export function registerShareIpcHandlers(): void {
  ipcMain.handle("drive:status", () => getDriveStatus());
  ipcMain.handle("drive:exportMeeting", (_event, input: DriveExportInput) => exportMeetingToDrive(input));
}
