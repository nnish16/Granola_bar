/**
 * electron/notion/sync.ts — Notion integration for NoteFlow
 *
 * NOTE: Requires @notionhq/client — run `npm install` after adding to package.json.
 * Until installed, this module stubs itself gracefully.
 *
 * Setup:
 *   1. https://www.notion.so/my-integrations → create integration → copy token
 *   2. NoteFlow Settings → paste token + Notion database ID
 *   3. Share your meetings database with the integration
 */

// ---------------------------------------------------------------------------
// Types (self-contained — no import needed from @notionhq/client for types)
// ---------------------------------------------------------------------------

export interface MeetingForSync {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number | null;
  templateId: string;
  attendees: Array<{ name: string; email: string | null }>;
  noteBlocks: Array<{ content: string; source: "user" | "ai"; blockType: string }>;
  transcriptSegments: Array<{ speakerLabel: string; text: string; startMs: number }>;
}

export interface NotionSyncResult {
  ok: true;
  pageId: string;
  pageUrl: string;
}

export interface NotionSyncError {
  ok: false;
  error: string;
}

export type NotionSyncOutcome = NotionSyncResult | NotionSyncError;

export interface NotionSyncConfig {
  apiKey: string;
  databaseId: string;
}

// ---------------------------------------------------------------------------
// Main sync function (uses dynamic require so missing package is non-fatal)
// ---------------------------------------------------------------------------

export async function syncMeetingToNotion(
  meeting: MeetingForSync,
  config: NotionSyncConfig,
): Promise<NotionSyncOutcome> {
  if (!config.apiKey || !config.databaseId) {
    return { ok: false, error: "Notion API key or database ID not configured" };
  }

  // Dynamic require — @notionhq/client may not be installed yet
  // Using eslint-disable + any cast to avoid hard TS dependency on optional package
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let notionMod: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notionMod = require("@notionhq/client");
  } catch {
    return {
      ok: false,
      error: "@notionhq/client not installed. Run `npm install` in the noteflow directory.",
    };
  }

  const notion = new notionMod.Client({ auth: config.apiKey });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  try {
    // Validate database access
    await notion.databases.retrieve({ database_id: config.databaseId });

    // Build blocks and properties
    const blocks = buildPageBlocks(meeting);

    const response = await notion.pages.create({
      parent: { database_id: config.databaseId },
      properties: buildPageProperties(meeting),
      children: blocks,
    });

    if (!notionMod.isFullPage(response)) {
      return { ok: false, error: "Notion returned an unexpected response" };
    }

    const pageUrl = `https://notion.so/${(response.id as string).replace(/-/g, "")}`;
    return { ok: true, pageId: response.id as string, pageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Notion sync failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Page properties builder
// ---------------------------------------------------------------------------

function buildPageProperties(meeting: MeetingForSync): Record<string, unknown> {
  const startDate = new Date(meeting.startedAt);
  const durationMin = meeting.endedAt
    ? Math.round((meeting.endedAt - meeting.startedAt) / 60000)
    : null;
  const attendeeNames = meeting.attendees.map((a) => a.name).join(", ");
  const titleText = durationMin
    ? `${meeting.title} — ${formatDate(startDate)}`
    : meeting.title;

  return {
    Name: { title: [{ text: { content: titleText } }] },
    Date: { date: { start: startDate.toISOString() } },
    Duration: {
      rich_text: [{ text: { content: durationMin ? `${durationMin} min` : "In progress" } }],
    },
    Attendees: {
      rich_text: [{ text: { content: attendeeNames || "No attendees" } }],
    },
    Template: { select: { name: meeting.templateId } },
  };
}

// ---------------------------------------------------------------------------
// Page body blocks builder
// ---------------------------------------------------------------------------

function buildPageBlocks(meeting: MeetingForSync): unknown[] {
  const blocks: unknown[] = [];

  if (meeting.attendees.length > 0) {
    blocks.push(heading2("Attendees"));
    for (const a of meeting.attendees) {
      blocks.push(bullet(a.email ? `${a.name} (${a.email})` : a.name));
    }
    blocks.push(divider());
  }

  const userNotes = meeting.noteBlocks.filter((b) => b.source === "user");
  if (userNotes.length > 0) {
    blocks.push(heading2("Meeting Notes"));
    for (const nb of userNotes) {
      if (nb.blockType === "heading") blocks.push(heading3(nb.content));
      else if (nb.blockType === "bullet") blocks.push(bullet(nb.content));
      else blocks.push(para(nb.content));
    }
    blocks.push(divider());
  }

  const aiBlocks = meeting.noteBlocks.filter((b) => b.source === "ai");
  if (aiBlocks.length > 0) {
    blocks.push(heading2("Key Points (AI)"));
    for (const nb of aiBlocks) {
      blocks.push(nb.blockType === "bullet" ? bullet(nb.content) : para(nb.content));
    }
    blocks.push(divider());
  }

  if (meeting.transcriptSegments.length > 0) {
    blocks.push({
      type: "toggle",
      toggle: {
        rich_text: [{
          type: "text",
          text: { content: `Full Transcript (${meeting.transcriptSegments.length} segments)` },
          annotations: { bold: true },
        }],
        children: meeting.transcriptSegments.slice(0, 100).map((seg) =>
          para(`[${formatMs(seg.startMs)}] ${seg.speakerLabel}: ${seg.text}`)
        ),
      },
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Block helpers
// ---------------------------------------------------------------------------

const rich = (text: string) => [{ type: "text", text: { content: text.slice(0, 2000) } }];
const heading2 = (t: string) => ({ type: "heading_2", heading_2: { rich_text: rich(t) } });
const heading3 = (t: string) => ({ type: "heading_3", heading_3: { rich_text: rich(t) } });
const para = (t: string) => ({ type: "paragraph", paragraph: { rich_text: rich(t) } });
const bullet = (t: string) => ({ type: "bulleted_list_item", bulleted_list_item: { rich_text: rich(t) } });
const divider = () => ({ type: "divider", divider: {} });

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
