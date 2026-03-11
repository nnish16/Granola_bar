import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { DriveStatusResult } from "../../src/types";

const execFileAsync = promisify(execFile);
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const GWS_MAX_BUFFER_BYTES = 64 * 1024;
const DRIVE_STATUS_FIELDS = "user(emailAddress,displayName)";
const DRIVE_UPLOAD_FIELDS = "id,name,webViewLink";
const UNSAFE_CLI_ARG_PATTERN = /[\u0000-\u001F\u007F]/;
const SAFE_UPLOAD_FILE_NAME_PATTERN = /^(?!-)[A-Za-z0-9._() \-]+$/;

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

type ParsedGwsError = {
  code?: number;
  message: string;
  reason?: string;
};

type CliJsonPayload = {
  stdout: GwsErrorPayload | null;
  stderr: GwsErrorPayload | null;
};

export type DriveUploadResult = {
  fileId: string;
  fileName: string;
  webViewLink: string | null;
};

export function normalizeDriveFolderId(folderId: string): string {
  const trimmedFolderId = folderId.trim();

  if (!DRIVE_FOLDER_ID_PATTERN.test(trimmedFolderId)) {
    throw new Error("The Google Drive folder ID looks invalid. Use only the folder ID, not the full URL.");
  }

  return trimmedFolderId;
}

function parseSmallJson<T>(value: string): T {
  if (Buffer.byteLength(value, "utf8") > GWS_MAX_BUFFER_BYTES) {
    throw new Error("Google Drive returned a larger response than NoteFlow expects for this operation.");
  }

  return JSON.parse(value) as T;
}

function assertSafeCliArg(value: string): string {
  if (UNSAFE_CLI_ARG_PATTERN.test(value)) {
    throw new Error("Google Drive export generated an unsupported CLI argument.");
  }

  return value;
}

function assertSafeUploadFileName(fileName: string): string {
  const trimmedFileName = fileName.trim();

  if (!SAFE_UPLOAD_FILE_NAME_PATTERN.test(trimmedFileName)) {
    throw new Error("Google Drive export only supports sanitized Markdown file names.");
  }

  return trimmedFileName;
}

function assertSafeUploadPath(localPath: string): string {
  const normalizedPath = path.resolve(localPath);

  if (!path.isAbsolute(normalizedPath) || path.basename(normalizedPath).startsWith("-")) {
    throw new Error("Google Drive export requires a safe absolute file path.");
  }

  return normalizedPath;
}

function extractCliJsonPayload(error: object): CliJsonPayload {
  const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
  const parsePayload = (value: string): GwsErrorPayload | null => {
    if (value.trim().length === 0) {
      return null;
    }

    try {
      return JSON.parse(value) as GwsErrorPayload;
    } catch {
      return null;
    }
  };

  return {
    stdout: parsePayload(stdout),
    stderr: parsePayload(stderr),
  };
}

function mapCliPayloadToError(payload: CliJsonPayload): ParsedGwsError | null {
  const matchedPayload = payload.stdout?.error?.message ? payload.stdout : payload.stderr;

  if (!matchedPayload?.error?.message) {
    return null;
  }

  return {
    code: matchedPayload.error.code,
    message: matchedPayload.error.message,
    reason: matchedPayload.error.reason,
  };
}

function mapProcessError(error: object): ParsedGwsError | null {
  if ("code" in error && error.code === "ENOENT") {
    return {
      message: "The Google Workspace CLI (`gws`) is not installed on this Mac.",
    };
  }

  return null;
}

function parseGwsError(error: unknown): ParsedGwsError {
  if (error && typeof error === "object") {
    const cliPayloadError = mapCliPayloadToError(extractCliJsonPayload(error));
    if (cliPayloadError) {
      return cliPayloadError;
    }

    const processError = mapProcessError(error);
    if (processError) {
      return processError;
    }
  }

  return {
    message: error instanceof Error ? error.message : "Google Drive export failed.",
  };
}

async function runGwsCommand(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    "gws",
    args.map((arg) => assertSafeCliArg(arg)),
    {
    maxBuffer: GWS_MAX_BUFFER_BYTES,
    },
  );
  return stdout;
}

export async function getGwsDriveStatus(): Promise<DriveStatusResult> {
  try {
    const stdout = await runGwsCommand([
      "drive",
      "about",
      "get",
      "--params",
      JSON.stringify({ fields: DRIVE_STATUS_FIELDS }),
    ]);
    const payload = parseSmallJson<{ user?: { emailAddress?: string | null } }>(stdout);

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

export async function uploadFileWithGws(input: {
  fileName: string;
  localPath: string;
  folderId: string | null;
}): Promise<DriveUploadResult> {
  const fileName = assertSafeUploadFileName(input.fileName);
  const localPath = assertSafeUploadPath(input.localPath);
  const folderId = input.folderId ? normalizeDriveFolderId(input.folderId) : null;

  try {
    const stdout = await runGwsCommand([
      "drive",
      "files",
      "create",
      "--params",
      JSON.stringify({
        fields: DRIVE_UPLOAD_FIELDS,
        supportsAllDrives: true,
        useContentAsIndexableText: true,
      }),
      "--json",
      JSON.stringify({
        name: fileName,
        description: `Exported from NoteFlow on ${new Date().toISOString()}`,
        ...(folderId ? { parents: [folderId] } : {}),
      }),
      "--upload",
      localPath,
    ]);

    const payload = parseSmallJson<DriveCreateResponse>(stdout);
    return {
      fileId: payload.id,
      fileName: payload.name,
      webViewLink: payload.webViewLink ?? null,
    };
  } catch (error) {
    const parsedError = parseGwsError(error);
    throw Object.assign(new Error(parsedError.message), {
      code: parsedError.code,
      reason: parsedError.reason,
    });
  }
}
