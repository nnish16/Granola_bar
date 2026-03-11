import { Worker } from "node:worker_threads";
import { ensureDatabaseWorker } from "./worker-runtime";

type WorkerAction =
  | "initialize"
  | "meetings:list"
  | "meetings:get"
  | "meetings:create"
  | "meetings:update"
  | "meetings:delete"
  | "meetings:search"
  | "meetings:transcript"
  | "meetings:transcriptSince"
  | "transcripts:appendBatch"
  | "transcripts:upsert"
  | "notes:get"
  | "notes:save"
  | "notes:list"
  | "settings:setRaw"
  | "settings:getAll";

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
let workerInitializationPromise: Promise<void> | null = null;
let workerReadyPromise: Promise<void> | null = null;
const pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();

function resetWorkerState(reason: Error): void {
  pendingRequests.forEach(({ reject }) => reject(reason));
  pendingRequests.clear();
  worker = null;
  workerInitializationPromise = null;
  workerReadyPromise = null;
}

function enqueueWorkerRequest<T>(activeWorker: Worker, action: WorkerAction, payload?: unknown): Promise<T> {
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

function createWorkerReadyPromise(activeWorker: Worker): Promise<void> {
  const readyPromise = enqueueWorkerRequest<void>(activeWorker, "initialize")
    .then(() => undefined)
    .catch((error) => {
      if (workerReadyPromise === readyPromise) {
        workerReadyPromise = null;
      }

      throw error;
    });

  workerReadyPromise = readyPromise;
  return readyPromise;
}

function handleWorkerMessage(rawMessage: unknown): void {
  const message = rawMessage as WorkerResponse;
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
}

function handleWorkerFailure(error: Error): void {
  resetWorkerState(error);
}

async function ensureWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = await ensureDatabaseWorker(handleWorkerMessage, handleWorkerFailure);
  return worker;
}

export async function initializeDatabaseWorker(): Promise<void> {
  if (workerReadyPromise) {
    await workerReadyPromise;
    return;
  }

  if (!workerInitializationPromise) {
    workerInitializationPromise = (async () => {
      const activeWorker = await ensureWorker();
      if (!workerReadyPromise) {
        workerReadyPromise = createWorkerReadyPromise(activeWorker);
      }

      await workerReadyPromise;
    })().finally(() => {
      workerInitializationPromise = null;
    });
  }

  await workerInitializationPromise;
}

export async function callDatabaseWorker<T>(action: WorkerAction, payload?: unknown): Promise<T> {
  if (action === "initialize") {
    return enqueueWorkerRequest<T>(await ensureWorker(), action, payload);
  }

  await initializeDatabaseWorker();
  return enqueueWorkerRequest<T>(await ensureWorker(), action, payload);
}
