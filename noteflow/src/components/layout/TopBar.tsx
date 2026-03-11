import { Search, Settings } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordingStatus } from "../../hooks/useRecordingStatus";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface TopBarProps {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onCreateMeeting?: () => void;
}

function formatRecordingLabel(startedAt: number, currentTime: number): string {
  const totalSeconds = Math.max(0, Math.floor((currentTime - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TopBar({
  searchValue,
  searchPlaceholder = "Search meetings...",
  onSearchChange,
  onCreateMeeting,
}: TopBarProps): JSX.Element {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { recordingStartedAt, now } = useRecordingStatus();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const recordingLabel = recordingStartedAt ? formatRecordingLabel(recordingStartedAt, now) : null;

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between border-b border-border bg-canvas/85 px-8 py-8 backdrop-blur">
      <div className="w-36" />
      <div className="relative w-full max-w-[400px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
        <Input
          ref={inputRef}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>
      <div className="flex min-w-[240px] items-center justify-end gap-3">
        {recordingLabel ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            Recording - {recordingLabel}
          </div>
        ) : null}
        {onCreateMeeting ? (
          <Button onClick={onCreateMeeting} className="h-11 px-5">
            + New meeting
          </Button>
        ) : null}
        <Button variant="secondary" className="h-11 w-11 rounded-full p-0" onClick={() => navigate("/settings")}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
