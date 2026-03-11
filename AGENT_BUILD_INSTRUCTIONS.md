# AGENT BUILD INSTRUCTIONS — NoteFlow (Granola Clone)
> **READ THIS FIRST.** This file is your complete source of truth for building this project. Read it entirely before writing any code. Every decision has already been made — do not deviate from the specifications here without being told to. Your job is to execute, not to re-decide architecture.

---

## AGENT IDENTITY & RULES

You are a senior full-stack engineer building a macOS desktop application called **NoteFlow** — a pixel-accurate clone of Granola (granola.so), the AI meeting notes app.

### Non-negotiable rules:
1. **Always write complete, runnable code.** No pseudocode. No `// TODO`. No placeholder comments. Every file you produce must run without errors.
2. **Never change the tech stack.** The stack is locked. Do not substitute libraries.
3. **Always match the exact UI.** Colors, spacing, typography, and interaction patterns are specified below. Do not improvise on design.
4. **Always check the current file before editing it.** Read the existing file content first. Never overwrite work.
5. **Commit after each phase completes.** Run `git add -A && git commit -m "Phase X: [description]"` when a phase is done.
6. **Never install dependencies not listed in this document** without explicit instruction.
7. **All data is stored locally.** Nothing goes to external servers except: AI API calls (text only, no audio) and optional Deepgram (when user enables it).
8. **TypeScript strict mode is ON.** All files must pass `tsc --noEmit` with zero errors.

---

## PROJECT OVERVIEW

**What we're building**: A macOS app that:
- Runs in the background during meetings
- Captures system audio directly (no bot joins calls) using ScreenCaptureKit
- Transcribes speech to text locally using whisper.cpp
- Lets user type notes during meeting in a Notion-like block editor
- After meeting: AI generates structured summaries (key points, decisions, action items) blended with user's notes
- User notes shown in black; AI additions shown in gray with hyperlinks to transcript timestamps
- Full meeting library with search, folders, people/company views
- CMD+J opens AI chat to query any meeting or all meetings
- Sharing via public link; recipients can chat with the meeting AI
- Menu bar icon showing live recording state

**Primary user**: One person (the app owner), personal use, macOS.

---

## TECH STACK (LOCKED — DO NOT CHANGE)

```json
{
  "runtime": "Electron 32+",
  "ui": "React 18 + TypeScript 5",
  "styling": "Tailwind CSS 3 + shadcn/ui",
  "editor": "Tiptap 2 (@tiptap/react @tiptap/starter-kit @tiptap/extension-heading @tiptap/extension-bullet-list)",
  "state": "Zustand 4",
  "database": "better-sqlite3 (SQLite, local)",
  "audio_capture": "Swift helper process using ScreenCaptureKit (spawned by Electron main)",
  "transcription_primary": "whisper.cpp (local binary, CoreML on Apple Silicon)",
  "transcription_fallback": "Deepgram API (user opt-in only)",
  "ai_primary": "Gemini 2.5 Flash via Google AI Studio (OpenAI-compatible endpoint)",
  "ai_fallback_1": "GLM-4.7-Flash via bigmodel.cn",
  "ai_fallback_2": "Qwen via dashscope",
  "ai_fallback_3": "Groq (llama-3.3-70b)",
  "ai_sdk": "openai npm package (used for all LLM calls, just swap baseURL)",
  "vector_search": "LanceDB (local embedded, no server)",
  "calendar": "Google Calendar API v3 (OAuth 2.0)",
  "ipc": "Electron contextBridge + ipcMain/ipcRenderer",
  "router": "react-router-dom v6",
  "build": "electron-builder",
  "package_manager": "npm"
}
```

### Exact package.json dependencies to install:
```bash
npm install electron@latest electron-builder@latest
npm install react@18 react-dom@18 react-router-dom@6
npm install @types/react @types/react-dom @types/node typescript
npm install tailwindcss postcss autoprefixer
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-heading @tiptap/extension-bullet-list @tiptap/extension-placeholder
npm install zustand
npm install better-sqlite3 @types/better-sqlite3
npm install openai
npm install vectordb  # LanceDB
npm install googleapis @types/googleapis
npm install express @types/express
npm install electron-store
npm install @electron/remote
npm install node-cron
npm install date-fns
npm install uuid @types/uuid
npm install clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tooltip @radix-ui/react-separator
```

---

## COMPLETE PROJECT FILE STRUCTURE

Create this exact structure. Every file listed must exist when the project is complete.

