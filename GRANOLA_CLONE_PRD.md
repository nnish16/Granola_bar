# Product Requirements Document
## Granola Clone — "NoteFlow" (working title)
**Version**: 1.0 | **Platform**: macOS-first, iPhone companion | **Status**: Pre-development

---

## 1. Executive Summary

NoteFlow is a free, privacy-first AI meeting notes application that exactly replicates the feature set and UI/UX of Granola (granola.so). It captures system audio on macOS without joining meetings as a bot, produces real-time transcripts, and uses AI to enhance user-written notes with key points, action items, and decisions. All transcription runs locally via whisper.cpp; AI summarization runs via free API (Gemini 2.5 Flash via Google AI Studio). Total operating cost: $0.

---

## 2. Goals

- **Primary**: Build a feature-complete, pixel-accurate Granola clone for personal use
- **Technical**: 100% free APIs and open-source components
- **Privacy**: Audio never stored permanently; transcription local by default
- **Timeline**: Working Mac MVP in 2–3 weeks; iPhone companion in weeks 5–6

---

## 3. User Personas

**Primary user (you)**: Student/professional with back-to-back meetings, uses Zoom/Google Meet/Teams, wants meeting notes without manual effort, owns a Mac, values privacy.

---

## 4. Complete Feature Requirements

### 4.1 Audio Capture
- Capture system audio (both sides of the call) directly from macOS using ScreenCaptureKit — no bot joins the meeting
- Works transparently with Zoom, Google Meet, Teams, Slack Huddles, FaceTime, any app
- Auto-detect when microphone is in use for off-calendar spontaneous calls
- Audio is processed in real-time and NOT permanently stored — only transcript text is persisted
- Rolling 3-second audio chunks fed to transcription engine
- Voice Activity Detection (VAD) to skip silence chunks
- Menu bar icon shows green "recording" indicator when active

### 4.2 Real-Time Transcription
- Transcript updates line-by-line during meeting as speaker talks
- Speaker diarization: distinguish "Speaker 1", "Speaker 2" etc. (with names when calendar attendees are known)
- Toggle transcript panel visibility on/off with button
- Manual Stop/Resume controls for transcription
- Auto-stop after 15 minutes of silence
- Transcription engine: whisper.cpp large-v3-turbo with CoreML acceleration on Apple Silicon
- Optional cloud fallback: Deepgram API (when user enables in settings)
- Transcript stored locally in SQLite database post-meeting (text only, no audio)

### 4.3 Note Editor (During Meeting)
- Block-based note editor (like Notion) in left/main pane
- Markdown support: `###` for section headers, `-` or `*` for bullet points
- User types notes freely during meeting
- Section headers created with `###` guide the AI on where to insert summaries later
- Notes saved continuously with auto-save (every 2 seconds)
- Black text = everything user writes
- Editor stays focused and minimal during meeting — no distracting panels

### 4.4 AI-Enhanced Notes (Post-Meeting)
- After meeting ends, "Enhance Notes" button becomes prominent
- Click triggers AI processing (Gemini 2.5 Flash) combining:
  - User's handwritten notes
  - Full meeting transcript
  - Selected template
- Output: user notes preserved in black text + AI additions inserted in gray text
- AI-generated sections:
  - **Key Points / Highlights** — most important discussion topics
  - **Decisions Made** — explicit decisions from the conversation
  - **Action Items** — tasks with owner names and deadlines if mentioned
  - **Important Quotes** — verbatim notable statements from participants
  - **Follow-up Questions** — things left unanswered or to revisit
- Every gray bullet point is hyperlinked to the exact transcript timestamp where that information appeared
- Clicking a gray bullet jumps to that moment in the scrollable transcript
- User can click any gray text to edit it — it immediately turns black

### 4.5 Templates
**Built-in templates:**
1. **General Meeting** — Key points, decisions, action items, quotes
2. **1-on-1** — Discussion topics, commitments, growth decisions, blockers
3. **Stand-up** — What I did, blockers, what's next, action items
4. **Sales Call** — Prospect info, pain points, objections, next steps, follow-up date
5. **User Interview** — User background, pain points, feature requests, quotes, insights
6. **Customer Discovery** — Problem validation, pain points, feature requests, willingness to pay
7. **Weekly Team Meeting** — Updates per person/team, decisions, action items
8. **Investor Pitch** — Pitch feedback, tough questions, responses, next steps

**Custom templates:**
- User can create their own template by writing a plain-English prompt (e.g., "Format notes as: Context, Discussion Points, Decisions, My Action Items")
- Templates saved locally, appear in dropdown
- Template selected before or after Enhance Notes — can re-run with different template

**Recipes (saved prompts):**
- One-click saved questions (e.g., "List all action items assigned to me", "What were the three most important decisions?")
- Reusable across all meetings

