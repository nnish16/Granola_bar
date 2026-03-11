# NoteFlow — Codex Agent Guide
**Version**: 1.0 | **Status**: Phase 3 complete, Phase 4+ pending
**For**: OpenAI Codex / Jules agents continuing the build

---

## BEFORE STARTING ANY SESSION

1. Run `git log --oneline -10` to see what's been committed
2. Run `npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.main.json` — must be zero errors
3. Run `npm run build:swift` once to compile the audio binary (requires macOS 13+)
4. Check `AGENT_BUILD_INSTRUCTIONS.md` — phases marked ✅ are done, start at the first unmarked one

**Never break these invariants:**
- TypeScript strict mode passes clean (no `any` except where explicitly commented)
- `npm start` must launch Electron without errors
- All IPC channels must have matching types in `src/types/index.ts`
- SQLite schema is append-only (add migrations, never edit `001_initial.sql`)

---

## CURRENT STATE (as of Phase 3 completion)

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Scaffold | ✅ Done | Electron, SQLite, TypeScript, React Router |
| 2 — Meeting Library | ✅ ~75% | Home screen, MeetingCard, Zustand store |
| 3 — Audio Capture | ✅ Done | Swift binary + Electron bridge |
| 4 — Whisper | 🔲 Next | transcriber.ts stub ready |
| 5 — Note Editor | 🔲 | Tiptap, dual-color notes |
| 6 — AI Enhancement | 🔲 | Gemini 2.5 Flash |
| 7 — Notion Sync | ✅ Done | Auto-sync after meeting ends |
| 8 — Calendar | 🔲 | Google Calendar OAuth |
| 9 — CMD+J Chat | 🔲 | Floating chat panel |
| 10 — Sidebar polish | 🔲 | People/Companies/Folders |
| 11 — Menu bar + iPhone | 🔲 | Deferred |

---

## TASK A — UI / UX Refinements (Priority: High)

**Goal**: Match Granola's exact visual weight — lighter, airier, more white space. Current UI is slightly dense.

### A1 — Global Spacing & Typography

File: `src/styles/globals.css`

```css
/* Increase base font to 14px (Granola uses Inter 14px body) */
body { font-size: 14px; line-height: 1.5; }

/* Soften card shadows */
.card { box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); }
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

/* Sidebar should be 220px wide (currently 240) */
.sidebar { width: 220px; min-width: 220px; }
```

### A2 — MeetingCard improvements

File: `src/components/meeting/MeetingCard.tsx`

Current issues:
- Preview text too dark — should be `text-gray-400` not `text-gray-500`
- Date format should be "Today, 2:30 PM" or "Mon 10 Mar, 2:30 PM" (use `date-fns`)
- Duration badge missing — add small pill showing "42 min" when `endedAt` is set
- Missing subtle left-border accent color per template type

Desired card layout:
```
┌────────────────────────────────────────────────┐
│ [●] Weekly Standup                    42 min   │
│     Mon 10 Mar, 10:00 AM · 3 attendees         │
│     "We discussed the Q1 roadmap and..."       │
└────────────────────────────────────────────────┘
```

Implementation:
```tsx
// Add to MeetingCard.tsx
const durationLabel = meeting.endedAt
  ? formatDuration(meeting.endedAt - meeting.startedAt)  // "42 min"
  : "Recording...";

const dateLabel = isToday(meeting.startedAt)
  ? `Today, ${format(meeting.startedAt, 'h:mm a')}`
  : format(meeting.startedAt, 'EEE d MMM, h:mm a');
```

### A3 — Sidebar improvements

File: `src/components/layout/Sidebar.tsx`

- Logo: show a simple green dot `●` + "NoteFlow" (12px, semibold, gray-800)
- "Coming Up" section: show meeting time countdown ("in 23 min")
- Add collapsible sections with smooth CSS transition (no JS library)
- Hover: `bg-gray-50` with `border-l-2 border-green-500` on active item
- Remove "Phase 1 scaffold" subtitle text

### A4 — Empty state

File: `src/pages/Home.tsx`

Replace current "No meetings yet" text with a centered card:
```tsx
<div className="flex flex-col items-center gap-3 py-20 text-center">
  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
    <MicIcon className="w-6 h-6 text-green-500" />
  </div>
  <p className="text-sm font-medium text-gray-800">No meetings yet</p>
  <p className="text-xs text-gray-400 max-w-[200px]">
    Click <strong>+ New</strong> to start recording your first meeting
  </p>
</div>
```