```
noteflow/
├── package.json
├── tsconfig.json
├── tsconfig.main.json           # Separate TS config for Electron main process
├── tailwind.config.js
├── postcss.config.js
├── webpack.main.config.js
├── webpack.renderer.config.js
├── electron-builder.yml
├── .env.example                 # Template for API keys (never commit .env)
├── .gitignore
│
├── electron/                    # Main process (Node.js / Electron)
│   ├── main.ts                  # App entry point
│   ├── preload.ts               # Context bridge (exposes APIs to renderer)
│   ├── ipc/
│   │   ├── audio.ipc.ts         # Audio capture IPC handlers
│   │   ├── meetings.ipc.ts      # Meeting CRUD IPC handlers
│   │   ├── notes.ipc.ts         # Notes CRUD IPC handlers
│   │   ├── calendar.ipc.ts      # Calendar sync IPC handlers
│   │   ├── ai.ipc.ts            # AI summarize/chat IPC handlers
│   │   ├── share.ipc.ts         # Share link IPC handlers
│   │   └── settings.ipc.ts      # Settings IPC handlers
│   ├── audio/
│   │   ├── capture.ts           # Spawns Swift helper, receives WAV chunks via stdout
│   │   ├── transcriber.ts       # Feeds chunks to whisper.cpp, emits transcript lines
│   │   ├── vad.ts               # Voice Activity Detection (skip silence chunks)
│   │   └── deepgram.ts          # Optional Deepgram WebSocket client
│   ├── db/
│   │   ├── database.ts          # SQLite connection + migration runner
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql  # Creates all tables
│   │   │   └── 002_folders.sql  # Adds folders table
│   │   └── repositories/
│   │       ├── meetings.repo.ts
│   │       ├── notes.repo.ts
│   │       ├── transcripts.repo.ts
│   │       ├── templates.repo.ts
│   │       └── settings.repo.ts
│   ├── ai/
│   │   ├── summarizer.ts        # Calls LLM with transcript + notes, returns enhanced blocks
│   │   ├── chat.ts              # Handles CMD+J chat queries with context
│   │   ├── embeddings.ts        # Generates embeddings for transcript segments
│   │   ├── search.ts            # LanceDB semantic search across meetings
│   │   └── prompts/
│   │       ├── enhance.prompt.ts    # System prompt for note enhancement
│   │       ├── chat.prompt.ts       # System prompt for chat queries
│   │       └── templates/
│   │           ├── general.ts
│   │           ├── one-on-one.ts
│   │           ├── standup.ts
│   │           ├── sales-call.ts
│   │           ├── user-interview.ts
│   │           ├── customer-discovery.ts
│   │           ├── weekly-team.ts
│   │           └── investor-pitch.ts
│   ├── calendar/
│   │   ├── google.ts            # Google Calendar OAuth + event fetching
│   │   └── notifications.ts     # 1-minute-before meeting notifications
│   ├── share/
│   │   ├── server.ts            # Express server for share links (port 7842)
│   │   └── routes.ts            # GET /s/:shareId → returns note JSON
│   └── tray/
│       └── tray.ts              # Menu bar icon + tray menu
│
├── swift/                       # Native macOS audio capture helper
│   ├── AudioCapture/
│   │   ├── main.swift           # Entry point: captures system audio, writes WAV to stdout
│   │   ├── ScreenAudioCapture.swift  # ScreenCaptureKit wrapper
│   │   └── AudioChunker.swift   # Splits audio into 3-second WAV chunks
│   └── build.sh                 # Builds the Swift helper to ../resources/AudioCapture
│
├── resources/
│   ├── AudioCapture             # Compiled Swift binary (built from swift/)
│   ├── whisper/
│   │   └── models/
│   │       └── ggml-large-v3-turbo.bin   # Downloaded separately
│   ├── whisper-cpp              # Compiled whisper.cpp binary
│   ├── icon.icns                # macOS app icon
│   └── tray-icon.png            # Menu bar icon (22x22 template image)
│
├── src/                         # Renderer process (React)
│   ├── index.tsx                # React app entry
│   ├── App.tsx                  # Router setup
│   ├── styles/
│   │   └── globals.css          # Tailwind imports + custom CSS variables
│   ├── lib/
│   │   ├── utils.ts             # clsx/tailwind-merge helper + misc utilities
│   │   ├── ipc.ts               # Type-safe IPC caller wrappers
│   │   └── format.ts            # Date formatting, duration formatting
│   ├── store/
│   │   ├── meetings.store.ts    # Zustand: meetings list, current meeting
│   │   ├── recording.store.ts   # Zustand: recording state, transcript lines
│   │   ├── ui.store.ts          # Zustand: sidebar state, theme, panels
│   │   └── settings.store.ts    # Zustand: user settings
│   ├── types/
│   │   └── index.ts             # All TypeScript interfaces (Meeting, Note, etc.)
│   ├── pages/
│   │   ├── Home.tsx             # Meeting library + sidebar (main screen)
│   │   ├── MeetingView.tsx      # During-meeting + post-meeting view
│   │   ├── Settings.tsx         # Settings screen
│   │   └── SharedNote.tsx       # Web view for shared notes (minimal, no sidebar)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Left nav sidebar
│   │   │   ├── TopBar.tsx           # Top navigation bar
│   │   │   └── AppShell.tsx         # Main layout wrapper
│   │   ├── meeting/
│   │   │   ├── MeetingCard.tsx      # Meeting list item in library
│   │   │   ├── MeetingHeader.tsx    # Meeting title + controls bar
│   │   │   ├── RecordingBar.tsx     # Green dancing bars + stop/resume
│   │   │   └── AttendeeList.tsx     # Attendee chips display
│   │   ├── editor/
│   │   │   ├── NoteEditor.tsx       # Tiptap block editor wrapper
│   │   │   ├── NoteBlock.tsx        # Single note block (user=black, ai=gray)
│   │   │   ├── EnhanceButton.tsx    # "✨ Enhance Notes" button + loading state
│   │   │   └── TemplateSelector.tsx # Dropdown for template selection
│   │   ├── transcript/
│   │   │   ├── TranscriptPanel.tsx  # Scrollable live/past transcript
│   │   │   └── TranscriptLine.tsx   # Single line with speaker + timestamp
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx        # CMD+J slide-in chat panel
│   │   │   ├── ChatMessage.tsx      # Single AI or user message
│   │   │   └── ChatInput.tsx        # Input bar with scope selector
│   │   ├── sidebar/
│   │   │   ├── ComingUp.tsx         # Upcoming meetings list in sidebar
│   │   │   ├── PeopleView.tsx       # Contacts extracted from meetings
│   │   │   ├── CompaniesView.tsx    # Companies extracted from meetings
│   │   │   └── FolderList.tsx       # Folder hierarchy in sidebar
│   │   ├── share/
│   │   │   ├── ShareDialog.tsx      # Share modal with link options
│   │   │   └── ShareBadge.tsx       # Shared indicator on meeting card
│   │   └── ui/                  # Reusable design system components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Badge.tsx
│   │       └── DancingBars.tsx      # Green audio visualization
│
└── scripts/
    ├── setup.sh                 # One-command dev setup
    ├── download-whisper.sh      # Downloads whisper.cpp model
    └── build-swift.sh           # Builds Swift audio helper
```

