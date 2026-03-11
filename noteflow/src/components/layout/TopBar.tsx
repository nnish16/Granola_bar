import { Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface TopBarProps {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onCreateMeeting?: () => void;
}

export default function TopBar({
  searchValue,
  searchPlaceholder = "Search meetings and attendees",
  onSearchChange,
  onCreateMeeting,
}: TopBarProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between border-b border-border bg-canvas/85 px-8 py-8 backdrop-blur">
      <div className="w-36" />
      <div className="relative w-full max-w-[400px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>
      <div className="flex w-36 items-center justify-end gap-3">
        {onCreateMeeting ? (
          <Button onClick={onCreateMeeting} className="h-11 px-5">
            + New
          </Button>
        ) : null}
        <Button variant="secondary" className="h-11 w-11 rounded-full p-0" onClick={() => navigate("/settings")}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
