import { getDatabase } from "../database";
import { hydrateSettingsFromStorageEntries } from "../../settings/schema";

type SettingRow = { key: string; value: string };

function listSettingRows(): SettingRow[] {
  return getDatabase()
    .prepare("SELECT key, value FROM settings")
    .all() as SettingRow[];
}

export function getAllSettings(): Record<string, string> {
  return listSettingRows().reduce<Record<string, string>>((accumulator, row) => {
    accumulator[row.key] = row.value;
    return accumulator;
  }, {});
}

export function getSettings() {
  return hydrateSettingsFromStorageEntries(getAllSettings());
}

export function setRawSettings(settingsEntries: Record<string, string>): Record<string, string> {
  const db = getDatabase();
  const statement = db.prepare(
    `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  );

  const transaction = db.transaction(() => {
    Object.entries(settingsEntries).forEach(([key, value]) => {
      statement.run(key, value);
    });
  });

  transaction();
  return getAllSettings();
}