---

## DATABASE SCHEMA (SQLite)

Use this exact schema. Run as migration `001_initial.sql`:

```sql
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  started_at INTEGER NOT NULL,   -- Unix timestamp ms
  ended_at INTEGER,
  calendar_event_id TEXT,
  folder_id TEXT,
  template_id TEXT DEFAULT 'general',
  share_id TEXT UNIQUE,
  share_mode TEXT DEFAULT 'private',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,
  text TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  segment_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS note_blocks (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL,
  block_type TEXT NOT NULL,      -- 'heading' | 'bullet' | 'paragraph'
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'ai'
  transcript_ref INTEGER,        -- segment_index for hyperlink
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_built_in INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#22C55E',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meetings_started_at ON meetings(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_meeting ON transcript_segments(meeting_id, segment_index);
CREATE INDEX IF NOT EXISTS idx_note_blocks_meeting ON note_blocks(meeting_id, block_order);
```

---

## EXACT COLOR & DESIGN TOKENS

Add these as CSS variables in `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-accent:        #22C55E;
  --color-accent-dark:   #16A34A;
  --color-user-text:     #111111;
  --color-ai-text:       #888888;
  --color-ai-text-hover: #555555;
  --color-bg:            #FFFFFF;
  --color-sidebar-bg:    #F7F7F5;
  --color-border:        #E5E5E5;
  --color-secondary:     #6B7280;
  --color-card-hover:    #F0F0ED;
  --font-ui:             'Inter', -apple-system, sans-serif;
  --font-display:        'Playfair Display', Georgia, serif;
  --sidebar-width:       220px;
  --topbar-height:       48px;
  --editor-max-width:    680px;
  --editor-padding:      48px;
}

.dark {
  --color-bg:            #1A1A1A;
  --color-sidebar-bg:    #141414;
  --color-border:        #2A2A2A;
  --color-user-text:     #EEEEEE;
  --color-secondary:     #9CA3AF;
  --color-card-hover:    #222222;
}
```

---

## AI API CONFIGURATION

All AI calls use the `openai` npm package. The baseURL and apiKey are swapped per model. Store all API keys in `electron-store` (encrypted local storage), never in code.

```typescript
// electron/ai/client.ts
import OpenAI from 'openai';
import { getSettings } from '../db/repositories/settings.repo';

export function getAIClient(): OpenAI {
  const settings = getSettings();

  // Try Gemini first (primary)
  if (settings.geminiApiKey) {
    return new OpenAI({
      apiKey: settings.geminiApiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }
  // Fallback 1: GLM-4.7-Flash
  if (settings.glmApiKey) {
    return new OpenAI({
      apiKey: settings.glmApiKey,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    });
  }
  // Fallback 2: Qwen
  if (settings.qwenApiKey) {
    return new OpenAI({
      apiKey: settings.qwenApiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    });
  }
  // Fallback 3: Groq
  if (settings.groqApiKey) {
    return new OpenAI({
      apiKey: settings.groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1/',
    });
  }
  throw new Error('No AI API key configured. Go to Settings to add one.');
}

export function getModel(settings: any): string {
  if (settings.geminiApiKey) return 'gemini-2.5-flash';
  if (settings.glmApiKey) return 'glm-4-flash';
  if (settings.qwenApiKey) return 'qwen-plus';
  return 'llama-3.3-70b-versatile'; // Groq
}
```

---

## AI PROMPT TEMPLATES (EXACT)

### Note Enhancement Prompt
```typescript
// electron/ai/prompts/enhance.prompt.ts
export function buildEnhancePrompt(
  transcript: string,
  userNotes: string,
  templatePrompt: string,
  attendees: string[]
): string {
  return `You are an AI meeting notes assistant. You have been given:
1. A raw meeting transcript
2. The user's hand-written notes from during the meeting
3. A template format to follow

Your job: enhance the user's notes by adding AI-generated content that fills in what they missed.

STRICT RULES:
- Return ONLY a JSON array of note blocks. No other text.
- Preserve ALL of the user's original notes exactly as written. Mark them source: "user".
- Add AI-generated content as separate blocks. Mark them source: "ai".
- Every ai block MUST include a transcript_ref (the segment_index from the transcript where this info appears).
- Do not invent information not present in the transcript.
- Be concise. No padding. No filler phrases.
- Follow the template format below.

