import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { app } from "electron";
import type { DriveExportInput, DriveExportOutcome, DriveStatusResult, MeetingSyncSelection } from "../../src/types";
import type { MeetingForSync } from "../notion/sync";
import { filterMeetingForExport, loadMeetingForExport, resolveMeetingSyncSelection } from "../share/meeting-export";

const execFileAsync = promisify(execFile);

type GwsErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    reason?: string;
  };
};

type DriveCreateResponse = {
  id: string;
  name: string;
  webViewLink?: string;
};

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

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (endedAt === null) {
    return "In progress";
  }

  const totalMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function formatTranscriptTimestamp(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildMeetingMarkdown(meeting: MeetingForSync, selection: MeetingSyncSelection): string {
  const lines: string[] = [];

  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(`- Date: ${formatTimestamp(meeting.startedAt)}`);
  lines.push(`- Duration: ${formatDuration(meeting.startedAt, meeting.endedAt)}`);
  lines.push(`- Template: ${meeting.templateId}`);
  if (meeting.attendees.length > 0) {
    lines.push(`- Attendees: ${meeting.attendees.map((attendee) => attendee.name).join(", ")}`);
  }
  lines.push(
    `- Synced content: ${[
      selection.includeUserNotes ? "user notes" : null,
      selection.includeAiNotes ? "AI blocks" : null,
      selection.includeTranscript ? "transcript" : null,
    ]
      .filter(Boolean)
      .join(", ") || "none"}`,
  );
  lines.push("");

  const userNotes = meeting.noteBlocks.filter((block) => block.source === "user");
  if (userNotes.length > 0) {
    lines.push("## User Notes");
    lines.push("");
    for (const block of userNotes) {
      const content = block.content.trim();
      if (!content) {
        continue;
      }

      if (block.blockType === "heading") {
        lines.push(`### ${content}`);
      } else if (block.blockType === "bullet") {
        lines.push(`- ${content}`);
      } else {
        lines.push(content);
      }
      lines.push("");
    }
  }

  const aiNotes = meeting.noteBlocks.filter((block) => block.source === "ai");
  if (aiNotes.length > 0) {
    lines.push("## AI Enhancements");
    lines.push("");
    for (const block of aiNotes) {
      const content = block.content.trim();
      if (!content) {
        continue;
      }

      if (block.blockType === "bullet") {
        lines.push(`- ${content}`);
      } else {
        lines.push(content);
      }
      lines.push("");
    }
  }

  if (meeting.transcriptSegments.length > 0) {
    lines.push("## Transcript");
    lines.push("");
    for (const segment of meeting.transcriptSegments) {
      lines.push(
        `- [${formatTranscriptTimestamp(segment.startMs)}] ${segment.speakerLabel}: ${segment.text.trim()}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function parseGwsError(error: unknown): { code?: number; message: string; reason?: string } {
  if (error && typeof error === "object") {
    const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
    const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";

    const payload = [stdout, stderr]
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        try {
          return JSON.parse(value) as GwsErrorPayload;
        } catch {
          return null;
        }
      })
      .find(Boolean);

    if (payload?.error?.message) {
      return {
        code: payload.error.code,
        message: payload.error.message,
        reason: payload.error.reason,
      };
    }

    if ("code" in error && error.code === "ENOENT") {
      return {
        message: "The Google Workspace CLI (`gws`) is not installed on this Mac.",
      };
    }
  }

  return {
    message: error instanceof Error ? error.message : "Google Drive export failed.",
  };
}

async function runGwsCommand(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gws", args, {
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

export async function getDriveStatus(): Promise<DriveStatusResult> {
  try {
    const stdout = await runGwsCommand([
      "drive",
      "about",
      "get",
      "--params",
      JSON.stringify({ fields: "user(emailAddress,displayName)" }),
    ]);
    const payload = JSON.parse(stdout) as { user?: { emailAddress?: string | null } };

    return {
      available: true,
      authenticated: true,
      email: payload.user?.emailAddress ?? null,
    };
  } catch (error) {
    const parsedError = parseGwsError(error);
    return {
      available: parsedError.message !== "The Google Workspace CLI (`gws`) is not installed on this Mac.",
      authenticated: false,
      email: null,
      error:
        parsedError.reason === "authError"
          ? "Run `gws auth login` on this Mac to connect Google Drive before exporting."
          : parsedError.message,
    };
  }
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

  await fs.mkdir(exportsDir, { recursive: true });
  await fs.writeFile(localPath, buildMeetingMarkdown(meeting, selection), "utf8");

  try {
    const stdout = await runGwsCommand([
      "drive",
      "files",
      "create",
      "--params",
      JSON.stringify({
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
        useContentAsIndexableText: true,
      }),
      "--json",
      JSON.stringify({
        name: fileName,
        description: `Exported from NoteFlow on ${formatTimestamp(Date.now())}`,
        ...(input.folderId ? { parents: [input.folderId] } : {}),
      }),
      "--upload",
      localPath,
    ]);

    const payload = JSON.parse(stdout) as DriveCreateResponse;
    return {
      ok: true,
      fileId: payload.id,
      fileName: payload.name,
      localPath,
      webViewLink: payload.webViewLink ?? null,
    };
  } catch (error) {
    const parsedError = parseGwsError(error);
    return {
      ok: false,
      error:
        parsedError.reason === "authError"
          ? "Google Drive is not connected on this Mac. Run `gws auth login`, then try exporting again."
          : parsedError.message,
      needsAuth: parsedError.reason === "authError",
    };
  }
}
