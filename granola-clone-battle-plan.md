# Granola Clone — Full Battle Plan
### Free AI Meeting Notes App (Mac-first, then iPhone)
*Last updated: March 2026 — v2 (tool stack updated for Antigravity + VS Code + Google AI Pro)*

---

## What We're Building

A free, privacy-first AI meeting notes app that replicates every core Granola feature:

- **System audio capture** (no bot joins your call — works with Zoom, Meet, Teams, anything)
- **Real-time transcription** during meetings
- **AI-powered summaries** with key points, decisions, and action items
- **Hybrid note-taking** (your typed notes + AI enhancement merged together)
- **Custom templates** for different meeting types
- **Cross-meeting search** ("What did we decide about pricing last quarter?")
- **Calendar integration** with auto-detection of upcoming meetings
- **One-click sharing** of notes (recipients can query the meeting via chat)
- **Export to Slack, Notion, etc.**

---

## The Tech Stack (100% Free)

### Audio Capture
**ScreenCaptureKit** (built into macOS 13+) — this is exactly what Granola uses under the hood. Captures system audio directly from your device, no bot needed. Works with every meeting app.

Fallback/alternative: **BlackHole** (open-source virtual audio driver, zero latency, Apple Silicon compatible).

### Transcription — Two Options

| Option | Cost | Quality | Latency | Privacy |
|--------|------|---------|---------|---------|
| **OpenAI Whisper (local)** | $0 forever | Excellent (large-v3-turbo) | ~2-5s chunks | Audio never leaves your Mac |
| **Deepgram API** | $0 for first ~350 hours ($200 free credits) | Best-in-class real-time | Sub-second streaming | Cloud-based |

**Recommendation**: Start with **Whisper local** for zero cost and full privacy. Use Deepgram as an optional upgrade for users who want faster real-time streaming.

For the interview assistant project you mentioned — if you were using **faster-whisper** or **whisper.cpp**, those are the same Whisper models optimized for speed. We'll use **whisper.cpp** (C++ port, runs blazing fast on Apple Silicon via CoreML/Metal).

### AI Summarization — Free LLM APIs

> ⭐ **Key unlock**: Your Google AI Pro student plan almost certainly includes Gemini API access via Google AI Studio. This changes everything — Gemini 2.5 Flash is significantly better than GLM for meeting summarization AND it's free at high limits. Check https://aistudio.google.com → you should see generous free quota.

| Model | Cost | Limits | Quality | Why use it |
|-------|------|--------|---------|------------|
| **Gemini 2.5 Flash** (Google AI Studio) | $0 | Very high (student pro) | Best-in-class | Your primary — you already have access |
| **Gemini 2.5 Pro** (Google AI Studio) | $0 (limited) | Lower limits | Excellent | For complex summarizations |
| **GLM-4.7-Flash** (Zhipu AI) | $0 | No rate limits | Strong | Fallback #1 if Gemini quota runs out |
| **Qwen** (Alibaba) | $0 | 1,000 calls/day | Very good | Fallback #2 |
| **Groq** (Llama/Mixtral) | $0 | 1,000 req/day, 6K tokens/min | Fast | Fallback #3 |

**Recommendation**: **Gemini 2.5 Flash as primary** via Google AI Studio API (you already have this through your student plan). It's OpenAI-compatible format so swapping between models is a one-line config change. GLM and Qwen as automatic fallbacks.

**Big advantage**: Gemini understands Google Calendar, Google Meet, Google Workspace natively — which is huge for Phase 4 (Calendar Integration).

### App Framework — The Big Decision

Here's where it gets interesting. You have several paths:

---

## Path Analysis: Which Route Do We Take?

### PATH A: Electron + TypeScript ✅ RECOMMENDED
**Vibe code with: Antigravity (Gemini Pro) + VS Code + Copilot + Claude Code**

- Pros: Massive training data for all your AI assistants, cross-platform from day one, web tech (React for UI), proven pattern (VS Code, Slack, Discord are all Electron)
- Cons: ~250MB bundle, higher memory usage, less "native" feel
- Time to MVP: **2-3 weeks** with vibe coding
- Best tools: **Antigravity** for agentic multi-file tasks + **Copilot** inline in VS Code + **Claude Code** for complex audio/AI logic

### PATH B: Tauri + TypeScript + Rust
**Vibe code with: Antigravity + Claude Code**

- Pros: 10MB bundle (vs 250MB Electron), 28MB RAM (vs 250MB), native WebKit rendering, feels more like a real Mac app
- Cons: Rust backend needed for native integrations (audio capture), slightly less AI training data
- Time to MVP: **3-4 weeks** with vibe coding
- Best tools: **Antigravity** + **Claude Code** (both handle Rust reasonably well)

