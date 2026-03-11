import path from "node:path";
import { Worker } from "node:worker_threads";

let worker: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;
let workerPathPromise: Promise<string> | null = null;

function resetWorkerRuntime(): void {
  worker = null;
  workerPromise = null;
}

async function resolveWorkerPath(): Promise<string> {
  if (!workerPathPromise) {
    workerPathPromise = Promise.resolve(path.resolve(__dirname, "db-worker.js"));
  }

  return workerPathPromise;
}

export async function ensureDatabaseWorker(
  onMessage: (message: unknown) => void,
  onFailure: (error: Error) => void,
): Promise<Worker> {
  if (worker) {
    return worker;
  }

  if (!workerPromise) {
    workerPromise = (async () => {
      const workerPath = await resolveWorkerPath();
      const activeWorker = new Worker(workerPath);

      activeWorker.on("message", onMessage);
      activeWorker.on("error", (error) => {
        resetWorkerRuntime();
        onFailure(error instanceof Error ? error : new Error("Database worker failed."));
      });
      activeWorker.on("exit", (code) => {
        resetWorkerRuntime();
        onFailure(new Error(`Database worker exited before completing its requests${code ? ` (code ${code})` : ""}.`));
      });

      worker = activeWorker;
      return activeWorker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}
