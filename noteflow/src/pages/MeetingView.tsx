import { ArrowLeft, Clock3, FileText, PanelRightClose, PanelRightOpen } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NoteEditor from "../components/editor/NoteEditor";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import TranscriptPanel from "../components/transcript/TranscriptPanel";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { formatMeetingCardDate, formatMeetingDuration, formatMeetingRange } from "../lib/format";
import { noteflowIpc } from "../lib/ipc";
import { cn } from "../lib/utils";
import { useMeetingsStore } from "../store/meetings.store";
import type { NoteBlock, TranscriptSegment } from "../types";

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

function findActiveSegmentIndex(segments: TranscriptSegment[], elapsedMs: number): number | null {
  for (const segment of segments) {
    if (elapsedMs >= segment.startMs && elapsedMs < segment.endMs) {
      return segment.segmentIndex;
    }
  }

  return null;
}

export default function MeetingView(): JSX.Element {
  const { id = "" } = useParams();
  const meeting = useMeetingsStore((state) => state.currentMeeting);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const loadMeeting = useMeetingsStore((state) => state.loadMeeting);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

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

    void Promise.all([
      noteflowIpc.notes.get(id),
      noteflowIpc.meetings.transcript(id),
    ]).then(([loadedNotes, loadedTranscript]) => {
      if (!isMounted) {
        return;
      }

      setNoteBlocks(loadedNotes.length > 0 ? loadedNotes : createInitialNoteBlocks());
      setTranscriptSegments(loadedTranscript);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    setDraftTitle(meeting?.title ?? "");
  }, [meeting?.title]);

  useEffect(() => {
    if (!meeting) {
      return;
    }

    const unsubscribeChunk = window.noteflow.audio.onChunk(({ meetingId, timestamp }) => {
      if (meetingId !== meeting.id) {
        return;
      }

      const elapsedMs = Math.max(0, timestamp - meeting.startedAt);
      setActiveSegmentIndex(findActiveSegmentIndex(transcriptSegments, elapsedMs));
    });

    const unsubscribeStopped = window.noteflow.audio.onStopped(() => {
      setActiveSegmentIndex(null);
    });

    return () => {
      unsubscribeChunk();
      unsubscribeStopped();
    };
  }, [meeting, transcriptSegments]);

  const transcriptSummary = useMemo(() => {
    if (!meeting) {
      return "";
    }

    return `${formatMeetingCardDate(meeting.startedAt)} · ${formatMeetingDuration(meeting.startedAt, meeting.endedAt)}`;
  }, [meeting]);

  const saveNotes = async (blocks: NoteBlock[]): Promise<void> => {
    if (!meeting) {
      return;
    }

    setIsSavingNotes(true);
    try {
      const savedBlocks = await noteflowIpc.notes.save(meeting.id, blocks);
      setNoteBlocks(savedBlocks.length > 0 ? savedBlocks : createInitialNoteBlocks());
    } finally {
      setIsSavingNotes(false);
    }
  };

  const saveTitle = async (): Promise<void> => {
    if (!meeting) {
      return;
    }

    const trimmedTitle = draftTitle.trim() || "Untitled Meeting";
    if (trimmedTitle === meeting.title) {
      setDraftTitle(trimmedTitle);
      return;
    }

    setIsSavingTitle(true);
    try {
      await noteflowIpc.meetings.update({ id: meeting.id, title: trimmedTitle });
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
          <>
            <div
              className={cn(
                "grid items-start gap-6 transition-all duration-300",
                isTranscriptOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "xl:grid-cols-[minmax(0,1fr)]",
              )}
            >
              <div className="space-y-6">
                <section className="panel-surface p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm uppercase tracking-[0.2em] text-secondary">Meeting</p>
                      <input
                        value={draftTitle}
                        onBlur={() => {
                          void saveTitle();
                        }}
                        onChange={(event) => {
                          setDraftTitle(event.target.value);
                        }}
                        className="mt-3 w-full bg-transparent font-display text-4xl text-user outline-none placeholder:text-secondary"
                        placeholder="Untitled Meeting"
                      />
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
                        {isTranscriptOpen ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
                        {isTranscriptOpen ? "Hide transcript" : "Show transcript"}
                      </Button>
                    </div>
                  </div>
                </section>

                <NoteEditor
                  blocks={noteBlocks}
                  isSaving={isSavingNotes}
                  onBlocksChange={setNoteBlocks}
                  onSave={saveNotes}
                />
              </div>

              <TranscriptPanel
                activeSegmentIndex={activeSegmentIndex}
                isOpen={isTranscriptOpen}
                onClose={() => {
                  setIsTranscriptOpen(false);
                }}
                segments={transcriptSegments}
              />
            </div>
          </>
        ) : (
          <div className="panel-surface p-8 text-sm text-secondary">This meeting could not be found.</div>
        )}
      </div>
    </AppShell>
  );
}