### 4.6 Calendar Integration
- OAuth sign-in with Google Calendar (primary) and Microsoft Outlook/Teams
- "Coming up" sidebar section shows next 7 meetings with: title, time, attendee count, platform detected
- System notification 1 minute before each calendar meeting with 2+ attendees
- Clicking notification opens note for that meeting pre-filled with title, attendees, date
- Attendee names automatically fed to AI for speaker-to-name mapping in transcription
- Toggle visibility per calendar in settings
- "Show more" expands beyond 5 default visible meetings

### 4.7 Meeting Library (Home Screen)
- List of all past meetings with: title, date, time, attendee count, brief note preview
- Sorted by date descending (most recent first)
- Folder organization: user can create folders and drag meetings into them
- Sidebar sections: Coming up | Past meetings | People | Companies | Folders
- People view: auto-extracts all contacts from meeting history, shows meetings per person
- Companies view: auto-extracts organizations from attendee emails, groups meetings per company
- Meeting cards show share status (shared/private indicator)

### 4.8 Search
- Full-text search across all meeting titles and notes
- AI-powered natural language search via chat feature (see 4.9)
- Search bar prominent at top of meeting library
- Instant results as user types

### 4.9 Chat / Ask AI (CMD+J)
- CMD+J opens AI chat panel (slide-in from right or bottom)
- Scope selector:
  - **This meeting** — queries only current meeting transcript + notes
  - **All meetings** — queries entire meeting history (vector search)
  - **Folder** — queries only meetings in selected folder
- Example queries:
  - "What decisions were made about the timeline?"
  - "Who is responsible for the onboarding redesign?"
  - "What features have customers requested across all user interviews?"
  - "Summarize everything said about pricing"
- Responses include source citations linking back to transcript timestamps
- Hover over citation to see transcript snippet in tooltip
- Click citation to jump to that moment in transcript
- Powered by Gemini 2.5 Flash with transcript + notes as context

### 4.10 Sharing
- Each meeting note has a Share button
- Share dialog with three options:
  - **Anyone with link** — public shareable URL
  - **Private** — link disabled
- Generated URL: `nf.app/s/[unique-id]` (or localhost for local share server)
- Shared note web view shows:
  - AI-enhanced notes (no raw transcript shown to recipients)
  - Hover over gray bullets to see transcript snippet tooltip
  - Right-side chat panel where recipients can ask questions about the meeting
  - No account required for recipients
- Copy link button for easy sharing
- Share status indicator in meeting library

### 4.11 Export
- Export options (accessible from meeting overflow menu):
  - **Markdown** — full notes as .md file
  - **Plain Text** — .txt
  - **Copy to Clipboard** — formatted text
  - **Send to Slack** — post summary to configured Slack channel
  - **Send to Notion** — append to configured Notion page

### 4.12 Menu Bar App
- Small app icon in macOS menu bar
- Click reveals mini panel:
  - Current meeting status (recording / idle)
  - Quick "Start new note" button
  - "Coming up" peek (next 2 meetings)
- When recording: icon shows green animated indicator
- Click "Open NoteFlow" to bring main window to foreground

### 4.13 Settings
- **General**: Dark/Light/System mode, notification preferences, language
- **Calendars**: Which calendars sync, OAuth management
- **Transcription**: Engine (Local Whisper / Deepgram cloud), language, speaker labels
- **AI**: API key fields (Gemini, GLM fallback, Qwen fallback), active model selector
- **Templates**: Manage custom templates, manage recipes
- **Sharing**: Default share setting (anyone/private), link format
- **Integrations**: Slack workspace, Notion token, webhook URL
- **Privacy**: Opt-out of sending transcripts for AI training (always off by default), data deletion

### 4.14 iPhone Companion App (Phase 7)
- Mic-based recording for in-person meetings (phone on table)
- View and browse all past meeting notes (synced from Mac via iCloud/local API)
- Search meeting history
- Listen to meeting summaries via text-to-speech
- Lock Screen widget for one-tap start recording
- Home screen widget for recent meetings
- Push notifications for upcoming meetings

---

## 5. UI/UX Specifications

### 5.1 Design Language

