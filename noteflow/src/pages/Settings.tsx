import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import Button from "../components/ui/Button";
import { useSettingsStore } from "../store/settings.store";
import type { Settings } from "../types";

export default function SettingsPage(): JSX.Element {
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async (): Promise<void> => {
    await saveSettings(draft);
  };

  return (
    <AppShell topBar={<TopBar searchValue="" onSearchChange={() => undefined} />}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">Settings</p>
          <h1 className="mt-2 font-display text-4xl text-user">Local configuration</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
            Phase 1 only exposes safe renderer-facing settings. AI keys and OAuth secrets stay out of the renderer until a secure storage flow is added in later phases.
          </p>
        </div>

        <section className="panel-surface space-y-6 p-8">
          <div className="grid gap-3 md:grid-cols-[180px,1fr] md:items-center">
            <label htmlFor="theme" className="text-sm font-medium text-user">
              Theme
            </label>
            <select
              id="theme"
              value={draft.theme}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  theme: event.target.value as Settings["theme"],
                }))
              }
              className="h-11 rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-sm text-secondary">{isLoading ? "Loading settings from SQLite…" : "Theme preference is stored locally on this Mac."}</p>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
