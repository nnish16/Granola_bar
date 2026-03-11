import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type { DriveExportInput, DriveExportOutcome, DriveStatusResult } from "../../src/types";
import { filterMeetingForExport, loadMeetingForExport, resolveMeetingSyncSelection } from "../share/meeting-export";
import { getGwsDriveStatus, normalizeDriveFolderId, uploadFileWithGws } from "./gws-client";
import { renderMeetingMarkdown } from "./markdown";

function sanitizeFileName(value: string): string {
  const sanitizedValue = value
    .replace(/[^a-zA-Z0-9._() \-]/g, "")
    .replace(/^[.\- ]+/, "")
    .trim();
  return sanitizedValue || "Untitled Meeting";
}

function formatExportDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function getDriveStatus(): Promise<DriveStatusResult> {
  return getGwsDriveStatus();
}

export async function exportMeetingToDrive(input: DriveExportInput): Promise<DriveExportOutcome> {
  const rawMeeting = await loadMeetingForExport(input.meetingId);
  if (!rawMeeting) {
    return {
      ok: false,
      error: `Meeting ${input.meetingId} was not found.`,
    };
  }

  const selection = resolveMeetingSyncSelection(input.selection);
  const meeting = filterMeetingForExport(rawMeeting, selection);
  const fileName = `${formatExportDate(meeting.startedAt)} ${sanitizeFileName(meeting.title)}.md`;
  const exportsDir = path.join(app.getPath("documents"), "NoteFlow Exports");
  const localPath = path.join(exportsDir, fileName);
  let folderId: string | null = null;

  if (input.folderId) {
    try {
      folderId = normalizeDriveFolderId(input.folderId);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "The Google Drive folder ID looks invalid.",
      };
    }
  }

  await fs.mkdir(exportsDir, { recursive: true });
  await fs.writeFile(localPath, renderMeetingMarkdown(meeting, selection), "utf8");

  try {
    const payload = await uploadFileWithGws({
      fileName,
      localPath,
      folderId,
    });
    return {
      ok: true,
      fileId: payload.fileId,
      fileName: payload.fileName,
      localPath,
      webViewLink: payload.webViewLink,
    };
  } catch (error) {
    const reason =
      error && typeof error === "object" && "reason" in error && typeof error.reason === "string"
        ? error.reason
        : undefined;
    return {
      ok: false,
      error:
        reason === "authError"
          ? "Google Drive is not connected on this Mac. Run `gws auth login`, then try exporting again."
          : error instanceof Error
            ? error.message
            : "Google Drive export failed.",
      needsAuth: reason === "authError",
    };
  }
}
