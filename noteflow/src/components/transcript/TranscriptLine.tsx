import { cn } from "../../lib/utils";
import type { TranscriptSegment } from "../../types";

type TranscriptLineProps = {
  isActive: boolean;
  segment: TranscriptSegment;
};

function formatTimestamp(startMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(startMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TranscriptLine({ isActive, segment }: TranscriptLineProps): JSX.Element {
  return (
    <article
      className={cn(
        "rounded-2xl border px-4 py-3 transition",
        isActive
          ? "border-accent/60 bg-accent/5 shadow-sm"
          : "border-transparent bg-white/70 hover:border-border dark:bg-zinc-950/70",
      )}
    >
      <div className="flex items-center justify-between gap-3 text-xs text-secondary">
        <span className="font-medium text-user">{segment.speakerLabel}</span>
        <span>{formatTimestamp(segment.startMs)}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-secondary">{segment.text}</p>
    </article>
  );
}