### PATH C: SwiftUI Native Mac App
**Vibe code with: Antigravity + Xcode + Copilot**

- Pros: Truly native, tiny footprint, best macOS integration, direct ScreenCaptureKit access, can share code with iOS version later
- Cons: Swift 6 concurrency is strict (more AI coding errors), smaller training dataset for LLMs
- Time to MVP: **4-6 weeks** with vibe coding
- Best tools: **Antigravity** with Swift + **Jules** for background refactoring

### PATH D: Web App (Bolt.new / Lovable) + Native Audio Helper
**Vibe code with: Bolt.new / Lovable for UI, Claude Code for audio helper**

- Pros: Fastest UI development, beautiful out of the box, zero config deployment
- Cons: Can't capture system audio from a web app — need a tiny native helper app anyway
- Time to MVP: **1-2 weeks for UI**, then need native helper which adds complexity
- Best tools: **Bolt.new** (300K tokens/day free) for the web UI

### PATH E: Rork / React Native (iPhone-first)
**Vibe code with: Rork AI**

- Pros: Get an iPhone app fast, React Native cross-platform
- Cons: Audio capture is severely limited on iOS (Apple restrictions), would only work for in-person meetings (mic-based, not system audio)
- Time to MVP: **1-2 weeks** but very limited functionality
- Best tools: **Rork** (35 credits/month free)

---

## My Recommendation: PATH A (Electron) → then PATH E (iPhone later)

Here's why:

1. **Mac is where the magic happens.** System audio capture is the killer feature. You can't do this properly on iPhone (Apple locks down system audio). Granola's iPhone app only does mic-based recording for in-person meetings — it's a companion, not the main product.

2. **Electron + TypeScript is the perfect sweet spot for your tool stack.** Antigravity (Gemini Pro), Copilot, and Claude Code all have enormous training data for TypeScript/React/Electron. You'll get the least friction here.

3. **Your Google AI Pro plan is a massive unlock.** Gemini 2.5 Flash for summarization is genuinely excellent, and you likely already have API access through AI Studio. This replaces the need for GLM/Qwen as primary models.

4. **Antigravity + VS Code is a better workflow than Cursor for this project** because you get the best of both worlds: Antigravity handles complex multi-file agentic tasks (generating whole features, refactoring across files) while Copilot handles fast inline completions as you type in VS Code. They're complementary, not redundant.

5. **Cross-platform bonus**: Same codebase can run on Windows later with zero extra work.

6. **iPhone version later**: Once the Mac app works, build a companion iPhone app with Rork or React Native that handles in-person meeting capture via microphone.

---

## Development Phases

### PHASE 1: Core Audio Engine (Week 1)
**Tools: Claude Code + Antigravity**

Build the audio capture + transcription pipeline:

1. Create an Electron app shell with a basic window
2. Build a native Node.js addon (or use node-ffi) to access ScreenCaptureKit for system audio capture
3. Pipe captured audio to whisper.cpp running locally (use whisper-node or whisper.cpp WebAssembly bindings)
4. Display raw transcript in real-time in the Electron window
5. Test with a Zoom/Meet call to verify it captures both sides of the conversation

Key files/modules:
- `src/audio/capture.ts` — ScreenCaptureKit bridge
- `src/audio/transcriber.ts` — Whisper integration
- `src/audio/stream.ts` — Audio stream processing (chunking, VAD)

**Alternative approach**: Use the open-source **Recap** app (github.com/RecapAI/Recap) as a reference implementation — it already does macOS system audio capture + WhisperKit transcription in SwiftUI. Study its audio pipeline code.

### PHASE 2: AI Summarization Engine (Week 1-2)
**Tools: Claude Code + Antigravity + Copilot**

Build the post-meeting AI processing:

1. Set up **Gemini 2.5 Flash** API client via Google AI Studio (you have this through Google AI Pro student plan) — it's OpenAI-compatible so the client code is identical
2. Build prompt templates for different summary types:
   - Key points extraction
   - Action items with assignees and deadlines
   - Decisions made
   - Follow-up questions
3. Build the "hybrid notes" system — merge user's typed notes with AI-generated summaries
4. Implement custom meeting templates (user interviews, 1:1s, standups, etc.)

Key files/modules:
- `src/ai/summarizer.ts` — LLM API client with fallback chain (Gemini 2.5 Flash → GLM → Qwen → Groq)
- `src/ai/templates.ts` — Meeting note templates
- `src/ai/merger.ts` — Merge user notes with AI summaries
- `src/ai/prompts/` — Prompt templates for each summary type

