---
name: noteflow-meeting-sync
description: >
  Sync a NoteFlow meeting to Notion. Reads the latest completed meeting from
  the NoteFlow SQLite database, formats it as a structured Notion page (attendees,
  user notes, AI key points, full transcript), and creates it via the Notion MCP.
  Trigger with: "sync my meeting to Notion", "add last meeting to Notion",
  "create Notion page for my meeting", or "post meeting notes to Notion".
---

# NoteFlow → Notion Sync Skill

## What this skill does

Reads the latest completed meeting from the NoteFlow SQLite database at
`~/Downloads/Granola_bar/noteflow` and creates a structured Notion page with:
- Meeting title, date, duration
- Attendees list
- User's meeting notes
- AI-generated key points (if available)
- Full transcript in a collapsible toggle

## Step-by-step instructions

### Step 1 — Read the NoteFlow database

The NoteFlow SQLite database is at:
`~/Downloads/Granola_bar/noteflow/` + macOS userData path

In development, the app stores SQLite at:
`~/Library/Application Support/NoteFlow/noteflow.db`
OR the app may use the project directory. Try both:

```bash
# Try dev path first
ls ~/Library/Application\ Support/NoteFlow/
# Fall back to checking if there's a local db
ls ~/Downloads/Granola_bar/noteflow/*.db 2>/dev/null
```

Query the most recent completed meeting:
```bash
sqlite3 ~/Library/Application\ Support/NoteFlow/noteflow.db << 'SQL'
SELECT
  m.id, m.title, m.started_at, m.ended_at, m.template_id,
  GROUP_CONCAT(a.name || COALESCE(' <' || a.email || '>', ''), ', ') as attendees
FROM meetings m
LEFT JOIN attendees a ON a.meeting_id = m.id
WHERE m.ended_at IS NOT NULL
GROUP BY m.id
ORDER BY m.started_at DESC
LIMIT 1;
SQL
```

Get notes for that meeting (replace MEETING_ID):
```bash
sqlite3 ~/Library/Application\ Support/NoteFlow/noteflow.db \
  "SELECT block_type, content, source FROM note_blocks WHERE meeting_id = 'MEETING_ID' ORDER BY block_order;"
```

Get transcript (replace MEETING_ID):
```bash
sqlite3 ~/Library/Application\ Support/NoteFlow/noteflow.db \
  "SELECT speaker_label, text, start_ms FROM transcript_segments WHERE meeting_id = 'MEETING_ID' ORDER BY segment_index LIMIT 100;"
```

### Step 2 — Check Notion setup

Use the `notion-fetch` tool to verify you can access Notion.
Ask the user: "Which Notion database should I add this to? Please share the database URL or ID."

If they've already set one up, use that. A good default page title is:
`[Meeting Title] — [Day, Month Date, Year]`

### Step 3 — Create the Notion page

Use `notion-create-pages` with this structure:

**Properties** (adjust to match the user's database schema):
```
Name: "[Meeting Title] — [Formatted Date]"
Date: ISO date string of meeting start
```

**Content** (Notion-flavored Markdown):

```markdown
## Attendees
- [Name] ([email])
- [Name]

---

## Meeting Notes
[user's typed notes here, preserving heading/bullet structure]

---

## Key Points (AI)
[AI-generated bullet points if available]

---
<details>
<summary>Full Transcript ([N] segments)</summary>

[00:00] Speaker A: First segment text...
[00:12] Speaker B: Response text...

</details>
```

### Step 4 — Report back

After creating the page, tell the user:
- ✅ The Notion page was created successfully
- Provide the page URL
- Ask: "Want me to sync previous meetings too?"

## Notes

- If no meetings have `ended_at` set (meeting was never ended), use the latest meeting regardless
- Transcript is capped at 100 segments in the Notion page (Notion block limit)
- If transcript is empty (Phase 4 not complete yet), skip that section
- The Notion MCP is already available — use `notion-create-pages` directly
- Never ask for the SQLite path more than once — cache it after first successful read

## Error handling

- **DB not found**: Ask user to open NoteFlow once so it initialises the database
- **No meetings**: Ask user to create and end a meeting first in the app
- **Notion not connected**: Guide user to connect Notion via the integrations panel
- **No transcript**: Skip transcript section, note "Transcription not yet available (Phase 4 pending)"
