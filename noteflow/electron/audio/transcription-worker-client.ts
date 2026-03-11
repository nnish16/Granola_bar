import fs from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { app } from "electron";

type TranscriptionJob = {
  modelPath: string;
  rawPcmF32: Buffer;
  tempDir: string;
};

type WorkerRequest = TranscriptionJob & {
  id: number;
};

type WorkerResponse =
  | {
      id: number;
      segments: Array<{ endMs: number; speakerLabel: string; startMs: number; text: string }>;
      success: true;
    }
  | { error: string; id: number; success: false };

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, { reject: (reason?: unknown) => void; resolve: (value: WorkerResponse & { success: true }) => void }>();

function resolveWorkerPath(): string {
  const workerName = "transcription-worker.js";
  const candidatePaths = app.isPackaged
    ? [path.resolve(__dirname, workerName)]
    : [
        path.resolve(__dirname, workerName),
        path.resolve(app.getAppPath(), ".webpack", "main", workerName),
        path.resolve(process.cwd(), ".webpack", "main", workerName),
      ];

  const workerPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
  if (!workerPath) {
    throw new Error("Transcription worker bundle could not be located.");
  }

  return workerPath;
}

function ensureWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(resolveWorkerPath());
  worker.on("message", (message: WorkerResponse) => {
    const pendingRequest = pendingRequests.get(message.id);
    if (!pendingRequest) {
      return;
    }

    pendingRequests.delete(message.id);
    if (message.success) {
      pendingRequest.resolve(message);
      return;
    }

    pendingRequest.reject(new Error(message.error));
  });
  worker.on("error", (error) => {
    pendingRequests.forEach(({ reject }) => reject(error));
    pendingRequests.clear();
    worker = null;
  });
  worker.on("exit", () => {
    worker = null;
  });

  return worker;
}

export function transcribeAudioChunk(job: TranscriptionJob): Promise<WorkerResponse & { success: true }> {
  const activeWorker = ensureWorker();
  const id = nextRequestId++;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { reject, resolve });
    const request: WorkerRequest = { id, ...job };
    activeWorker.postMessage(request);
  });
}