### PHASE 3: Beautiful UI (Week 2-3)
**Tools: Bolt.new for prototyping → Antigravity + VS Code for integration**

Build the Granola-like interface:

1. **Pre-meeting view**: Calendar sidebar showing upcoming meetings, one-click start
2. **During-meeting view**: Split pane — live transcript on left, note-taking area on right (Notion-style block editor)
3. **Post-meeting view**: Enhanced notes with black (your notes) and gray (AI additions), clickable transcript links, action items panel
4. **Meeting library**: Searchable list of all past meetings with AI-powered search
5. **Settings**: API keys, template management, calendar connection

Use **tiptap** (free, open-source) for the Notion-style editor. It's the same editor framework many note apps use.

UI framework: **React + Tailwind CSS + shadcn/ui** inside Electron.

### PHASE 4: Calendar Integration (Week 3)
**Tools: Claude Code**

1. Google Calendar OAuth integration (detect upcoming meetings)
2. System notifications 1 minute before meetings with 2+ attendees
3. Auto-start transcription when user clicks the notification
4. Meeting metadata extraction (attendees, title, duration)

### PHASE 5: Search & Chat (Week 3-4)
**Tools: Claude Code + Antigravity + Copilot**

1. Full-text search across all meeting transcripts and notes
2. "Chat with your meetings" — ask questions about specific meetings or across all meetings
3. Use Gemini 2.5 Flash for natural language querying over transcript embeddings
4. Local vector database (use **LanceDB** — embedded, free, no server needed) for semantic search

### PHASE 6: Sharing & Export (Week 4)
**Tools: Claude Code**

1. Generate shareable web links for meeting notes
2. Recipients can view notes + chat with the meeting AI
3. Export to Markdown, Notion, Slack webhook
4. One-click follow-up email generation

### PHASE 7: iPhone Companion App (Week 5-6)
**Tools: Rork + Claude Code**

1. Mic-based recording for in-person meetings (place phone on table)
2. Sync with Mac app's meeting library
3. View and search past meeting notes
4. Push notifications for upcoming meetings

---

## Project Structure

```
granola-clone/
├── electron/                    # Electron main process
│   ├── main.ts                 # App entry, window management
│   ├── audio/
│   │   ├── capture.ts          # ScreenCaptureKit bridge
│   │   ├── transcriber.ts      # Whisper.cpp integration
│   │   └── vad.ts              # Voice Activity Detection
│   ├── calendar/
│   │   └── google.ts           # Google Calendar OAuth
│   └── notifications.ts        # System notifications
├── src/                        # React frontend (renderer)
│   ├── components/
│   │   ├── MeetingView.tsx     # During-meeting UI
│   │   ├── NotesEditor.tsx     # Tiptap block editor
│   │   ├── TranscriptPanel.tsx # Live transcript display
│   │   ├── MeetingLibrary.tsx  # Past meetings list
│   │   ├── SearchBar.tsx       # Cross-meeting search
│   │   └── ChatPanel.tsx       # Chat with meeting AI
│   ├── ai/
│   │   ├── summarizer.ts       # GLM/Qwen API client
│   │   ├── merger.ts           # Merge user + AI notes
│   │   ├── templates.ts        # Meeting templates
│   │   └── search.ts           # Semantic search (LanceDB)
│   ├── store/                  # State management
│   │   ├── meetings.ts         # Meeting data store
│   │   └── settings.ts         # User preferences
│   └── App.tsx
├── native/                     # Native macOS modules
│   └── screencapture/          # ScreenCaptureKit addon
├── share-server/               # Lightweight sharing server
│   └── index.ts                # Express server for shared notes
├── whisper/                    # Whisper.cpp binaries
│   └── models/                 # Downloaded Whisper models
├── package.json
└── electron-builder.yml
```

---

## Free API Setup Guide

### 1. Gemini API — PRIMARY (you likely already have this)
- Go to: https://aistudio.google.com
- Sign in with your Google account (the one with Google AI Pro student plan)
- Click "Get API Key" — it's instant
- You'll see your free quota (should be very generous on the student plan)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/` (OpenAI-compatible!)
- Model: `gemini-2.5-flash` or `gemini-2.0-flash`
- **Cost: $0 (covered by your student plan)**

### 2. GLM-4.7-Flash — Fallback #1
- Go to: https://bigmodel.cn (Zhipu AI platform)
- Sign up (free, takes 2 minutes)
- Get API key from the dashboard
- Base URL: `https://open.bigmodel.cn/api/paas/v4/`
- OpenAI-compatible format — identical client code, just swap the base URL
- **Cost: $0, genuinely no rate limits**

