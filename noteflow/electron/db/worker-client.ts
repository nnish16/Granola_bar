import fs from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";

type WorkerAction =
  | "initialize"
  | "meetings:list"
  | "meetings:get"
  | "meetings:create"
  | "meetings:update"
  | "meetings:delete"
  | "meetings:search"
  | "notes:get"
  | "notes:save"
  | "notes:list"
  | "settings:get"
  | "settings:set"
  | "settings:getAll"
  | "meetings:transcript";

type WorkerRequest = {
  id: number;
  action: WorkerAction;
  payload?: unknown;
};

type WorkerResponse = {
  id: number;
  success: boolean;
  result?: unknown;
  error?: string;
};

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();

function ensureWorker(): Worker {
  if (worker) {
    return worker;
  }

  const candidatePaths = [
    path.resolve(__dirname, "db-worker.js"),
    path.resolve(process.cwd(), ".webpack", "main", "db-worker.js"),
  ];
  const workerPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (!workerPath) {
    throw new Error("Database worker bundle could not be located.");
  }

  worker = new Worker(workerPath);
  worker.on("message", (message: WorkerResponse) => {
    const pendingRequest = pendingRequests.get(message.id);
    if (!pendingRequest) {
      return;
    }

    pendingRequests.delete(message.id);
    if (message.success) {
      pendingRequest.resolve(message.result);
      return;
    }

    pendingRequest.reject(new Error(message.error ?? "Database worker request failed."));
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

export async function initializeDatabaseWorker(): Promise<void> {
  await callDatabaseWorker("initialize");
}

export function callDatabaseWorker<T>(action: WorkerAction, payload?: unknown): Promise<T> {
  const activeWorker = ensureWorker();
  const id = nextRequestId++;

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });
    const request: WorkerRequest = { id, action, payload };
    activeWorker.postMessage(request);
  });
}
