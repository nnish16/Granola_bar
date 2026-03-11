import type { MeetingSyncSelection } from "../../src/types";
import type { MeetingForSync } from "../notion/sync";

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(timestamp: number): string {
  return TIMESTAMP_FORMATTER.format(new Date(timestamp));
}

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (endedAt === null) {
    return "In progress";
  }

  const totalMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function formatTranscriptTimestamp(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSelectionSummary(selection: MeetingSyncSelection): string {
  return (
    [
      selection.includeUserNotes ? "user notes" : null,
      selection.includeAiNotes ? "AI blocks" : null,
      selection.includeTranscript ? "transcript" : null,
    ]
      .filter(Boolean)
      .join(", ") || "none"
  );
}

function renderMeetingHeaderSection(meeting: MeetingForSync, selection: MeetingSyncSelection): string {
  const lines = [
    `# ${meeting.title}`,
    "",
    `- Date: ${formatTimestamp(meeting.startedAt)}`,
    `- Duration: ${formatDuration(meeting.startedAt, meeting.endedAt)}`,
    `- Template: ${meeting.templateId}`,
  ];

  if (meeting.attendees.length > 0) {
    lines.push(`- Attendees: ${meeting.attendees.map((attendee) => attendee.name).join(", ")}`);
  }

  lines.push(`- Synced content: ${formatSelectionSummary(selection)}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderNoteSection(title: string, blocks: MeetingForSync["noteBlocks"]): string {
  const lines = [`## ${title}`, ""];

  for (const block of blocks) {
    const content = block.content.trim();
    if (!content) {
      continue;
    }

    if (block.blockType === "heading") {
      lines.push(`### ${content}`);
    } else if (block.blockType === "bullet") {
      lines.push(`- ${content}`);
    } else {
      lines.push(content);
    }

    lines.push("");
  }

  return lines.length > 2 ? `${lines.join("\n")}\n` : "";
}

function renderTranscriptSection(segments: MeetingForSync["transcriptSegments"]): string {
  if (segments.length === 0) {
    return "";
  }

  const lines = ["## Transcript", ""];

  for (const segment of segments) {
    lines.push(`- [${formatTranscriptTimestamp(segment.startMs)}] ${segment.speakerLabel}: ${segment.text.trim()}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function partitionNoteBlocks(noteBlocks: MeetingForSync["noteBlocks"]): {
  userNotes: MeetingForSync["noteBlocks"];
  aiNotes: MeetingForSync["noteBlocks"];
} {
  const userNotes: MeetingForSync["noteBlocks"] = [];
  const aiNotes: MeetingForSync["noteBlocks"] = [];

  for (const block of noteBlocks) {
    if (block.source === "user") {
      userNotes.push(block);
      continue;
    }

    if (block.source === "ai") {
      aiNotes.push(block);
    }
  }

  return { userNotes, aiNotes };
}

function collectMeetingSections(meeting: MeetingForSync, selection: MeetingSyncSelection): string[] {
  const sections = [renderMeetingHeaderSection(meeting, selection)];
  const { userNotes, aiNotes } = partitionNoteBlocks(meeting.noteBlocks);

  if (userNotes.length > 0) {
    const userNotesSection = renderNoteSection("User Notes", userNotes);
    if (userNotesSection.length > 0) {
      sections.push(userNotesSection);
    }
  }

  if (aiNotes.length > 0) {
    const aiNotesSection = renderNoteSection("AI Enhancements", aiNotes);
    if (aiNotesSection.length > 0) {
      sections.push(aiNotesSection);
    }
  }

  if (meeting.transcriptSegments.length > 0) {
    const transcriptSection = renderTranscriptSection(meeting.transcriptSegments);
    if (transcriptSection.length > 0) {
      sections.push(transcriptSection);
    }
  }

  return sections;
}

export function renderMeetingMarkdown(meeting: MeetingForSync, selection: MeetingSyncSelection): string {
  const sections = collectMeetingSections(meeting, selection);
  return sections.join("");
}