### 3. Qwen API — Fallback #2
- Go to: https://qwen.ai/apiplatform
- Sign up via Qwen Chat
- Get 1,000 free calls/day
- Also OpenAI-compatible format
- **Cost: $0**

### 4. Whisper.cpp — Local Transcription (core feature)
- Clone: https://github.com/ggerganov/whisper.cpp
- Download large-v3-turbo model (~1.5GB): `bash models/download-ggml-model.sh large-v3-turbo`
- On Apple Silicon, build with CoreML: `make -j WHISPER_COREML=1`
- Runs at real-time speed or faster on M1/M2/M3/M4 Macs
- **Cost: $0 forever, audio never leaves your Mac**

### 5. Deepgram — Optional Cloud Transcription Upgrade
- Go to: https://deepgram.com
- Sign up (no credit card required)
- Get $200 free credits (~350 hours of real-time transcription)
- **Cost: $0 for first ~350 hours**

---

## Tools Assignment (Your Real Stack)

| Tool | Role | When to use it |
|------|------|----------------|
| **Antigravity** (Gemini Pro — student plan) | Primary vibe coding agent | Multi-file feature generation, "build me the entire X module", complex refactors across files |
| **VS Code + GitHub Copilot** (free) | Daily coding environment | Typing code, inline suggestions, quick edits, file navigation |
| **Claude Code** | Heavy architecture + audio pipeline | ScreenCaptureKit bridge, Whisper integration, prompt engineering, anything tricky |
| **Gemini 2.5 Flash** (Google AI Studio) | Primary summarization LLM | All AI summarization inside the app — you have this via Google AI Pro |
| **Jules** (Google) | Async background agent | Send it overnight refactoring jobs, test generation, dependency upgrades |
| **GPT Codex** | Second opinion / unstuck | When Antigravity gets stuck, try Codex on the same problem |
| **Bolt.new** | UI prototyping only | Generate beautiful React component layouts, then paste into your Electron app |
| **Rork** | iPhone companion app | Phase 7 only — React Native mobile app |

### Why Antigravity + VS Code is Better Than Cursor Here