ATTENDEES: ${attendees.join(', ') || 'Unknown'}

TEMPLATE FORMAT:
${templatePrompt}

USER'S NOTES:
${userNotes}

TRANSCRIPT (with segment indices):
${transcript}

Return JSON array:
[
  { "block_type": "heading", "content": "Section Title", "source": "user", "transcript_ref": null },
  { "block_type": "bullet", "content": "AI point here", "source": "ai", "transcript_ref": 14 },
  ...
]`;
}
```

### Template Prompts (Built-in)
```typescript
// electron/ai/prompts/templates/general.ts
export const generalTemplate = `
Produce these sections in order (only include sections with content):
### Key Points — 3-6 most important discussion topics
### Decisions — Explicit decisions made (format: "Decision: [what was decided]")
### Action Items — Tasks with owner names (format: "@Name: [task] by [deadline if mentioned]")
### Important Quotes — 1-3 verbatim notable statements with speaker label
### Follow-ups — Open questions or items to revisit
`;

// electron/ai/prompts/templates/one-on-one.ts
export const oneOnOneTemplate = `
Produce these sections:
### Discussion Topics — Main topics covered
### Commitments — What each person committed to doing
### Decisions — Any decisions made
### Growth / Feedback — Any feedback, coaching, or career topics discussed
### Action Items — Tasks with owners and deadlines
`;

// electron/ai/prompts/templates/standup.ts
export const standupTemplate = `
Produce these sections per person who spoke:
### [Person Name]
- Progress: what they completed
- Plan: what they're working on today
- Blockers: any blockers mentioned
### Team Action Items — Any shared actions
`;

// Add similar for: salesCall, userInterview, customerDiscovery, weeklyTeam, investorPitch
```

### Chat Query Prompt
```typescript
// electron/ai/prompts/chat.prompt.ts
export function buildChatPrompt(
  scope: 'meeting' | 'all' | 'folder',
  context: string,  // transcript + notes text, or multiple meetings
  userQuestion: string
): string {
  return `You are an AI assistant for meeting notes. Answer the user's question based ONLY on the meeting content provided.

RULES:
- Be concise and direct.
- Always cite sources using [segment_index] notation when referencing specific transcript moments.
- If the answer is not in the provided content, say so clearly.
- Never make up information.

MEETING CONTENT:
${context}

USER QUESTION: ${userQuestion}

Answer:`;
}
```

---

## BUILD PHASES (EXECUTE IN ORDER)

Complete each phase fully and commit before starting the next.

---

### ✅ PHASE 1 — Project Scaffold [COMPLETE] & Database
**Goal**: Running Electron app with SQLite database connected.

1. Initialize project with `npx create-electron-app noteflow --template=webpack-typescript`
2. Install all dependencies from the list above
3. Configure TypeScript strict mode in both tsconfig files
4. Configure Tailwind CSS with the custom design tokens above
5. Create the complete file structure (empty files are fine, they get filled in later phases)
6. Implement `electron/db/database.ts` — opens SQLite, runs all migrations in order
7. Implement `001_initial.sql` migration
8. Implement all repository files (`meetings.repo.ts`, `notes.repo.ts`, etc.) with full CRUD operations
9. Implement `electron/main.ts` — creates BrowserWindow (1100x700, min 800x560), loads renderer, sets up IPC
10. Implement `electron/preload.ts` — exposes all IPC channels via contextBridge
11. Implement `src/App.tsx` with React Router routes: `/` (Home), `/meeting/:id` (MeetingView), `/settings` (Settings)
12. Implement `src/styles/globals.css` with all CSS variables
13. Test: `npm start` should open a blank Electron window without errors

**Commit message**: `Phase 1: Project scaffold, SQLite database, Electron shell`

---

### PHASE 2 — Meeting Library UI (Home Screen)
**Goal**: Full home screen with sidebar, meeting list, and coming up section (no real data yet, use mocks).

1. Implement `src/components/layout/AppShell.tsx` — two-column layout (sidebar + main content)
2. Implement `src/components/layout/Sidebar.tsx`:
   - Logo / app name at top
   - Nav items: Coming Up, Past Meetings, People, Companies, Folders
   - Active state with green accent
   - Workspace name at bottom
3. Implement `src/components/layout/TopBar.tsx`:
   - Search bar (centered, 400px wide)
   - `+` new meeting button (green, right side)
   - Settings gear icon (right side)
4. Implement `src/pages/Home.tsx`:
   - Coming Up section: cards showing next 5 meetings, "Show more" link
   - Past Meetings section: scrollable list of meeting cards
5. Implement `src/components/meeting/MeetingCard.tsx`:
   - Meeting title (Inter Semibold 15px)
   - Date + time (secondary text)
   - Attendee count with person icon
   - Brief note preview (2 lines, gray text, ellipsis overflow)
   - Hover: background changes to `--color-card-hover`
   - Click: navigate to `/meeting/:id`
6. Implement `src/components/sidebar/ComingUp.tsx` with mock upcoming meetings
7. Implement `src/store/meetings.store.ts` with Zustand
8. Wire up IPC: `meetings.ipc.ts` handlers for `meetings:list`, `meetings:create`, `meetings:get`
9. Load real meetings from DB on home screen mount

