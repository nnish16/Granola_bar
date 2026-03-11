import { CalendarDays, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMeetingRange } from "../../lib/format";
import type { Meeting } from "../../types";

interface MeetingCardProps {
  meeting: Meeting;
}

export default function MeetingCard({ meeting }: MeetingCardProps): JSX.Element {
  return (
    <Link
      to={`/meeting/${meeting.id}`}
      className="group panel-surface block overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-card-hover)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-user">{meeting.title}</h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-secondary">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatMeetingRange(meeting.startedAt, meeting.endedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {meeting.attendeeCount ?? meeting.attendees.length} attendees
            </span>
          </div>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Open</span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-secondary">
        {meeting.previewText?.trim() || "Notes and AI enhancements will appear here once this meeting has content."}
      </p>
    </Link>
  );
}
