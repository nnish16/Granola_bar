import { format, isToday } from "date-fns";

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

export function formatMeetingCardDate(timestamp: number): string {
  return isToday(timestamp) ? `Today, ${format(timestamp, "h:mm a")}` : format(timestamp, "EEE d MMM, h:mm a");
}

export function formatMeetingDuration(startedAt: number, endedAt?: number | null): string {
  if (!endedAt) {
    return "Recording...";
  }

  const totalMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatRelativeCountdown(timestamp: number, now = Date.now()): string {
  const remainingMinutes = Math.max(0, Math.round((timestamp - now) / 60000));
  if (remainingMinutes < 60) {
    return remainingMinutes === 0 ? "starting now" : `in ${remainingMinutes} min`;
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  if (minutes === 0) {
    return `in ${hours} hr`;
  }

  return `in ${hours} hr ${minutes} min`;
}
