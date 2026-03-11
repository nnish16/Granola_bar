import { Mic } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import MeetingCard from "../components/meeting/MeetingCard";
import MeetingCardSkeleton from "../components/meeting/MeetingCardSkeleton";
import ComingUp from "../components/sidebar/ComingUp";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { isNoteflowBridgeAvailable } from "../lib/ipc";
import { useMeetingsStore } from "../store/meetings.store";

export default function Home(): JSX.Element {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const meetings = useMeetingsStore((state) => state.meetings);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const hasMore = useMeetingsStore((state) => state.hasMore);
  const error = useMeetingsStore((state) => state.error);
  const loadMeetings = useMeetingsStore((state) => state.loadMeetings);
  const loadMoreMeetings = useMeetingsStore((state) => state.loadMoreMeetings);
  const searchMeetings = useMeetingsStore((state) => state.searchMeetings);
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const isBridgeAvailable = isNoteflowBridgeAvailable();
  const upcomingMeetings = [...meetings]
    .filter((meeting) => meeting.startedAt > Date.now())
    .sort((left, right) => left.startedAt - right.startedAt);
  const pastMeetings = meetings.filter((meeting) => meeting.startedAt <= Date.now());
  const isSearching = deferredSearchValue.trim().length > 0;

  useEffect(() => {
    void (isSearching ? searchMeetings(deferredSearchValue) : loadMeetings(0));
  }, [deferredSearchValue, isSearching, loadMeetings, searchMeetings]);

  const handleCreateMeeting = async (): Promise<void> => {
    try {
      const meeting = await createMeeting({
        title: "Untitled Meeting",
        startedAt: Date.now(),
      });

      startTransition(() => {
        navigate(`/meeting/${meeting.id}`);
      });
    } catch {
      // The store already exposes a user-facing error banner for preview mode or IPC failures.
    }
  };

  const handleLoadMore = async (): Promise<void> => {
    await loadMoreMeetings();
  };

  return (
    <AppShell
      topBar={
        <TopBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onCreateMeeting={isBridgeAvailable ? handleCreateMeeting : undefined}
        />
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

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {isBridgeAvailable ? error : "Preview mode detected. Use the Electron app window opened by `npm start` for desktop features like creating meetings, local storage, audio capture, and Notion sync."}
          </div>
        ) : null}

        {isLoading && meetings.length === 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <MeetingCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {!isLoading && pastMeetings.length === 0 ? (
          <div className="panel-surface flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-accent/10">
              <Mic className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-user">No meetings yet</p>
            <p className="max-w-[220px] text-xs text-gray-400 dark:text-gray-500">
              Click <strong>+ New</strong> to start recording your first meeting.
            </p>
          </div>
        ) : !isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {pastMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : null}

        {!isSearching && hasMore && !isLoading ? (
          <div className="flex justify-center pt-2">
            <Button variant="secondary" onClick={handleLoadMore}>
              Load more meetings
            </Button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
