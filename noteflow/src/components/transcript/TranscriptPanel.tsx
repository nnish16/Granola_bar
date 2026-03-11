import { PanelRightClose } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranscript } from "../../hooks/useTranscript";
import TranscriptLine from "./TranscriptLine";

type TranscriptPanelProps = {
  isOpen: boolean;
  meetingId: string;
  onClose: () => void;
  startedAt: number;
};

export default function TranscriptPanel({
  isOpen,
  meetingId,
  onClose,
  startedAt,
}: TranscriptPanelProps): JSX.Element {
  const { activeSegmentIndex, isLoading, segments } = useTranscript({
    isLive: isOpen,
    meetingId,
    startedAt,
  });

  return (
    <aside
      className={cn(
        "panel-surface flex h-full min-h-[520px] w-full max-w-[360px] flex-col overflow-hidden transition-all duration-300 max-xl:fixed max-xl:inset-y-0 max-xl:right-4 max-xl:z-20 max-xl:h-[calc(100vh-8rem)]",
        isOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0 xl:w-0 xl:min-h-0 xl:border-0 xl:p-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-user">Transcript</p>
          <p className="text-xs text-secondary">{segments.length} segments</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-secondary transition hover:bg-black/5 hover:text-user dark:hover:bg-white/5"
          aria-label="Hide transcript"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-secondary">
            Loading transcript…
          </div>
        ) : segments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-secondary">
            Transcript segments will appear here once transcription is available for this meeting.
          </div>
        ) : (
          segments.map((segment) => (
            <TranscriptLine
              key={segment.id ?? `${segment.segmentIndex}-${segment.startMs}`}
              segment={segment}
              isActive={activeSegmentIndex === segment.segmentIndex}
            />
          ))
        )}
      </div>
    </aside>
  );
}