**Commit message**: `Phase 2: Meeting library home screen UI`

---

### ✅ PHASE 3 — Swift Audio Capture Helper [COMPLETE]
**Status**: DONE — all files implemented, TypeScript typechecks pass.
**Goal**: Electron can spawn the Swift helper and receive PCM audio chunks.

**What was implemented** (by Claude, March 2026):
- `swift/AudioCapture/ScreenAudioCapture.swift` — Full SCStream implementation capturing 48kHz stereo system audio
- `swift/AudioCapture/AudioChunker.swift` — AVAudioConverter resampling 48kHz stereo → 16kHz mono, 3s chunk accumulation
- `swift/AudioCapture/main.swift` — Entry point, stdin/SIGTERM shutdown, stdout PCM stream
- `swift/AudioCapture.entitlements` — com.apple.security.screen-capture entitlement for ad-hoc signing
- `electron/audio/capture.ts` — AudioCapture class: spawns binary, reads fixed 192000-byte chunks from stdout, emits audioChunk events
- `electron/ipc/audio.ipc.ts` — IPC handlers: audio:start, audio:stop, audio:status; forwards chunk metadata to renderer
- `electron/main.ts` — Updated to register audio IPC handlers with mainWindow reference
- `electron/preload.ts` — Exposes window.noteflow.audio (start, stop, status, onChunk, onError, onStopped, removeAllListeners)
- `src/types/index.ts` — AudioChunkInfo, AudioStatusResult, AudioStartResult types added
- `scripts/build-swift.sh` — Compiles Swift binary to resources/AudioCapture with ad-hoc codesigning

**To build the Swift binary** (do this before testing Phase 3):
```bash
cd ~/Downloads/Granola_bar/noteflow
npm run build:swift
```

**Chunk format**: Raw IEEE 754 float32 LE PCM, 16kHz mono, exactly 192,000 bytes (3 seconds)
**IPC flow**: renderer calls audio:start(meetingId) → main spawns Swift binary → stdout PCM → AudioCapture emits audioChunk → IPC sends metadata to renderer

1. Create `swift/AudioCapture/main.swift`:
   ```swift
   // Entry point: set up ScreenCaptureKit capture, write raw PCM to stdout
   // Use SCStreamConfiguration to capture system audio only (no video)
   // Write audio as 32-bit float PCM, 16kHz sample rate, mono
   // Write 3-second chunks separated by a delimiter byte sequence
   ```
2. Create `swift/AudioCapture/ScreenAudioCapture.swift`:
   - Uses `SCShareableContent.getExcludingDesktopWindows` to get audio stream
   - Implements `SCStreamOutput` delegate to receive audio sample buffers
   - Converts CMSampleBuffer to raw PCM bytes
3. Create `swift/build.sh`:
   ```bash
   #!/bin/bash
   swiftc swift/AudioCapture/*.swift -o resources/AudioCapture -framework ScreenCaptureKit -framework CoreMedia -framework AVFoundation
   echo "Built successfully"
   ```
4. Create `electron/audio/capture.ts`:
   - Spawns `resources/AudioCapture` as child process
   - Reads stdout pipe, buffers until delimiter
   - Emits `audioChunk` event with Buffer containing 3-second WAV data
   - Handles process exit / restart on failure
5. Test by running capture.ts in isolation and saving chunks to disk, verify they're valid WAV

**Commit message**: `Phase 3: Swift ScreenCaptureKit audio capture helper`

---

### PHASE 4 — Whisper Transcription Pipeline
**Goal**: Audio chunks fed to whisper.cpp, transcript lines emitted in real-time.

1. Download whisper.cpp and compile it. Add binary to `resources/whisper-cpp`.
2. Create `electron/audio/vad.ts`:
   - Calculates RMS energy of PCM buffer
   - Returns `true` if chunk contains speech (RMS > threshold 0.01)
   - Skips silent chunks to avoid wasting Whisper calls
3. Create `electron/audio/transcriber.ts`:
   - Receives WAV chunks from capture.ts via event
   - Filters through VAD
   - For each speech chunk: writes to temp file, spawns `resources/whisper-cpp` with args:
     ```
     -m resources/whisper/models/ggml-large-v3-turbo.bin
     -f /tmp/chunk_N.wav
     --output-json
     --no-prints
     --threads 4
     ```
   - Parses JSON output, extracts text and timestamps
   - Emits `transcriptLine` event with `{ text, startMs, endMs, speakerLabel }`
   - Runs max 2 concurrent Whisper processes (queue additional chunks)
4. Wire `transcriptLine` events to IPC → renderer via `webContents.send('transcript:line', data)`
5. Create `electron/ipc/audio.ipc.ts`:
   - `audio:start` — starts capture + transcription, creates new meeting record
   - `audio:stop` — stops capture, finalizes meeting endedAt
   - `audio:pause` / `audio:resume`
6. Test: start recording while playing YouTube audio, transcript lines should appear

**Commit message**: `Phase 4: whisper.cpp transcription pipeline`

---

### PHASE 5 — Note Editor & Meeting View UI
**Goal**: Full meeting view with live transcript panel and Tiptap block editor.

