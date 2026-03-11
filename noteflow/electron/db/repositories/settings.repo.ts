import { getDatabase } from "../database";
import type { Settings } from "../../../src/types";

const NOTION_SYNC_TARGET_STORAGE_KEY = "notion_database_id";

const settingsKeyMap = {
  googleAiKey: "google_ai_key",
  notionApiKey: "notion_api_key",
  // The Notion sync IPC still reads the historical database key directly.
  // Keep this alias stable until the sync layer is migrated end-to-end.
  notionParentPageId: NOTION_SYNC_TARGET_STORAGE_KEY,
  theme: "theme",
} as const satisfies Record<keyof Settings, string>;

const defaultSettings: Settings = {
  googleAiKey: "",
  notionApiKey: "",
  notionParentPageId: "",
  theme: "system",
};

function toStorageKey(key: keyof Settings): string {
  return settingsKeyMap[key];
}

function fromStorageKey(key: string): keyof Settings | null {
  const matches = Object.entries(settingsKeyMap).find(([, storageKey]) => storageKey === key);
  return (matches?.[0] as keyof Settings | undefined) ?? null;
}

function parseSettingValue<Key extends keyof Settings>(key: Key, value: string): Settings[Key] {
  if (key === "theme") {
    return value as Settings[Key];
  }

  return value as Settings[Key];
}

function assignSettingValue<Key extends keyof Settings>(
  settings: Partial<Settings>,
  key: Key,
  value: Settings[Key],
): void {
  settings[key] = value;
}

export function getSettings(): Settings {
  const rows = getDatabase()
    .prepare("SELECT key, value FROM settings")
    .all() as Array<{ key: string; value: string }>;

  const overrides = rows.reduce<Partial<Settings>>((accumulator, row) => {
    const mappedKey = fromStorageKey(row.key);
    if (!mappedKey) {
      return accumulator;
    }

    assignSettingValue(accumulator, mappedKey, parseSettingValue(mappedKey, row.value));
    return accumulator;
  }, {});

  return {
    ...defaultSettings,
    ...overrides,
  };
}

export function getAllSettings(): Record<string, string> {
  const rows = getDatabase()
    .prepare("SELECT key, value FROM settings")
    .all() as Array<{ key: string; value: string }>;

  return rows.reduce<Record<string, string>>((accumulator, row) => {
    accumulator[row.key] = row.value;
    return accumulator;
  }, {});
}

export function getSetting<Key extends keyof Settings>(key: Key): Settings[Key] {
  return getSettings()[key];
}

export function setSettings(partialSettings: Partial<Settings>): Settings {
  const db = getDatabase();
  const statement = db.prepare(
    `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  );

  const transaction = db.transaction(() => {
    Object.entries(partialSettings).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      statement.run(toStorageKey(key as keyof Settings), String(value));
    });
  });

  transaction();
  return getSettings();
}

export function deleteSettings(keys: Array<keyof Settings>): Settings {
  const db = getDatabase();
  const statement = db.prepare("DELETE FROM settings WHERE key = ?");

  const transaction = db.transaction(() => {
    keys.forEach((key) => {
      statement.run(toStorageKey(key));
    });
  });

  transaction();
  return getSettings();
}
