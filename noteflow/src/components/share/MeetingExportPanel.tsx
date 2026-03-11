import { useEffect, useMemo, useState } from "react";
import { noteflowIpc } from "../../lib/ipc";
import type {
  DriveExportOutcome,
  DriveStatusResult,
  Meeting,
  MeetingSyncSelection,
  NotionStatusResult,
  NotionSyncOutcome,
} from "../../types";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

type MeetingExportPanelProps = {
  meeting: Meeting;
};

const DEFAULT_SELECTION: MeetingSyncSelection = {
  includeUserNotes: true,
  includeAiNotes: false,
  includeTranscript: false,
};

type ActionState = "idle" | "loading";

export default function MeetingExportPanel({ meeting }: MeetingExportPanelProps): JSX.Element {
  const [selection, setSelection] = useState<MeetingSyncSelection>(DEFAULT_SELECTION);
  const [notionStatus, setNotionStatus] = useState<NotionStatusResult | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatusResult | null>(null);
  const [notionState, setNotionState] = useState<ActionState>("idle");
  const [driveState, setDriveState] = useState<ActionState>("idle");
  const [notionResult, setNotionResult] = useState<NotionSyncOutcome | null>(null);
  const [driveResult, setDriveResult] = useState<DriveExportOutcome | null>(null);

  useEffect(() => {
    let isMounted = true;

    void Promise.allSettled([noteflowIpc.notion.status(), noteflowIpc.drive.status()]).then(([notion, drive]) => {
      if (!isMounted) {
        return;
      }

      if (notion.status === "fulfilled") {
        setNotionStatus(notion.value);
      }

      if (drive.status === "fulfilled") {
        setDriveStatus(drive.value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [meeting.id]);

  const selectionSummary = useMemo(
    () =>
      [
        selection.includeUserNotes ? "user notes" : null,
        selection.includeAiNotes ? "AI blocks" : null,
        selection.includeTranscript ? "transcript" : null,
      ]
        .filter(Boolean)
        .join(", "),
    [selection],
  );

  const updateSelection = <Key extends keyof MeetingSyncSelection>(key: Key, value: boolean): void => {
    setSelection((currentSelection) => ({
      ...currentSelection,
      [key]: value,
    }));
  };

  const handleNotionSync = async (): Promise<void> => {
    setNotionState("loading");
    setNotionResult(null);
    try {
      const result = await noteflowIpc.notion.sync({
        meetingId: meeting.id,
        selection,
      });
      setNotionResult(result);
    } finally {
      setNotionState("idle");
    }
  };

  const handleDriveExport = async (): Promise<void> => {
    setDriveState("loading");
    setDriveResult(null);
    try {
      const settings = await noteflowIpc.settings.get();
      const result = await noteflowIpc.drive.exportMeeting({
        meetingId: meeting.id,
        selection,
        folderId: settings.googleDriveFolderId.trim() || null,
      });
      setDriveResult(result);
      setDriveStatus(await noteflowIpc.drive.status());
    } finally {
      setDriveState("idle");
    }
  };

  return (
    <section className="panel-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-user">Share & export</p>
          <p className="max-w-2xl text-xs leading-5 text-secondary">
            Local SQLite stays the source of truth. Only the selected content leaves the app when you explicitly sync to Notion or upload a Markdown export to Google Drive.
          </p>
        </div>
        <Badge className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300">
          Local-first
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Choose content</p>
          <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={selection.includeUserNotes}
              onChange={(event) => updateSelection("includeUserNotes", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
            />
            <div>
              <p className="text-sm font-medium text-user">User notes</p>
              <p className="text-xs text-secondary">Recommended. Sync only the notes you authored or edited.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={selection.includeAiNotes}
              onChange={(event) => updateSelection("includeAiNotes", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
            />
            <div>
              <p className="text-sm font-medium text-user">AI enhancements</p>
              <p className="text-xs text-secondary">Include generated rewrite blocks alongside your notes.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={selection.includeTranscript}
              onChange={(event) => updateSelection("includeTranscript", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
            />
            <div>
              <p className="text-sm font-medium text-user">Transcript</p>
              <p className="text-xs text-secondary">Keep this off if you only want curated notes outside the app.</p>
            </div>
          </label>

          <p className="text-xs text-secondary">
            Selected now: <span className="font-medium text-user">{selectionSummary || "nothing"}</span>
          </p>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.03]">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-user">Notion</p>
              <Badge className={notionStatus?.configured ? "" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}>
                {notionStatus?.configured ? "Configured" : "Needs setup"}
              </Badge>
            </div>
            <p className="text-xs text-secondary">
              Manual sync only. Nothing is sent until you click the button below.
            </p>
            <Button
              className="h-10 w-full"
              onClick={() => {
                void handleNotionSync();
              }}
              disabled={notionState === "loading" || !notionStatus?.configured || !selectionSummary}
            >
              {notionState === "loading" ? "Syncing…" : "Sync selected content to Notion"}
            </Button>
            {notionResult ? (
              notionResult.ok ? (
                <p className="text-xs text-green-700 dark:text-green-300">
                  Synced successfully.{" "}
                  <a href={notionResult.pageUrl} target="_blank" rel="noreferrer" className="underline">
                    Open page
                  </a>
                </p>
              ) : (
                <p className="text-xs text-accent">{notionResult.error}</p>
              )
            ) : null}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-user">Google Drive</p>
              <Badge className={driveStatus?.authenticated ? "" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}>
                {driveStatus?.authenticated ? driveStatus.email ?? "Connected" : "Needs login"}
              </Badge>
            </div>
            <p className="text-xs text-secondary">
              Uploads a local Markdown export via `gws`. Run <code>gws auth login</code> first if Drive is not connected.
            </p>
            <Button
              variant="secondary"
              className="h-10 w-full"
              onClick={() => {
                void handleDriveExport();
              }}
              disabled={driveState === "loading" || !selectionSummary}
            >
              {driveState === "loading" ? "Uploading…" : "Export selected content to Drive"}
            </Button>
            {driveStatus?.error ? <p className="text-xs text-secondary">{driveStatus.error}</p> : null}
            {driveResult ? (
              driveResult.ok ? (
                <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                  <p>Uploaded {driveResult.fileName}.</p>
                  <p className="break-all text-secondary">Local copy: {driveResult.localPath}</p>
                  {driveResult.webViewLink ? (
                    <a href={driveResult.webViewLink} target="_blank" rel="noreferrer" className="underline">
                      Open in Drive
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-accent">{driveResult.error}</p>
              )
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