1. Implement `src/pages/MeetingView.tsx`:
   - Two modes determined by `meeting.endedAt`: **live** (during meeting) and **review** (post-meeting)
   - Live mode: two-column layout — editor left (65%), transcript right (35%)
   - Review mode: single column editor, transcript as toggleable right panel
2. Implement `src/components/editor/NoteEditor.tsx`:
   - Tiptap editor with extensions: StarterKit, Heading (levels 1-3), BulletList, Placeholder
   - Placeholder text: "Type your notes here... Use ### for section headers"
   - All content user types is stored with `source: "user"` in DB
   - AI blocks rendered with gray color using a custom Tiptap extension or inline style
   - Auto-save: debounce 2 seconds, call `notes:save` IPC
3. Implement `src/components/transcript/TranscriptPanel.tsx`:
   - Scrollable list of `TranscriptLine` components
   - Auto-scrolls to bottom as new lines arrive during live mode
   - In review mode: numbered lines, clicking number from notes highlights that line
4. Implement `src/components/transcript/TranscriptLine.tsx`:
   - Speaker label (bold, green accent) + timestamp + text
   - Highlighted state (yellow-tinted background) when referenced from notes
5. Implement `src/components/meeting/RecordingBar.tsx`:
   - Fixed at bottom of meeting view during live mode
   - `DancingBars` component on left (green, 5 bars, animated to pulse)
   - "Recording system audio" text + timer (MM:SS format)
   - Stop button (red) + Pause button (gray)
6. Implement `src/components/ui/DancingBars.tsx`:
   - 5 vertical green bars
   - CSS animation: each bar animates height from 4px to 20px with different delays
   - When paused: all bars at minimum height, no animation
7. Implement `src/components/meeting/MeetingHeader.tsx`:
   - Back arrow, meeting title (editable on click), date/time
   - Template selector dropdown (right side, visible post-meeting)
   - Share button (right side)
   - Transcript toggle button

**Commit message**: `Phase 5: Meeting view UI, Tiptap editor, transcript panel`

---

### PHASE 6 — AI Enhancement Engine
**Goal**: "Enhance Notes" button calls AI, populates gray blocks with transcript citations.

1. Implement `electron/ai/client.ts` (exact code from AI API CONFIGURATION section above)
2. Implement `electron/ai/summarizer.ts`:
   - Takes `meetingId` as input
   - Fetches all transcript segments from DB
   - Fetches all user note blocks from DB
   - Formats transcript with segment indices: `[42] Speaker 1 (02:14): "text here"`
   - Formats user notes as plain text
   - Selects template prompt based on `meeting.templateId`
   - Calls `getAIClient().chat.completions.create()` with `buildEnhancePrompt()`
   - Parses JSON response
   - Saves returned AI blocks to DB with `source: 'ai'` and `transcript_ref`
   - Returns array of new blocks to renderer
3. Implement all 8 template prompt files in `electron/ai/prompts/templates/`
4. Implement `electron/ipc/ai.ipc.ts`:
   - `ai:enhance` — runs summarizer for a meeting, returns all blocks (user + ai merged)
   - `ai:chat` — handles chat query (Phase 8)
   - `ai:regenerate` — re-runs with different template
5. Implement `src/components/editor/EnhanceButton.tsx`:
   - Shows "✨ Enhance Notes" when not yet enhanced
   - Loading state: pulsing animation + "Enhancing..."
   - After enhance: changes to "✨ Re-enhance" with template selector
6. In `NoteEditor.tsx`: render AI blocks in gray (`color: var(--color-ai-text)`), user blocks in black
7. AI block gray text must be clickable — clicking transcript_ref number scrolls transcript panel to that segment

**Commit message**: `Phase 6: AI note enhancement with Gemini 2.5 Flash`

---

### PHASE 7 — Google Calendar Integration
**Goal**: Upcoming meetings from Google Calendar appear in sidebar and trigger notifications.

1. Set up Google Cloud Project with Calendar API enabled, OAuth 2.0 client (Desktop app type)
2. Implement `electron/calendar/google.ts`:
   - OAuth flow: open browser to Google consent, capture redirect with Electron protocol handler
   - Store refresh token in `electron-store` (encrypted)
   - `getUpcomingEvents()`: fetches next 7 days of calendar events, returns array of `CalendarEvent`
   - `CalendarEvent` includes: id, title, startTime, endTime, attendees[], meetingLink (Zoom/Meet URL if present)
   - Refresh calendar every 5 minutes
3. Implement `electron/calendar/notifications.ts`:
   - Runs a cron job every minute (`node-cron`)
   - Checks upcoming events for any starting in 1-2 minutes
   - Fires Electron notification with meeting title + "Starting in 1 minute"
   - Notification click opens NoteFlow and creates/opens note for that meeting
4. Implement `electron/ipc/calendar.ipc.ts`:
   - `calendar:auth` — starts OAuth flow
   - `calendar:getUpcoming` — returns upcoming events
   - `calendar:isConnected` — returns bool
5. In `ComingUp.tsx`: call `calendar:getUpcoming` on mount, display events with:
   - Meeting title + time + attendee count
   - Platform icon (Zoom/Meet/Teams logo) if detected in meeting link
   - Click: creates meeting record in DB (if not exists) + navigates to MeetingView
6. In Settings: show calendar connection status, connect/disconnect button

**Commit message**: `Phase 7: Google Calendar integration + meeting notifications`

---

