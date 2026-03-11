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

function encryptSettingValue(key: keyof Settings, value: string): string {
  if (!sensitiveSettingsKeys.has(key) || value.length === 0 || !safeStorage.isEncryptionAvailable()) {
    return value;
  }

  return `${ENCRYPTED_SETTING_PREFIX}${safeStorage.encryptString(value).toString("base64")}`;
}

function decryptSettingValue(key: keyof Settings, value: string): string {
  if (!sensitiveSettingsKeys.has(key) || value.length === 0 || !value.startsWith(ENCRYPTED_SETTING_PREFIX)) {
    return value;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return "";
  }

  try {
    const encryptedBuffer = Buffer.from(value.slice(ENCRYPTED_SETTING_PREFIX.length), "base64");
    return safeStorage.decryptString(encryptedBuffer);
  } catch {
    return "";
  }
}

function decryptStorageEntries(storageEntries: Record<string, string>): Record<string, string> {
  return Object.entries(storageEntries).reduce<Record<string, string>>((accumulator, [storageKey, value]) => {
    const mappedKey = fromStorageKey(storageKey);
    accumulator[storageKey] = mappedKey ? decryptSettingValue(mappedKey, value) : value;
    return accumulator;
  }, {});
}

export async function getSecureSettings(): Promise<Settings> {
  const storageEntries = await callDatabaseWorker<Record<string, string>>("settings:getAll");
  return hydrateSettingsFromStorageEntries(decryptStorageEntries(storageEntries));
}

export async function setSecureSettings(partialSettings: Partial<Settings>): Promise<Settings> {
  const storageEntries = serializeSettingsToStorageEntries(partialSettings);
  const encryptedEntries = Object.entries(storageEntries).reduce<Record<string, string>>(
    (accumulator, [storageKey, value]) => {
      const mappedKey = fromStorageKey(storageKey);
      accumulator[storageKey] = mappedKey ? encryptSettingValue(mappedKey, value) : value;
      return accumulator;
    },
    {},
  );

  await callDatabaseWorker("settings:setRaw", encryptedEntries);
  return getSecureSettings();
}
