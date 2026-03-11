import { callDatabaseWorker } from "../db/worker-client";
import type { MeetingSyncSelection, NoteBlock, TranscriptSegment } from "../../src/types";
import type { MeetingForSync } from "../notion/sync";

export const DEFAULT_MEETING_SYNC_SELECTION: MeetingSyncSelection = {
  includeUserNotes: true,
  includeAiNotes: false,
  includeTranscript: false,
};

export function resolveMeetingSyncSelection(
  selection?: Partial<MeetingSyncSelection>,
): MeetingSyncSelection {
  return {
    ...DEFAULT_MEETING_SYNC_SELECTION,
    ...selection,
  };
}

export async function loadMeetingForExport(meetingId: string): Promise<MeetingForSync | null> {
  const meeting = (await callDatabaseWorker("meetings:get", meetingId)) as MeetingForSync | null;
  if (!meeting) {
    return null;
  }

  const [noteBlocks, transcriptSegments] = await Promise.all([
    callDatabaseWorker<NoteBlock[]>("notes:list", meetingId),
    callDatabaseWorker<TranscriptSegment[]>("meetings:transcript", meetingId),
  ]);

  return {
    ...meeting,
    noteBlocks,
    transcriptSegments,
  };
}

export function filterMeetingForExport(
  meeting: MeetingForSync,
  selection: MeetingSyncSelection,
): MeetingForSync {
  const noteBlocks = meeting.noteBlocks.filter((block) => {
    if (block.source === "user") {
      return selection.includeUserNotes;
    }

    if (block.source === "ai") {
      return selection.includeAiNotes;
    }

    return false;
  });

  return {
    ...meeting,
    noteBlocks,
    transcriptSegments: selection.includeTranscript ? meeting.transcriptSegments : [],
  };
}