### PHASE 8 — Chat (CMD+J) Feature
**Goal**: CMD+J opens chat panel; user can query current meeting or all meetings.

1. Implement `electron/ai/embeddings.ts`:
   - After a meeting is enhanced, generate embeddings for each transcript segment
   - Use Gemini embedding API or a local embedding model (all-minilm via onnxruntime-node)
   - Store embeddings in LanceDB table `transcript_embeddings`
2. Implement `electron/ai/search.ts`:
   - `semanticSearch(query, scope)` — converts query to embedding, searches LanceDB
   - Returns top 10 relevant transcript segments with their meeting context
3. Implement `electron/ai/chat.ts`:
   - For `scope: 'meeting'`: uses full transcript + notes as context
   - For `scope: 'all'`: uses semantic search results as context
   - Calls LLM with `buildChatPrompt()`, returns response text + cited segment indices
4. Implement `electron/ipc/ai.ipc.ts` `ai:chat` handler
5. Implement `src/components/chat/ChatPanel.tsx`:
   - Fixed panel, slides in from right (or bottom) when CMD+J pressed
   - Scope selector at top: "This meeting" | "All meetings" | "Folder"
   - Scrollable message list above
   - Input bar at bottom with send button
   - Press Escape or CMD+J again to close
6. Implement `src/components/chat/ChatMessage.tsx`:
   - User messages: right-aligned, green background
   - AI responses: left-aligned, white/gray background
   - Inline citation numbers `[2]` are clickable → scroll transcript to that segment
7. Register CMD+J global keyboard shortcut in `electron/main.ts`
8. ChatPanel visible on MeetingView and Home (home chat queries all meetings)

**Commit message**: `Phase 8: CMD+J AI chat with transcript citations and cross-meeting search`

---

### PHASE 9 — Sharing System
**Goal**: Generate share link; share page shows notes + chat for recipients.

1. Implement `electron/share/server.ts`:
   - Express server on port 7842 (started when app starts)
   - `GET /s/:shareId` → returns JSON: `{ meeting, noteBlocks, attendees }`
   - Only returns meetings where `share_mode = 'public'`
2. Implement `electron/share/routes.ts` with the route handler
3. Implement `electron/ipc/share.ipc.ts`:
   - `share:create` — generates UUID shareId, sets `share_mode: 'public'`, saves shareId to DB
   - `share:revoke` — sets `share_mode: 'private'`, clears shareId
   - `share:getLink` — returns `http://localhost:7842/s/${shareId}`
4. Implement `src/components/share/ShareDialog.tsx`:
   - Modal opened by Share button in MeetingHeader
   - Toggle: Anyone with link / Private
   - Shows generated link in text box with Copy button
   - Status indicator
5. Implement `src/pages/SharedNote.tsx`:
   - Standalone React page served at `/shared` route
   - Fetches note data from share server
   - Renders note blocks (gray/black) without sidebar
   - Right-side chat panel for recipient queries
   - Chat calls local share server which proxies to AI
6. Add `SharedNote` route to React Router

**Commit message**: `Phase 9: Sharing system with public link + recipient chat`

---

### PHASE 10 — Menu Bar, People/Companies Views, Export, Settings UI
**Goal**: Polish and complete all remaining features.

1. Implement `electron/tray/tray.ts`:
   - Creates system tray icon from `resources/tray-icon.png`
   - Tray menu: "Open NoteFlow" | "Start New Recording" | "Coming Up: [next meeting]" | "Quit"
   - When recording: tray icon shows green dot (swap icon to `tray-icon-active.png`)
2. Implement `src/components/sidebar/PeopleView.tsx`:
   - Query DB: `SELECT DISTINCT name, email FROM attendees ORDER BY count DESC`
   - Show contact name + meeting count
   - Click: filter meeting list to meetings with that person
3. Implement `src/components/sidebar/CompaniesView.tsx`:
   - Extract domain from attendee emails, group by company domain
   - Show company name + meeting count
4. Implement `src/components/sidebar/FolderList.tsx`:
   - List folders from DB
   - "+" button to create new folder (inline rename)
   - Click: filter meeting list to folder meetings
   - Allow drag-and-drop of meetings to folders (react-dnd or HTML5 drag)
5. Implement `src/pages/Settings.tsx` with tabs:
   - **General**: theme toggle (light/dark/system), app launch on login toggle
   - **Calendars**: Google Calendar connect/disconnect, calendar checkboxes
   - **AI**: API key inputs for Gemini, GLM, Qwen, Groq — show which is active
   - **Transcription**: Whisper local vs Deepgram toggle, language selector
   - **Templates**: list custom templates, add/edit/delete
   - **Sharing**: default share mode selector
   - **Integrations**: Slack webhook URL, Notion token
   - **Privacy**: data retention settings, delete all data button
6. Implement export from meeting overflow menu (⋯ button):
   - **Copy as Markdown**: formats blocks as markdown, copies to clipboard
   - **Export .md file**: saves to Downloads folder
   - **Export .txt**: plain text
   - **Send to Slack**: POST to configured webhook URL with formatted summary
7. Implement dark mode: toggle `dark` class on `document.documentElement`, persist in settings

**Commit message**: `Phase 10: Menu bar, people/companies views, export, settings — feature complete`

---

### PHASE 11 — Polish, Error States & Production Build
**Goal**: Production-ready build with proper error handling.

