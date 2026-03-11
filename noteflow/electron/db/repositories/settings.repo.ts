import { getDatabase } from "../database";
import type { Settings } from "../../../src/types";

const defaultSettings: Settings = {
  theme: "system",
};

function parseSettingValue(value: string): string {
  return value;
}

export function getSettings(): Settings {
  const rows = getDatabase()
    .prepare("SELECT key, value FROM settings")
    .all() as Array<{ key: keyof Settings; value: string }>;

  const overrides = rows.reduce<Partial<Settings>>((accumulator, row) => {
    accumulator[row.key] = parseSettingValue(row.value) as never;
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

      statement.run(key, String(value));
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
      statement.run(key);
    });
  });

  transaction();
  return getSettings();
}
