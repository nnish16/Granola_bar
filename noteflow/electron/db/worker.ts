import { parentPort } from "node:worker_threads";
import { initializeDatabase } from "./database";
import { createMeeting, deleteMeeting, getMeeting, listMeetings, searchMeetings, updateMeeting } from "./repositories/meetings.repo";
import { getNotes, replaceNotes } from "./repositories/notes.repo";
import { getAllSettings, setRawSettings } from "./repositories/settings.repo";
import { seedBuiltInTemplates } from "./repositories/templates.repo";
import {
  listTranscriptSegments,
  listTranscriptSegmentsSince,
  upsertTranscriptSegment,
  upsertTranscriptSegments,
} from "./repositories/transcripts.repo";

type WorkerRequest =
  | { id: number; action: "initialize" }
  | { id: number; action: "meetings:list"; payload?: Parameters<typeof listMeetings>[0] }
  | { id: number; action: "meetings:get"; payload: string }
  | { id: number; action: "meetings:create"; payload: Parameters<typeof createMeeting>[0] }
  | { id: number; action: "meetings:update"; payload: Parameters<typeof updateMeeting>[0] }
  | { id: number; action: "meetings:delete"; payload: string }
  | { id: number; action: "meetings:search"; payload: string }
  | { id: number; action: "meetings:transcript"; payload: string }
  | { id: number; action: "meetings:transcriptSince"; payload: { meetingId: string; afterSegmentIndex: number } }
  | {
      id: number;
      action: "transcripts:appendBatch";
      payload: {
        meetingId: string;
        segments: Parameters<typeof upsertTranscriptSegments>[1];
      };
    }
  | {
      id: number;
      action: "transcripts:upsert";
      payload: {
        meetingId: string;
        segment: Parameters<typeof upsertTranscriptSegment>[1];
      };
    }
  | { id: number; action: "notes:get"; payload: string }
  | { id: number; action: "notes:list"; payload: string | { meetingId: string } }
  | { id: number; action: "notes:save"; payload: { meetingId: string; blocks: Parameters<typeof replaceNotes>[1] } }
  | { id: number; action: "settings:setRaw"; payload: Record<string, string> }
  | { id: number; action: "settings:getAll" };

type WorkerResponse =
  | { id: number; success: true; result: unknown }
  | { id: number; success: false; error: string };

let initializationPromise: Promise<void> | null = null;

type WorkerAction = WorkerRequest["action"];
type WorkerMessage = WorkerRequest & { payload?: unknown };
type WorkerHandler = (message: WorkerMessage) => Promise<unknown> | unknown;

async function initializeWorker(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await initializeDatabase();
      seedBuiltInTemplates();
    })();
  }

  await initializationPromise;
}

const workerHandlers: Record<WorkerAction, WorkerHandler> = {
  initialize: async () => {
    await initializeWorker();
    return null;
  },
  "meetings:list": (message) => listMeetings(message.payload as Parameters<typeof listMeetings>[0] | undefined),
  "meetings:get": (message) => getMeeting(message.payload as string),
  "meetings:create": (message) => createMeeting(message.payload as Parameters<typeof createMeeting>[0]),
  "meetings:update": (message) => updateMeeting(message.payload as Parameters<typeof updateMeeting>[0]),
  "meetings:delete": (message) => {
    deleteMeeting(message.payload as string);
    return null;
  },
  "meetings:search": (message) => searchMeetings(message.payload as string),
  "meetings:transcript": (message) => listTranscriptSegments(message.payload as string),
  "meetings:transcriptSince": (message) => {
    const payload = message.payload as { meetingId: string; afterSegmentIndex: number };
    return listTranscriptSegmentsSince(payload.meetingId, payload.afterSegmentIndex);
  },
  "transcripts:appendBatch": (message) => {
    const payload = message.payload as {
      meetingId: string;
      segments: Parameters<typeof upsertTranscriptSegments>[1];
    };
    return upsertTranscriptSegments(payload.meetingId, payload.segments);
  },
  "transcripts:upsert": (message) => {
    const payload = message.payload as {
      meetingId: string;
      segment: Parameters<typeof upsertTranscriptSegment>[1];
    };
    return upsertTranscriptSegment(payload.meetingId, payload.segment);
  },
  "notes:get": (message) => getNotes(message.payload as string),
  "notes:list": (message) => {
    const payload = message.payload as string | { meetingId: string };
    const meetingId = typeof payload === "string" ? payload : payload.meetingId;
    return getNotes(meetingId);
  },
  "notes:save": (message) => {
    const payload = message.payload as { meetingId: string; blocks: Parameters<typeof replaceNotes>[1] };
    return replaceNotes(payload.meetingId, payload.blocks);
  },
  "settings:getAll": () => getAllSettings(),
  "settings:setRaw": (message) => setRawSettings(message.payload as Record<string, string>),
};

async function handleMessage(message: WorkerRequest): Promise<WorkerResponse> {
  const responseId = message.id;
  try {
    const handler = workerHandlers[message.action];
    const result = await handler(message as WorkerMessage);
    return { id: responseId, success: true, result };
  } catch (error) {
    return {
      id: responseId,
      success: false,
      error: error instanceof Error ? error.message : "Database worker failed.",
    };
  }
}

if (!parentPort) {
  throw new Error("Database worker requires a parent port.");
}

parentPort.on("message", async (message: WorkerRequest) => {
  const response = await handleMessage(message);
  parentPort?.postMessage(response);
});
