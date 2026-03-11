import { format } from "date-fns";

export function formatMeetingDate(timestamp: number): string {
  return format(timestamp, "EEE, MMM d");
}

export function formatMeetingTime(timestamp: number): string {
  return format(timestamp, "h:mm a");
}

export function formatMeetingRange(startedAt: number, endedAt?: number | null): string {
  if (!endedAt) {
    return `${formatMeetingDate(startedAt)} at ${formatMeetingTime(startedAt)}`;
  }

  return `${formatMeetingDate(startedAt)} · ${formatMeetingTime(startedAt)} - ${formatMeetingTime(endedAt)}`;
}
