import { safeStorage } from "electron";
import type { Settings } from "../../src/types";
import { callDatabaseWorker } from "../db/worker-client";
import {
  fromStorageKey,
  hydrateSettingsFromStorageEntries,
  sensitiveSettingsKeys,
  serializeSettingsToStorageEntries,
} from "./schema";

const ENCRYPTED_SETTING_PREFIX = "safe:";

function ensureEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "Secure storage is unavailable on this Mac right now, so NoteFlow cannot save or read Notion and Gemini API keys.",
    );
  }
}

function encryptSettingValue(key: keyof Settings, value: string): string {
  if (!sensitiveSettingsKeys.has(key) || value.length === 0) {
    return value;
  }

  ensureEncryptionAvailable();
  return `${ENCRYPTED_SETTING_PREFIX}${safeStorage.encryptString(value).toString("base64")}`;
}

function decryptSettingValue(key: keyof Settings, value: string): string {
  if (!sensitiveSettingsKeys.has(key) || value.length === 0 || !value.startsWith(ENCRYPTED_SETTING_PREFIX)) {
    return value;
  }

  ensureEncryptionAvailable();

  try {
    const encryptedBuffer = Buffer.from(value.slice(ENCRYPTED_SETTING_PREFIX.length), "base64");
    return safeStorage.decryptString(encryptedBuffer);
  } catch (error) {
    throw new Error(
      `NoteFlow could not decrypt the stored ${key} value on this Mac. Re-enter that credential in Settings.`,
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

function decryptStorageEntries(storageEntries: Record<string, string>): Record<string, string> {
  const decryptedEntries = { ...storageEntries };

  for (const [storageKey, value] of Object.entries(storageEntries)) {
    const mappedKey = fromStorageKey(storageKey);
    if (!mappedKey || !sensitiveSettingsKeys.has(mappedKey)) {
      continue;
    }

    decryptedEntries[storageKey] = decryptSettingValue(mappedKey, value);
  }

  return decryptedEntries;
}

export async function getSecureSettings(): Promise<Settings> {
  const storageEntries = await callDatabaseWorker<Record<string, string>>("settings:getAll");
  return hydrateSettingsFromStorageEntries(decryptStorageEntries(storageEntries));
}

export async function setSecureSettings(partialSettings: Partial<Settings>): Promise<Settings> {
  const storageEntries = serializeSettingsToStorageEntries(partialSettings);
  const encryptedEntries = { ...storageEntries };

  for (const [storageKey, value] of Object.entries(storageEntries)) {
    const mappedKey = fromStorageKey(storageKey);
    if (!mappedKey || !sensitiveSettingsKeys.has(mappedKey)) {
      continue;
    }

    encryptedEntries[storageKey] = encryptSettingValue(mappedKey, value);
  }

  await callDatabaseWorker("settings:setRaw", encryptedEntries);
  return getSecureSettings();
}