Cursor bundles the AI agent and editor together, which can feel limiting. Your setup separates them:
- **VS Code** = your editor (you know it, Copilot is built in, it's fast)
- **Antigravity** = your AI agent (runs alongside VS Code, handles whole-feature generation with Gemini Pro at your student plan's higher limits)

This means you get Copilot's fast inline completions PLUS Antigravity's deep multi-file reasoning without switching tools. It's actually a more powerful combination.

---

## Vibe Coding Workflow (with Your Actual Tools)

### Day-to-day loop:

1. **Start each feature in Antigravity** — describe the whole feature ("build me the system audio capture module with ScreenCaptureKit, pipe audio to whisper.cpp every 3 seconds, stream transcript back to the React UI"), let Gemini Pro generate the multi-file scaffold with your student plan's higher limits

2. **Open result in VS Code** — review what Antigravity generated, Copilot fills in any gaps inline as you refine

3. **Call in Claude Code for the hard parts** — audio capture bridge (this is the trickiest piece), Whisper integration, complex AI prompts, anything that needs careful reasoning about macOS internals

4. **Prototype UI in Bolt.new** — when you need a new screen, describe it in Bolt.new, get beautiful React code, paste components into VS Code

5. **Ship Jules overnight** — when you're done for the day, give Jules a list of cleanup tasks (add TypeScript types, write unit tests for X, refactor Y to use Z pattern), wake up to clean code

6. **Unstuck with Codex** — when Antigravity and Claude Code both struggle with something, throw it at GPT Codex for a fresh angle

### Antigravity-specific prompting tips for this project:
- Give it full context: paste the project structure + the specific file you want it to modify
- Ask it to generate complete, runnable code (not pseudocode or placeholders)
- For audio pipeline code, always include "this is for macOS using ScreenCaptureKit, Swift bridging headers are allowed"
- For UI components, include "use React + TypeScript + Tailwind + shadcn/ui, no additional dependencies"

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ScreenCaptureKit permissions are tricky | Study Recap's open-source implementation; use entitlements correctly |
| Whisper local is too slow on older Macs | Add Deepgram as cloud fallback option in settings |
| GLM-4.7-Flash quality isn't good enough | Fallback chain: GLM → Qwen → Groq (all free) |
| Electron feels heavy | Optimize with lazy loading; consider migrating to Tauri in v2 |
| Apple Silicon vs Intel compatibility | whisper.cpp supports both; test on both architectures |
| Calendar OAuth approval from Google | Use "Testing" mode (100 users limit) for personal use |

---

## Success Metrics (When Is It "Done"?)

Your clone matches Granola when it can:

- [ ] Capture system audio from any meeting app without a bot
- [ ] Transcribe in real-time with 90%+ accuracy
- [ ] Generate structured AI summaries (key points, action items, decisions)
- [ ] Merge your typed notes with AI-generated content
- [ ] Search across all past meetings with natural language
- [ ] Chat with any meeting ("What did Sarah say about the deadline?")
- [ ] Auto-detect meetings from Google Calendar
- [ ] Share notes via link where recipients can query the meeting
- [ ] Support custom meeting templates
- [ ] Work offline for transcription (Whisper local)

---

## Getting Started — First 48 Hours

### Hour 0-2: Environment Setup
```bash
# 1. Create Electron + React + TypeScript project
npx create-electron-app granola-clone --template=webpack-typescript
cd granola-clone

# 2. Install core dependencies
npm install react react-dom @types/react @types/react-dom
npm install tailwindcss @tiptap/react @tiptap/starter-kit
npm install zustand react-router-dom

# 3. Install AI/API clients
npm install openai  # works for Gemini, GLM, Qwen (all OpenAI-compatible)

# 4. Set up whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp ../whisper.cpp
cd ../whisper.cpp && bash models/download-ggml-model.sh large-v3-turbo
make -j WHISPER_COREML=1  # Apple Silicon acceleration
```

**Then open in VS Code** — Copilot activates automatically. Open Antigravity alongside it.

### Hour 2-6: Get Audio Capture Working
Tell Antigravity (Gemini Pro): *"Build me an Electron main process module that uses ScreenCaptureKit via a Swift helper to capture system audio on macOS. It should save rolling 3-second WAV chunks to a temp directory and emit events to the renderer process via IPC when each chunk is ready."*

- Let Antigravity generate the Swift helper + Electron IPC bridge
- Test by playing a YouTube video — you should see WAV files appearing in /tmp/

### Hour 6-12: Get Transcription Working
Tell Antigravity: *"Build me a TypeScript module that watches a directory for new WAV files, runs them through whisper.cpp via child_process, and streams the transcript text back via an EventEmitter. Use the whisper.cpp binary at ../whisper.cpp/main with the large-v3-turbo model."*

- Wire the audio chunks from Phase 1 into this
- You should see rolling transcript text appearing as you speak / play audio

### Hour 12-24: Get AI Summaries Working
- Go to https://aistudio.google.com — get your Gemini API key
- Tell Antigravity: *"Build a summarizer module using the OpenAI SDK pointed at Google AI Studio's endpoint. Given a raw meeting transcript, return structured JSON with: keyPoints[], actionItems[] (with assignee and deadline), decisions[], and followUpQuestions[]."*
- Test by pasting in a fake meeting transcript

### Hour 24-48: Build the MVP UI
- Go to Bolt.new, describe: *"A meeting notes app UI with: left sidebar showing upcoming meetings from calendar, center panel with a live scrolling transcript feed, right panel with a Notion-style block editor for notes. Dark mode, minimal design similar to Granola."*
- Copy the generated React components into your Electron renderer
- Wire up the transcript stream → UI and the end-of-meeting → Gemini summarization

After 48 hours: working prototype that captures system audio, transcribes it live, and generates AI summaries. Everything else is features layered on top of this core.

---

*This plan gives you a fully functional Granola clone for $0 in API costs, built with the exact tools you already have: Antigravity (Gemini Pro at student plan limits), VS Code + Copilot, Claude Code, Jules, and GPT Codex. The Mac version comes first because that's where the real value is (system audio capture). iPhone companion follows once the core is solid.*

---

## Quick Reference Card

| What you're doing | Use this tool |
|---|---|
| Starting a new whole feature from scratch | **Antigravity** (Gemini Pro) |
| Typing/editing code in files | **VS Code + Copilot** |
| Audio capture / Whisper / tricky native code | **Claude Code** |
| Mocking up a UI screen quickly | **Bolt.new** |
| Background cleanup / tests / refactoring | **Jules** (overnight) |
| Stuck and need a different angle | **GPT Codex** |
| iPhone app (Phase 7 only) | **Rork** |
| Summarization inside the app | **Gemini 2.5 Flash** (Google AI Studio) |
| Transcription | **whisper.cpp** (local, free, private) |
