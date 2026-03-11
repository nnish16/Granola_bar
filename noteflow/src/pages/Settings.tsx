import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import TopBar from "../components/layout/TopBar";
import { useSettingsStore } from "../store/settings.store";
import type { Settings } from "../types";

export default function SettingsPage(): JSX.Element {
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const error = useSettingsStore((state) => state.error);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const updateDraft = <Key extends keyof Settings>(key: Key, value: Settings[Key]): void => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  };

  const persistField = async <Key extends keyof Settings>(key: Key): Promise<void> => {
    await saveSettings({
      [key]: draft[key],
    } as Pick<Settings, Key>);
  };

  return (
    <AppShell topBar={<TopBar searchValue="" onSearchChange={() => undefined} />}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">Settings</p>
          <h1 className="mt-2 font-display text-4xl text-user">Local configuration</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
            These values are stored locally in SQLite on this Mac. Add the credentials here to enable Notion sync and Gemini-based note enhancement.
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
              onBlur={() => {
                void persistField("theme");
              }}
              onChange={(event) => updateDraft("theme", event.target.value as Settings["theme"])}
              className="h-11 rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px,1fr] md:items-center">
            <label htmlFor="notion-api-key" className="text-sm font-medium text-user">
              Notion API Key
            </label>
            <input
              id="notion-api-key"
              type="password"
              value={draft.notionApiKey}
              onBlur={() => {
                void persistField("notionApiKey");
              }}
              onChange={(event) => updateDraft("notionApiKey", event.target.value)}
              className="h-11 rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900"
              placeholder="secret_xxx"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[180px,1fr] md:items-center">
            <label htmlFor="notion-parent-page-id" className="text-sm font-medium text-user">
              Notion Parent Page ID
            </label>
            <div className="space-y-2">
              <input
                id="notion-parent-page-id"
                type="text"
                value={draft.notionParentPageId}
                onBlur={() => {
                  void persistField("notionParentPageId");
                }}
                onChange={(event) => updateDraft("notionParentPageId", event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900"
                placeholder="page or database ID"
              />
              <p className="text-xs text-secondary">
                Use the shared Notion database or page target ID that NoteFlow should sync into.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px,1fr] md:items-center">
            <label htmlFor="google-ai-key" className="text-sm font-medium text-user">
              Google AI Studio API Key
            </label>
            <input
              id="google-ai-key"
              type="password"
              value={draft.googleAiKey}
              onBlur={() => {
                void persistField("googleAiKey");
              }}
              onChange={(event) => updateDraft("googleAiKey", event.target.value)}
              className="h-11 rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900"
              placeholder="AIza..."
            />
          </div>

          <div className="border-t border-border pt-6 text-sm text-secondary">
            <p>{isLoading ? "Loading settings from SQLite…" : isSaving ? "Saving changes…" : "Changes save on blur."}</p>
            {error ? <p className="mt-2 text-accent">{error}</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
