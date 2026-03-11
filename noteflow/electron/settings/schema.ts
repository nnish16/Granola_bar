import type { Settings } from "../../src/types";

export const NOTION_SYNC_TARGET_STORAGE_KEY = "notion_database_id";

export const settingsKeyMap = {
  googleDriveFolderId: "google_drive_folder_id",
  googleAiKey: "google_ai_key",
  notionApiKey: "notion_api_key",
  notionParentPageId: NOTION_SYNC_TARGET_STORAGE_KEY,
  theme: "theme",
} as const satisfies Record<keyof Settings, string>;

export const defaultSettings: Settings = {
  googleDriveFolderId: "",
  googleAiKey: "",
  notionApiKey: "",
  notionParentPageId: "",
  theme: "system",
};

export const sensitiveSettingsKeys = new Set<keyof Settings>(["googleAiKey", "notionApiKey"]);

export function toStorageKey(key: keyof Settings): string {
  return settingsKeyMap[key];
}

export function fromStorageKey(key: string): keyof Settings | null {
  const matches = Object.entries(settingsKeyMap).find(([, storageKey]) => storageKey === key);
  return (matches?.[0] as keyof Settings | undefined) ?? null;
}

export function parseSettingValue<Key extends keyof Settings>(key: Key, value: string): Settings[Key] {
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

export function hydrateSettingsFromStorageEntries(storageEntries: Record<string, string>): Settings {
  const overrides = Object.entries(storageEntries).reduce<Partial<Settings>>((accumulator, [storageKey, value]) => {
    const mappedKey = fromStorageKey(storageKey);
    if (!mappedKey) {
      return accumulator;
    }

    assignSettingValue(accumulator, mappedKey, parseSettingValue(mappedKey, value));
    return accumulator;
  }, {});

  return {
    ...defaultSettings,
    ...overrides,
  };
}

export function serializeSettingsToStorageEntries(settings: Partial<Settings>): Record<string, string> {
  return Object.entries(settings).reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (value === undefined) {
      return accumulator;
    }

    accumulator[toStorageKey(key as keyof Settings)] = String(value);
    return accumulator;
  }, {});
}
