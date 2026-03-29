import { getDefaultReleaseMeta } from '@/lib/release-meta';

const APP_VERSION_STORAGE_KEY = 'pendler-alarm.app-version';

export const getStoredAppVersion = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(APP_VERSION_STORAGE_KEY);
  return value?.trim() ? value : null;
};

export const getInitialAppVersion = (): string => getStoredAppVersion() ?? getDefaultReleaseMeta().appVersion;

export const storeAppVersion = (version: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedVersion = version.trim();

  if (!normalizedVersion) {
    return;
  }

  window.localStorage.setItem(APP_VERSION_STORAGE_KEY, normalizedVersion);
};
