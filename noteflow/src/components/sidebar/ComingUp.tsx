import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMeetingRange } from "../../lib/format";
import type { Meeting } from "../../types";

interface ComingUpProps {
  meetings: Meeting[];
}

export default function ComingUp({ meetings }: ComingUpProps): JSX.Element {
  if (meetings.length === 0) {
    return (
      <div className="panel-surface p-6">
        <p className="text-sm text-secondary">No meetings scheduled yet. Create one to exercise the local database flow.</p>
      </div>
    );
  }

  return (
    <div className="panel-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">Coming Up</p>
          <h2 className="mt-2 font-display text-3xl text-user">Upcoming meetings</h2>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-accent">
          Show more
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {meetings.slice(0, 2).map((meeting) => (
          <Link
            key={meeting.id}
            to={`/meeting/${meeting.id}`}
            className="rounded-3xl border border-border bg-white/80 p-4 transition hover:bg-[var(--color-card-hover)] dark:bg-zinc-900"
          >
            <p className="text-sm font-semibold text-user">{meeting.title}</p>
            <p className="mt-2 text-sm text-secondary">{formatMeetingRange(meeting.startedAt, meeting.endedAt)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
