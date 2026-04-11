import { getDefaultReleaseMeta } from '@/lib/release-meta';
import { localStorageStore } from '@/lib/storage';

const APP_VERSION_STORAGE_KEY = 'pendler-alarm.app-version';

export const getStoredAppVersion = (): string | null => {
  const value = localStorageStore.getString(APP_VERSION_STORAGE_KEY);
  return value?.trim() ? value : null;
};

export const getInitialAppVersion = (): string => getStoredAppVersion() ?? getDefaultReleaseMeta().appVersion;

export const storeAppVersion = (version: string): void => {
  const normalizedVersion = version.trim();

  if (!normalizedVersion) {
    return;
  }

  localStorageStore.setString(APP_VERSION_STORAGE_KEY, normalizedVersion);
};