1. Add error boundaries to all major React components
2. Add loading states: skeleton screens for meeting list, loading spinner for AI operations
3. Add empty states: no meetings yet, no calendar connected, no API key set
4. Handle offline/no-internet gracefully (local Whisper always works; AI features show error)
5. Add first-run onboarding flow:
   - Step 1: Welcome screen explaining what NoteFlow does
   - Step 2: Connect Google Calendar (skip option)
   - Step 3: Add Gemini API key (with link to AI Studio)
   - Step 4: Download Whisper model (progress bar)
6. Implement `scripts/download-whisper.sh` for model download
7. Implement `scripts/setup.sh` for one-command dev setup
8. Configure `electron-builder.yml` for macOS DMG output (Apple Silicon + Intel universal binary)
9. Test on both Apple Silicon and Intel Mac if possible
10. Final audit: check all Phase success criteria from PRD

**Commit message**: `Phase 11: Polish, onboarding, error states, production build`

---

## NAMING CONVENTIONS (FOLLOW EXACTLY)

- **React components**: PascalCase, `.tsx` extension
- **TypeScript utility files**: camelCase, `.ts` extension
- **IPC channel names**: `domain:action` format (e.g., `meetings:list`, `ai:enhance`)
- **Zustand stores**: `use[Name]Store` convention in store files
- **Database columns**: `snake_case`
- **TypeScript interfaces**: PascalCase, defined in `src/types/index.ts`
- **CSS classes**: Tailwind utilities only, no custom class names except design tokens

---

## IPC CHANNEL REFERENCE (COMPLETE LIST)

All channels must be declared in `preload.ts` contextBridge before use:

```
meetings:list         → returns Meeting[]
meetings:create       → takes Partial<Meeting>, returns Meeting
meetings:get          → takes id: string, returns Meeting
meetings:update       → takes {id, ...fields}, returns Meeting
meetings:delete       → takes id: string, returns void
meetings:search       → takes query: string, returns Meeting[]

notes:save            → takes {meetingId, blocks: NoteBlock[]}, returns void
notes:get             → takes meetingId: string, returns NoteBlock[]

transcript:list       → takes meetingId: string, returns TranscriptSegment[]
transcript:line       → (event from main → renderer) new transcript line during recording

audio:start           → takes meetingId: string, returns void
audio:stop            → returns void
audio:pause           → returns void
audio:resume          → returns void

ai:enhance            → takes {meetingId, templateId}, returns NoteBlock[]
ai:chat               → takes {meetingId?, scope, question}, returns {text, citations}
ai:regenerate         → takes {meetingId, templateId}, returns NoteBlock[]

calendar:auth         → returns void (opens browser)
calendar:getUpcoming  → returns CalendarEvent[]
calendar:isConnected  → returns boolean

share:create          → takes meetingId: string, returns {shareId, url}
share:revoke          → takes meetingId: string, returns void
share:getLink         → takes meetingId: string, returns string | null

settings:get          → returns Settings
settings:set          → takes Partial<Settings>, returns void

folders:list          → returns Folder[]
folders:create        → takes {name, color}, returns Folder
folders:delete        → takes id: string, returns void

export:markdown       → takes meetingId: string, returns string (markdown text)
export:file           → takes {meetingId, format}, returns void (saves to Downloads)
export:slack          → takes meetingId: string, returns void
```

---

## WHEN STARTING A NEW SESSION

If you are an AI agent reading this at the start of a new work session, do the following before writing any code:

1. Run `ls noteflow/` to see what exists already
2. Run `git log --oneline -10` to see what phases are complete
3. Read the last 2 committed files to understand current code style
4. Identify the next incomplete phase from the BUILD PHASES section
5. Start that phase — complete it fully before moving to the next

Never skip phases. Never start Phase 6 if Phase 5 is incomplete. The phases are ordered to minimize dependency issues.

---

## QUICK REFERENCE — WHAT EACH FILE DOES

| File | Purpose |
|------|---------|
| `electron/main.ts` | Creates Electron window, sets up all IPC handlers, starts tray |
| `electron/preload.ts` | Exposes `window.api` to renderer via contextBridge |
| `electron/audio/capture.ts` | Spawns Swift binary, receives audio chunks |
| `electron/audio/transcriber.ts` | Feeds chunks to whisper.cpp, emits transcript lines |
| `electron/ai/summarizer.ts` | Calls Gemini/GLM to enhance notes post-meeting |
| `electron/ai/chat.ts` | Handles CMD+J queries using transcript context |
| `electron/db/database.ts` | Opens SQLite, runs migrations |
| `electron/calendar/google.ts` | Google Calendar OAuth + event fetching |
| `electron/share/server.ts` | Local Express server for share links |
| `src/pages/Home.tsx` | Meeting library screen |
| `src/pages/MeetingView.tsx` | During-meeting + post-meeting notes view |
| `src/components/editor/NoteEditor.tsx` | Tiptap block editor (black=user, gray=ai) |
| `src/components/transcript/TranscriptPanel.tsx` | Live/historical transcript display |
| `src/components/chat/ChatPanel.tsx` | CMD+J AI chat slide-in panel |
| `src/store/recording.store.ts` | Recording state (active, paused, transcript lines) |

---

*This document is the single source of truth. When in doubt, refer back here. Do not improvise architecture. Execute the plan.*
