# NoteFlow

> Privacy-first meeting notes app: captures audio, transcribes locally with Whisper, and uses AI to enhance your notes with decisions, action items, and key points.

[![CI](https://github.com/nnish16/Granola_bar/actions/workflows/ci.yml/badge.svg)](https://github.com/nnish16/Granola_bar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39-47848F.svg)](https://www.electronjs.org/)

## The Problem

Meeting notes apps like Otter.ai and Fireflies require cloud uploads of your audio. They join your call as a bot, making everyone uncomfortable. And the AI summaries are generic — they don't know what *you* care about.

## The Solution

NoteFlow runs entirely on your Mac. It captures system audio silently (no bot joins your call), transcribes locally using Whisper, and lets you write your own notes during the meeting. After the call, Gemini enhances *your* notes — not a generic transcript — with linked citations back to exact transcript moments.

## Features

- **Silent audio capture** — uses macOS ScreenCaptureKit, no bot joins your call
- **Local transcription** — Whisper.cpp runs on-device, nothing leaves your machine
- **AI enhancement** — Gemini 2.5 Flash extracts key points, decisions, action items from the transcript and weaves them into your notes
- **Transcript hyperlinks** — every AI-generated bullet links back to the exact moment in the transcript
- **Rich text editor** — TipTap-based block editor with auto-save
- **Meeting templates** — General, 1-on-1, Sales Call, User Interview, Investor Pitch (or write your own)
- **Semantic search** — find anything across all your meetings using vector embeddings
- **Calendar sync** — Google Calendar + Outlook integration for automatic meeting detection
- **Shareable notes** — generate public links with access control

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop | Electron 39 + Webpack |
| UI | React 18 + React Router |
| Editor | TipTap (block-based) |
| State | Zustand |
| Transcription | whisper-node + whisper.cpp |
| AI | Gemini 2.5 Flash |
| Database | better-sqlite3 (local) |
| Search | vectordb (embeddings) |
| Styling | Tailwind CSS + Radix UI |

## Quick Start

### Prerequisites

- macOS (Apple Silicon recommended for Whisper performance)
- Node.js 18+
- Google AI API key (for Gemini enhancement)

### Installation

```bash
git clone https://github.com/nnish16/Granola_bar.git
cd Granola_bar/noteflow
npm install
```

### Development

```bash
npm run start     # Dev mode with hot reload
```

### Build

```bash
npm run build     # Package for distribution
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Electron Main                    │
│  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ScreenCapture │  │  Whisper   │  │  SQLite   │ │
│  │  Kit Audio   │──│  Worker    │──│  Storage  │ │
│  └──────────────┘  └────────────┘  └──────────┘ │
├───────────────────IPC────────────────────────────┤
│                Electron Renderer                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Meeting  │ │  TipTap  │ │  Gemini Service  │ │
│  │  List    │ │  Editor  │ │  (enhancement)   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Transcript│ │ Calendar │ │  Vector Search   │ │
│  │  Panel   │ │  Sync    │ │  (all meetings)  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Roadmap

- [ ] Windows + Linux audio capture support
- [ ] Speaker diarization (label who said what)
- [ ] Notion export integration
- [ ] iOS companion app for on-the-go review
- [ ] End-to-end encrypted sharing

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE) — Nishant Sarang
