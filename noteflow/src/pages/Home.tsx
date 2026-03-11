import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import MeetingCard from "../components/meeting/MeetingCard";
import ComingUp from "../components/sidebar/ComingUp";
import Badge from "../components/ui/Badge";
import { useMeetingsStore } from "../store/meetings.store";

export default function Home(): JSX.Element {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const meetings = useMeetingsStore((state) => state.meetings);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const error = useMeetingsStore((state) => state.error);
  const loadMeetings = useMeetingsStore((state) => state.loadMeetings);
  const searchMeetings = useMeetingsStore((state) => state.searchMeetings);
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const upcomingMeetings = [...meetings]
    .filter((meeting) => meeting.startedAt > Date.now())
    .sort((left, right) => left.startedAt - right.startedAt);
  const pastMeetings = meetings.filter((meeting) => meeting.startedAt <= Date.now());

  useEffect(() => {
    void (deferredSearchValue.trim() ? searchMeetings(deferredSearchValue) : loadMeetings());
  }, [deferredSearchValue, loadMeetings, searchMeetings]);

  const handleCreateMeeting = async (): Promise<void> => {
    const meeting = await createMeeting({
      title: "Untitled Meeting",
      startedAt: Date.now(),
    });

    startTransition(() => {
      navigate(`/meeting/${meeting.id}`);
    });
  };

  return (
    <AppShell
      topBar={
        <TopBar searchValue={searchValue} onSearchChange={setSearchValue} onCreateMeeting={handleCreateMeeting} />
      }
    >
      <section className="space-y-8">
        <div id="coming-up" />
        <ComingUp meetings={upcomingMeetings} />
        <div id="past-meetings" className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">Library</p>
            <h2 className="mt-2 font-display text-3xl text-user">Past meetings</h2>
          </div>
          <Badge>{pastMeetings.length} saved</Badge>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {isLoading ? <div className="panel-surface p-6 text-sm text-secondary">Loading meetings from SQLite…</div> : null}

        {!isLoading && pastMeetings.length === 0 ? (
          <div className="panel-surface p-10 text-center">
            <p className="font-display text-3xl text-user">No meetings yet</p>
            <p className="mt-3 text-sm text-secondary">
              The Phase 1 scaffold is ready. Create a meeting to confirm CRUD, routing, and database initialization.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pastMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