**Typography:**
- Display/Logo font: Any slightly mechanical slab serif (approximate Granola's "Quadrant" feel) — use **Playfair Display** as free substitute
- UI body font: Clean, neutral sans-serif — use **Inter** (free, excellent macOS rendering)
- User notes: black, 15px, Inter Regular
- AI notes: #888888 gray, 15px, Inter Regular, same weight
- Meeting titles: 20px, Inter Semibold
- Section headers: 17px, Inter Semibold

**Color Palette:**
```
Primary Green (active/accent):     #22C55E  (Tailwind green-500)
Green dark (pressed state):        #16A34A  (Tailwind green-600)
User text (black):                 #111111
AI text (gray):                    #888888
Background (light):                #FFFFFF
Sidebar background (light):        #F7F7F5
Background (dark):                 #1A1A1A
Sidebar background (dark):         #141414
Border / divider:                  #E5E5E5
Secondary text:                    #6B7280
Hyperlink (on gray AI text):       underline, same gray color, on hover #555555
Dancing bars:                      #22C55E
```

**Spacing:**
- Sidebar width: 220px (fixed)
- Note editor left padding: 48px
- Note editor max-width: 680px (centered)
- Line height: 1.7
- Paragraph spacing: 8px

### 5.2 Screen Layouts

#### Main Window (Meeting Library / Home)
```
┌─────────────────────────────────────────────────────┐
│  [NoteFlow icon]           [Search bar]     [+]  [⚙] │  ← Top bar, 48px
├──────────────┬──────────────────────────────────────┤
│              │ Coming up                             │
│  📅 Coming   │ ┌─────────────────────────────────┐  │
│     up       │ │ Design Review  Today 2pm  4 ppl  │  │
│  🕒 Past     │ │ 1:1 with Sarah  Today 4pm  2 ppl │  │
│     meetings │ └─────────────────────────────────┘  │
│              │                                       │
│  👤 People   │ Past meetings                         │
│  🏢 Companies│ ┌─────────────────────────────────┐  │
│              │ │ Product Sync · Mar 3 · 6 people  │  │
│  📁 Folders  │ │ Key points: Roadmap Q2, launch.. │  │
│              │ ├─────────────────────────────────┤  │
│  ─────────── │ │ User Interview · Mar 2 · 2 ppl  │  │
│  [Workspace] │ │ Key points: Pain points around.. │  │
│              │ └─────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────┘
```

#### During Meeting View
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back  │  Design Review  │  🔴 Recording 00:12:34  │ [📋] │
├───────────────────────────────┬─────────────────────────────┤
│                               │  TRANSCRIPT                  │
│  ### Agenda                   │  Speaker 1 (02:14)           │
│  - Q2 roadmap review          │  "We need to finalize the    │
│  - Budget approval            │   launch date by end of Q1"  │
│  - Team updates               │                              │
│                               │  Speaker 2 (02:31)           │
│  ### My notes                 │  "I think March 28th works   │
│  - Sarah mentioned launch...  │   for the full team..."      │
│                               │                              │
│                               │  Speaker 1 (02:45)           │
│                               │  "Agreed, let's lock that"   │
│                               │                              │
│                               │                              │
├───────────────────────────────┴─────────────────────────────┤
│  🟢 ▁▃▅▃▁  Recording system audio  [Stop]          [CMD+J]  │
└─────────────────────────────────────────────────────────────┘
```

#### Post-Meeting Notes View (Enhanced)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back  │  Design Review - Mar 3, 2:00pm  │ [Template ▼]  [Share]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ### Agenda                                                 │
│  - Q2 roadmap review                     ← BLACK (user)    │
│  - Budget approval                       ← BLACK (user)    │
│                                                             │
│  ### Key Points                                             │
│  · Launch date locked at March 28th ²   ← GRAY (AI) [²]   │
│  · Budget approved for Q2 features ⁵    ← GRAY (AI) [⁵]   │
│  · Mobile redesign deprioritized ⁷      ← GRAY (AI) [⁷]   │
│                                                             │
│  ### My notes                                               │
│  - Sarah mentioned launch by end of Q1  ← BLACK (user)    │
│                                                             │
│  ### Action Items                                           │
│  · @John: Send calendar invite for      ← GRAY (AI) [³]   │
│    kickoff by March 5th                                     │
│  · @Sarah: Confirm designer capacity ⁶  ← GRAY (AI) [⁶]   │
│                                                             │
│  ### Decisions                                              │
│  · Launch date: March 28th ²            ← GRAY (AI) [²]   │
│  · Mobile redesign: Q3 ⁸               ← GRAY (AI) [⁸]   │
│                                                             │
│                      [✨ Enhance Notes]                     │
└─────────────────────────────────────────────────────────────┘
```

#### Transcript Panel (toggled in post-meeting view)
- Appears as right 35% panel
- Scrollable chronological transcript
- Superscript numbers in notes link to numbered lines in transcript
- Clicking number scrolls transcript to that point and highlights line

#### CMD+J Chat Panel
```
┌─────────────────────────────────────────┐
│  Ask about: [This meeting ▼]            │
├─────────────────────────────────────────┤
│                                         │
│  AI: Based on this meeting, the main    │
│  decisions were: (1) Launch date set    │
│  to March 28 ², (2) Mobile redesign    │
│  moved to Q3 ⁸...                      │
│                                         │
├─────────────────────────────────────────┤
│  [What decisions were made?        ] →  │
└─────────────────────────────────────────┘
```

### 5.3 Interaction Specifications

- **Auto-save**: Every 2 seconds, silent, no spinner
- **Enhance Notes**: Loading state shows subtle pulsing animation on the button, then gray text fades in
- **Green dancing bars**: 5 vertical bars that animate to audio levels using Web Audio API visualization
- **Sidebar hover**: Meeting items highlight on hover with #F0F0ED background
- **Template change**: Brief "Regenerating..." state, then smooth fade-in of new gray content
- **Dark mode**: Full dark mode support, toggle in settings, respects system preference by default
- **Window size**: Default 1100x700, minimum 800x560, resizable

---

## 6. Data Models

### Meeting
```typescript
interface Meeting {
  id: string;                    // UUID
  title: string;                 // From calendar or user-set
  startedAt: Date;
  endedAt: Date | null;
  calendarEventId: string | null;
  attendees: Attendee[];
  folderId: string | null;
  templateId: string;
  shareId: string | null;        // null = not shared
  shareMode: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

interface Attendee {
  name: string;
  email: string;
}

interface TranscriptSegment {
  id: string;
  meetingId: string;
  speakerLabel: string;          // "Speaker 1", or name if known
  text: string;
  startMs: number;               // milliseconds from meeting start
  endMs: number;
  segmentIndex: number;
}

interface Note {
  id: string;
  meetingId: string;
  blocks: NoteBlock[];
  updatedAt: Date;
}

interface NoteBlock {
  id: string;
  type: 'heading' | 'bullet' | 'paragraph';
  content: string;
  source: 'user' | 'ai';        // determines black vs gray rendering
  transcriptRef: number | null;  // segment index for hyperlink
}

interface Template {
  id: string;
  name: string;
  prompt: string;
  isBuiltIn: boolean;
  createdAt: Date;
}
```

---

## 7. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| App shell | Electron 32+ | Cross-platform, huge training data for AI coding |
| UI framework | React 18 + TypeScript | Proven, excellent tooling |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent |
| Note editor | Tiptap 2 | Notion-like block editor, free, extensible |
| State | Zustand | Lightweight, simple |
| Database | SQLite via better-sqlite3 | Local, embedded, fast |
| Audio capture | ScreenCaptureKit (Swift helper) | Native macOS system audio |
| Transcription | whisper.cpp (local) / Deepgram (optional cloud) | Free, private, fast |
| AI (in-app) | Gemini 2.5 Flash via Google AI Studio | Free (student plan) |
| AI fallbacks | GLM-4.7-Flash → Qwen → Groq | All free |
| Embeddings / Search | LanceDB (local vector DB) | Embedded, no server |
| Calendar | Google Calendar OAuth v3 / MSAL (Outlook) | Free APIs |
| Share server | Express.js served from Electron | Local or Cloudflare Workers free |
| Build/packaging | electron-builder | Standard Electron packaging |

---

## 8. Success Criteria (Definition of Done)

The clone is complete when ALL of the following work:

- [ ] System audio captured from any meeting app without a bot joining
- [ ] Live transcript visible during meeting, updating line by line
- [ ] Speaker labels shown (Speaker 1, Speaker 2 or names from calendar)
- [ ] User can type notes during meeting in block editor
- [ ] "Enhance Notes" generates AI content in gray text
- [ ] Every gray bullet is hyperlinked to transcript timestamp
- [ ] 8 built-in templates work and can be switched post-meeting
- [ ] Custom templates can be created and saved
- [ ] CMD+J opens chat panel; queries answered with transcript citations
- [ ] Google Calendar sync shows upcoming meetings in sidebar
- [ ] 1-minute-before meeting notification works
- [ ] Meeting library shows all past meetings with search
- [ ] People view and Companies view populated from meeting history
- [ ] Folder creation and meeting assignment works
- [ ] Share link generation works (public URL)
- [ ] Shared note web view shows notes + chat panel for recipients
- [ ] Export to Markdown and clipboard works
- [ ] Slack integration sends summary to channel
- [ ] Menu bar icon shows recording state
- [ ] Dark mode works fully
- [ ] Settings screen manages all configurations
- [ ] App runs on both Apple Silicon and Intel Macs
- [ ] iPhone companion app shows synced meeting library

---

## 9. Out of Scope (v1)

- Windows version (Electron makes this easy in v2 — minimal changes)
- HubSpot / Affinity / Attio CRM integrations (post-MVP)
- Team/workspace features (personal use only in v1)
- Microsoft Outlook calendar (add in v1.1)
- Video recording
- Real-time translation

---

*PRD Owner: Jhatu | Built with: Antigravity (Gemini Pro) + VS Code + Copilot + Claude Code*
