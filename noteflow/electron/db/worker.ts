import { parentPort } from "node:worker_threads";
import { initializeDatabase } from "./database";
import { createMeeting, deleteMeeting, getMeeting, listMeetings, searchMeetings, updateMeeting } from "./repositories/meetings.repo";
import { getNotes, replaceNotes } from "./repositories/notes.repo";
import { getSettings, setSettings } from "./repositories/settings.repo";
import { seedBuiltInTemplates } from "./repositories/templates.repo";

type WorkerRequest =
  | { id: number; action: "initialize" }
  | { id: number; action: "meetings:list" }
  | { id: number; action: "meetings:get"; payload: string }
  | { id: number; action: "meetings:create"; payload: Parameters<typeof createMeeting>[0] }
  | { id: number; action: "meetings:update"; payload: Parameters<typeof updateMeeting>[0] }
  | { id: number; action: "meetings:delete"; payload: string }
  | { id: number; action: "meetings:search"; payload: string }
  | { id: number; action: "notes:get"; payload: string }
  | { id: number; action: "notes:save"; payload: { meetingId: string; blocks: Parameters<typeof replaceNotes>[1] } }
  | { id: number; action: "settings:get" }
  | { id: number; action: "settings:set"; payload: Parameters<typeof setSettings>[0] };

type WorkerResponse =
  | { id: number; success: true; result: unknown }
  | { id: number; success: false; error: string };

let initializationPromise: Promise<void> | null = null;

async function initializeWorker(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().then(() => {
      seedBuiltInTemplates();
    });
  }

  await initializationPromise;
}

async function handleMessage(message: WorkerRequest): Promise<WorkerResponse> {
  const responseId = message.id;
  try {
    switch (message.action) {
      case "initialize":
        await initializeWorker();
        return { id: responseId, success: true, result: null };
      case "meetings:list":
        return { id: responseId, success: true, result: listMeetings() };
      case "meetings:get":
        return { id: responseId, success: true, result: getMeeting(message.payload) };
      case "meetings:create":
        return { id: responseId, success: true, result: createMeeting(message.payload) };
      case "meetings:update":
        return { id: responseId, success: true, result: updateMeeting(message.payload) };
      case "meetings:delete":
        deleteMeeting(message.payload);
        return { id: responseId, success: true, result: null };
      case "meetings:search":
        return { id: responseId, success: true, result: searchMeetings(message.payload) };
      case "notes:get":
        return { id: responseId, success: true, result: getNotes(message.payload) };
      case "notes:save":
        return { id: responseId, success: true, result: replaceNotes(message.payload.meetingId, message.payload.blocks) };
      case "settings:get":
        return { id: responseId, success: true, result: getSettings() };
      case "settings:set":
        return { id: responseId, success: true, result: setSettings(message.payload) };
    }
  } catch (error) {
    return {
      id: responseId,
      success: false,
      error: error instanceof Error ? error.message : "Database worker failed.",
    };
  }

  return { id: responseId, success: false, error: "Unsupported worker action." };
}

if (!parentPort) {
  throw new Error("Database worker requires a parent port.");
}

parentPort.on("message", async (message: WorkerRequest) => {
  const response = await handleMessage(message);
  parentPort?.postMessage(response);
});
