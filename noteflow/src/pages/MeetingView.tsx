import { ArrowLeft, Clock3, FileText } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import { formatMeetingRange } from "../lib/format";
import { useMeetingsStore } from "../store/meetings.store";

export default function MeetingView(): JSX.Element {
  const { id = "" } = useParams();
  const meeting = useMeetingsStore((state) => state.currentMeeting);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const loadMeeting = useMeetingsStore((state) => state.loadMeeting);

  useEffect(() => {
    if (id) {
      void loadMeeting(id);
    }
  }, [id, loadMeeting]);

  return (
    <AppShell topBar={<TopBar searchValue="" onSearchChange={() => undefined} />}>
      <div className="mx-auto max-w-editor space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>

        {isLoading ? (
          <div className="panel-surface p-8 text-sm text-secondary">Loading meeting…</div>
        ) : meeting ? (
          <>
            <section className="panel-surface p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-secondary">Meeting</p>
              <h1 className="mt-3 font-display text-4xl text-user">{meeting.title}</h1>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-secondary">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2 dark:bg-white/5">
                  <Clock3 className="h-4 w-4" />
                  {formatMeetingRange(meeting.startedAt, meeting.endedAt)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2 dark:bg-white/5">
                  <FileText className="h-4 w-4" />
                  {meeting.templateId} template
                </span>
              </div>
            </section>

            <section className="panel-surface p-8">
              <h2 className="text-lg font-semibold text-user">Phase 1 status</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">
                This view confirms routing, BrowserWindow boot, SQLite connectivity, and typed IPC. The rich editor,
                transcript pipeline, and AI enhancement blocks land in later phases.
              </p>
            </section>
          </>
        ) : (
          <div className="panel-surface p-8 text-sm text-secondary">This meeting could not be found.</div>
        )}
      </div>
    </AppShell>
  );
}