### A5 — Skeleton loading screens

File: `src/components/meeting/MeetingCardSkeleton.tsx` (create new)

Show 4 skeleton cards while `isLoading = true` in meetings store:
```tsx
export function MeetingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg p-4 bg-white border border-gray-100">
      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-full" />
    </div>
  );
}
```

### A6 — TopBar refinements

File: `src/components/layout/TopBar.tsx`

- Search input: change placeholder to "Search meetings..." with magnifier inside input (not as sibling)
- `+ New` button: label it `+ New meeting` (more descriptive)
- When a recording is active: show red pulsing dot + "Recording — 00:42" timer on right side
- Add `cmd+k` keyboard shortcut to focus search (use `useEffect` with keydown listener)

---

## TASK B — RAM & Storage Optimization (Priority: High)

**Goal**: Reduce memory footprint from ~150MB idle to <80MB. Never hold PCM audio in renderer.

### B1 — Meeting list pagination (CRITICAL)

File: `src/store/meetings.store.ts`

Currently loads ALL meetings on mount. With 1000+ meetings this will crash.

```typescript
// Replace loadMeetings with paginated version
loadMeetings: async (offset = 0, limit = 50) => {
  const result = await window.noteflow.meetings.list({ offset, limit });
  set(state => ({
    meetings: offset === 0 ? result.items : [...state.meetings, ...result.items],
    hasMore: result.hasMore,
  }));
},
```

Add IPC handler `meetings:list` with `{ offset, limit }` args and `LIMIT ? OFFSET ?` SQL.

### B2 — Virtual scroll for meeting list

File: `src/pages/Home.tsx`

Install `@tanstack/react-virtual` (already in package.json as `react-virtual`). Use it for the past meetings list:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: pastMeetings.length,
  getScrollElement: () => scrollContainerRef.current,
  estimateSize: () => 80,  // MeetingCard height in px
});
```

### B3 — PCM buffer cleanup after transcription

File: `electron/audio/capture.ts`

After emitting `audioChunk`, the PCM data should be passed to whisper and then freed. Never store chunks in an array — process and discard.

```typescript
// In AudioCapture.drainChunks() — after emitting, the Buffer goes out of scope naturally.
// But ensure the transcriber does NOT store chunks. Process inline.
// Phase 4: whisper.processChunk(chunk).then(() => { /* chunk freed */ })
```

### B4 — SQLite WAL cleanup

File: `electron/db/database.ts`

Add to initialization after migrations:
```typescript
// Auto-checkpoint WAL every 1000 pages (prevents unbounded WAL growth)
db.pragma('wal_autocheckpoint = 1000');

// Schedule periodic VACUUM on idle (once per week)
const lastVacuum = db.prepare("SELECT value FROM settings WHERE key = 'last_vacuum'").get();
const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
if (!lastVacuum || Number(lastVacuum.value) < weekAgo) {
  db.exec('VACUUM');
  db.prepare("INSERT OR REPLACE INTO settings VALUES ('last_vacuum', ?)").run(String(Date.now()));
}
```

### B5 — Lazy load transcript segments

Never load transcript into renderer memory until the user opens a specific meeting.

File: `electron/ipc/meetings.ipc.ts`

```typescript
// Add separate handler — do NOT include transcript in meetings:get by default
ipcMain.handle('meetings:transcript', (_e, id: string) =>
  callDatabaseWorker('meetings:transcript', id)
);
```

### B6 — Webpack bundle optimization

File: `webpack.renderer.config.js`

Add to the existing config:
```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
      },
      tiptap: {
        test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
        name: 'tiptap',
        priority: 20,
      },
    },
  },
},
```

---

## TASK C — Phase 4: Whisper Transcription Pipeline

File: `electron/audio/transcriber.ts`

### Prerequisites
Run `npm run download:whisper` (or manually):
```bash
# In scripts/download-whisper.sh — implement this:
MODEL_DIR="resources/whisper"
mkdir -p $MODEL_DIR
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
  -o "$MODEL_DIR/ggml-base.en.bin"
```

### Implementation plan

Use `nodejs-whisper` npm package (wraps whisper.cpp with Node bindings):

```typescript
import { nodewhisper } from 'nodejs-whisper';
import { audioCapture } from './capture';

export class Transcriber {
  private meetingId: string | null = null;
  private segmentIndex = 0;

