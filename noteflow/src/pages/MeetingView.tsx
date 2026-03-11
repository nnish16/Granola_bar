import { ArrowLeft, Clock3, FileText, PanelRightOpen } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NoteEditor from "../components/editor/NoteEditor";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import MeetingExportPanel from "../components/share/MeetingExportPanel";
import TranscriptPanel from "../components/transcript/TranscriptPanel";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { formatMeetingCardDate, formatMeetingDuration, formatMeetingRange } from "../lib/format";
import { noteflowIpc } from "../lib/ipc";
import { cn } from "../lib/utils";
import { useMeetingsStore } from "../store/meetings.store";
import type { NoteBlock } from "../types";

function createInitialNoteBlocks(): NoteBlock[] {
  return [
    {
      id: crypto.randomUUID(),
      blockOrder: 0,
      blockType: "heading",
      content: "Meeting notes",
      source: "user",
      transcriptRef: null,
    },
    {
      id: crypto.randomUUID(),
      blockOrder: 1,
      blockType: "paragraph",
      content: "",
      source: "user",
      transcriptRef: null,
    },
  ];
}

export default function MeetingView(): JSX.Element {
  const { id = "" } = useParams();
  const meeting = useMeetingsStore((state) => state.currentMeeting);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const loadMeeting = useMeetingsStore((state) => state.loadMeeting);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([]);

  useEffect(() => {
    if (id) {
      void loadMeeting(id);
    }
  }, [id, loadMeeting]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isMounted = true;

    void noteflowIpc.notes.get(id).then((loadedNotes) => {
      if (!isMounted) {
        return;
      }

      setNoteBlocks(loadedNotes.length > 0 ? loadedNotes : createInitialNoteBlocks());
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const nextTitle = meeting?.title ?? "";
    setDraftTitle(nextTitle);
    if (titleRef.current && titleRef.current.textContent !== nextTitle) {
      titleRef.current.textContent = nextTitle;
    }
  }, [meeting?.title]);

  const transcriptSummary = useMemo(() => {
    if (!meeting) {
      return "";
    }

    return `${formatMeetingCardDate(meeting.startedAt)} · ${formatMeetingDuration(meeting.startedAt, meeting.endedAt)}`;
  }, [meeting]);

  const saveTitle = async (rawTitle: string): Promise<void> => {
    if (!meeting) {
      return;
    }

    const trimmedTitle = rawTitle.trim() || "Untitled Meeting";
    if (trimmedTitle === meeting.title) {
      setDraftTitle(trimmedTitle);
      if (titleRef.current && titleRef.current.textContent !== trimmedTitle) {
        titleRef.current.textContent = trimmedTitle;
      }
      return;
    }

    setIsSavingTitle(true);
    try {
      await noteflowIpc.meetings.update({ id: meeting.id, title: trimmedTitle });
      setDraftTitle(trimmedTitle);
      startTransition(() => {
        void loadMeeting(meeting.id);
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <AppShell topBar={<TopBar searchValue="" onSearchChange={() => undefined} />}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>

        {isLoading ? (
          <div className="panel-surface p-8 text-sm text-secondary">Loading meeting…</div>
        ) : meeting ? (
          <div
            className={cn(
              "relative grid items-start gap-6 transition-all duration-300",
              isTranscriptOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "xl:grid-cols-[minmax(0,1fr)]",
            )}
          >
            <div className="space-y-6">
              <section className="panel-surface p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm uppercase tracking-[0.2em] text-secondary">Meeting</p>
                    <h1
                      ref={titleRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Meeting title"
                      onBlur={() => {
                        void saveTitle(titleRef.current?.textContent ?? draftTitle);
                      }}
                      onInput={(event) => {
                        setDraftTitle(event.currentTarget.textContent ?? "");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      className="mt-3 w-full bg-transparent font-display text-4xl text-user outline-none"
                    >
                      {draftTitle}
                    </h1>
                    <div className="mt-6 flex flex-wrap gap-3 text-sm text-secondary">
                      <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2 dark:bg-white/5">
                        <Clock3 className="h-4 w-4" />
                        {formatMeetingRange(meeting.startedAt, meeting.endedAt)}
                      </span>
                      <Badge className="bg-black/5 text-user dark:bg-white/5 dark:text-zinc-100">
                        <FileText className="mr-2 h-4 w-4" />
                        {meeting.templateId}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-secondary">
                      <p>{transcriptSummary}</p>
                      <p>{isSavingTitle ? "Saving title…" : "Title saved locally"}</p>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-10 rounded-full px-4"
                      onClick={() => {
                        setIsTranscriptOpen((value) => !value);
                      }}
                    >
                      <PanelRightOpen className="mr-2 h-4 w-4" />
                      Transcript
                    </Button>
                  </div>
                </div>
              </section>

              <NoteEditor blocks={noteBlocks} meetingId={meeting.id} />
              <MeetingExportPanel meeting={meeting} />
            </div>

            <TranscriptPanel
              isOpen={isTranscriptOpen}
              meetingId={meeting.id}
              onClose={() => {
                setIsTranscriptOpen(false);
              }}
              startedAt={meeting.startedAt}
            />
          </div>
        ) : (
          <div className="panel-surface p-8 text-sm text-secondary">This meeting could not be found.</div>
        )}
      </div>
    </AppShell>
  );
}
