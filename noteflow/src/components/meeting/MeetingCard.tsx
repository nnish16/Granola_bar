import { CalendarDays, Circle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMeetingCardDate, formatMeetingDuration } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { Meeting } from "../../types";

interface MeetingCardProps {
  meeting: Meeting;
}

const templateAccentClasses: Record<string, string> = {
  general: "border-l-emerald-500 text-emerald-500",
  "one-on-one": "border-l-sky-500 text-sky-500",
  standup: "border-l-amber-500 text-amber-500",
  "sales-call": "border-l-rose-500 text-rose-500",
  "user-interview": "border-l-violet-500 text-violet-500",
  "customer-discovery": "border-l-cyan-500 text-cyan-500",
  "weekly-team": "border-l-lime-500 text-lime-500",
  "investor-pitch": "border-l-orange-500 text-orange-500",
};

export default function MeetingCard({ meeting }: MeetingCardProps): JSX.Element {
  const accentClass = templateAccentClasses[meeting.templateId] ?? templateAccentClasses.general;
  const attendeeCount = meeting.attendeeCount ?? meeting.attendees.length;
  const attendeeLabel = `${attendeeCount} attendee${attendeeCount === 1 ? "" : "s"}`;
  const dateLabel = formatMeetingCardDate(meeting.startedAt);
  const durationLabel = formatMeetingDuration(meeting.startedAt, meeting.endedAt);

  return (
    <Link
      to={`/meeting/${meeting.id}`}
      className={cn(
        "group panel-surface block overflow-hidden border-l-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-card-hover)]",
        accentClass.split(" ")[0],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Circle className={cn("h-3 w-3 fill-current stroke-none", accentClass.split(" ")[1])} />
            <h3 className="truncate text-[15px] font-semibold text-user">{meeting.title}</h3>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {attendeeLabel}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-secondary dark:bg-white/10">
          {durationLabel}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-gray-400 dark:text-gray-500">
        {meeting.previewText?.trim() || "Notes and AI enhancements will appear here once this meeting has content."}
      </p>
    </Link>
  );
}
