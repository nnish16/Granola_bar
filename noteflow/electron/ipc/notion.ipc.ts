import { ipcMain } from "electron";
import { syncMeetingToNotion } from "../notion/sync";
import { callDatabaseWorker } from "../db/worker-client";

/**
 * IPC channels for Notion integration:
 *
 *   notion:sync    { meetingId }  → NotionSyncOutcome
 *   notion:status  {}             → { configured: boolean }
 *
 * The renderer calls notion:sync after a meeting ends (or manually from the
 * share panel). The main process fetches all data from SQLite and calls the
 * Notion API — the renderer never touches the API key.
 */
export function registerNotionIpcHandlers(): void {
  // ── notion:sync ──────────────────────────────────────────────────────────
  ipcMain.handle(
    "notion:sync",
    async (_event, meetingId: string) => {
      // 1. Fetch settings (api key + database id)
      const settings = (await callDatabaseWorker("settings:getAll")) as Record<
        string,
        string
      >;
      const apiKey = settings["notion_api_key"] ?? "";
      const databaseId = settings["notion_database_id"] ?? "";

      if (!apiKey || !databaseId) {
        return {
          ok: false,
          error:
            "Notion not configured. Add your API key and database ID in Settings.",
        };
      }

      // 2. Fetch meeting + attendees
      const meeting = (await callDatabaseWorker("meetings:get", meetingId)) as
        | null
        | {
            id: string;
            title: string;
            startedAt: number;
            endedAt: number | null;
            templateId: string;
            attendees: Array<{ name: string; email: string | null }>;
          };

      if (!meeting) {
        return { ok: false, error: `Meeting ${meetingId} not found` };
      }

      // 3. Fetch note blocks
      const noteBlocks = (await callDatabaseWorker(
        "notes:list",
        meetingId
      )) as Array<{
        content: string;
        source: "user" | "ai";
        blockType: string;
      }>;

      // 4. Fetch transcript segments
      const transcriptSegments = (await callDatabaseWorker(
        "meetings:transcript",
        meetingId
      )) as Array<{
        speakerLabel: string;
        text: string;
        startMs: number;
      }>;

      // 5. Sync to Notion
      return syncMeetingToNotion(
        { ...meeting, noteBlocks, transcriptSegments },
        { apiKey, databaseId }
      );
    }
  );

  // ── notion:status ────────────────────────────────────────────────────────
  ipcMain.handle("notion:status", async () => {
    const settings = (await callDatabaseWorker("settings:getAll")) as Record<
      string,
      string
    >;
    return {
      configured:
        Boolean(settings["notion_api_key"]) &&
        Boolean(settings["notion_database_id"]),
    };
  });
}
