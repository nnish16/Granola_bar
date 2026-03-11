import { ipcMain } from "electron";
import { syncMeetingToNotion } from "../notion/sync";
import { filterMeetingForExport, loadMeetingForExport, resolveMeetingSyncSelection } from "../share/meeting-export";
import type { NotionSyncInput } from "../../src/types";
import { getSecureSettings } from "../settings/secure-settings";

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
    async (_event, input: string | NotionSyncInput) => {
      const meetingId = typeof input === "string" ? input : input.meetingId;
      const selection = resolveMeetingSyncSelection(typeof input === "string" ? undefined : input.selection);

      // 1. Fetch settings (api key + database id)
      const settings = await getSecureSettings();
      const apiKey = settings.notionApiKey.trim();
      const databaseId = settings.notionParentPageId.trim();

      if (!apiKey || !databaseId) {
        return {
          ok: false,
          error:
            "Notion not configured. Add your API key and database ID in Settings.",
        };
      }

      // 2. Fetch meeting + notes + transcript
      const meeting = await loadMeetingForExport(meetingId);

      if (!meeting) {
        return { ok: false, error: `Meeting ${meetingId} not found` };
      }

      // 3. Sync only the selected slices of meeting content.
      const filteredMeeting = filterMeetingForExport(meeting, selection);

      return syncMeetingToNotion(
        {
          ...filteredMeeting,
          transcriptSegments: filteredMeeting.transcriptSegments.slice(0, 100),
        },
        { apiKey, databaseId }
      );
    }
  );

  // ── notion:status ────────────────────────────────────────────────────────
  ipcMain.handle("notion:status", async () => {
    const settings = await getSecureSettings();
    return {
      configured: Boolean(settings.notionApiKey) && Boolean(settings.notionParentPageId),
    };
  });
}