  attach(meetingId: string): void {
    this.meetingId = meetingId;
    this.segmentIndex = 0;

    audioCapture.on('audioChunk', async ({ pcmF32Buffer, timestamp }) => {
      if (!this.meetingId) return;

      // Write chunk to temp WAV file (whisper.cpp requires file input)
      const tmpPath = path.join(app.getPath('temp'), `chunk_${Date.now()}.wav`);
      await writePcmAsWav(pcmF32Buffer, tmpPath);

      // Transcribe
      const result = await nodewhisper(tmpPath, {
        modelName: 'base.en',
        autoDownloadModelName: 'base.en',
        whisperOptions: { outputInText: false, outputInVtt: false, outputInSrt: false },
      });

      // Parse segments and emit to renderer via IPC
      // Also save to DB via callDatabaseWorker('meetings:addSegment', ...)
      
      // Cleanup temp file
      fs.unlinkSync(tmpPath);
    });
  }

  detach(): void {
    this.meetingId = null;
    audioCapture.removeAllListeners('audioChunk');
  }
}
```

### WAV helper
```typescript
function writePcmAsWav(pcmF32: Buffer, outputPath: string): void {
  const sampleRate = 16000;
  const channels = 1;
  const bytesPerSample = 4; // float32
  const dataSize = pcmF32.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);           // chunk size
  header.writeUInt16LE(3, 20);            // PCM float = 3
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(outputPath, Buffer.concat([header, pcmF32]));
}
```

---

## TASK D — Phase 5: Note Editor (Tiptap)

File: `src/pages/MeetingView.tsx`

**Goal**: Replace placeholder with dual-color Tiptap editor matching Granola exactly.

### Color system
- User notes: `#0F0F0F` (black, Inter Regular 15px)
- AI-generated blocks: `#6B7280` (gray-500, Inter Regular 15px)
- AI blocks have a subtle left border: `border-l-2 border-gray-200`
- Transcript hyperlinks (inline in AI text): `text-green-600 underline cursor-pointer`

### Tiptap extensions needed
```typescript
import { Editor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { NoteBlock } from '@tiptap/extension-paragraph'  // custom mark for source

// Create custom NoteSourceMark extension to distinguish user vs AI blocks
const NoteSourceMark = Mark.create({
  name: 'noteSource',
  addAttributes() {
    return { source: { default: 'user' } }  // 'user' | 'ai'
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-source': HTMLAttributes.source, ...HTMLAttributes }, 0]
  }
})
```

### Layout (3-column during meeting, 2-column after)
```
┌──────────┬─────────────────────────┬──────────────┐
│ Sidebar  │  Note Editor            │  Live Transcript│
│          │  [user types here]      │  (scrolling)  │
│          │  [AI adds context gray] │               │
└──────────┴─────────────────────────┴──────────────┘
```

After meeting ends: transcript column collapses.

---

## TASK E — Phase 6: AI Note Enhancement

File: `electron/ai/enhance.ts`

**Model**: Gemini 2.5 Flash via Google AI Studio (OpenAI-compatible endpoint)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: process.env.GOOGLE_AI_STUDIO_KEY || settings.googleAiKey,
});

export async function enhanceMeetingNotes(
  userNotes: string,
  transcript: string,
  templatePrompt: string,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: [
      { role: 'system', content: templatePrompt },
      { role: 'user', content: `USER NOTES:\n${userNotes}\n\nTRANSCRIPT:\n${transcript}` },
    ],
  });
  return completion.choices[0].message.content ?? '';
}
```

**Template prompts** are already defined in `AGENT_BUILD_INSTRUCTIONS.md` (8 meeting types).

---

## IMPORTANT: Commit After Each Task

```bash
git add -A
git commit -m "Task A: UI/UX refinements — lighter design, skeleton loading, card improvements"
git commit -m "Task B: RAM optimization — pagination, virtual scroll, WAL cleanup"
git commit -m "Phase 4: Whisper transcription pipeline"
git commit -m "Phase 5: Tiptap note editor with dual-color user/AI blocks"
git commit -m "Phase 6: Gemini 2.5 Flash AI note enhancement"
```

---

## DO NOT TOUCH

- `electron/audio/capture.ts` — Phase 3 complete, production quality
- `swift/AudioCapture/*.swift` — do not modify Swift files
- `electron/db/migrations/001_initial.sql` — never edit, only add new migration files
- `electron/notion/sync.ts` — Notion integration, handled separately
