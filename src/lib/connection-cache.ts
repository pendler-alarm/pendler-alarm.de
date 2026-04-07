import type { ConnectionSummary } from '@/features/motis/routing-service';

type CachedConnection = {
  connection: ConnectionSummary;
  fetchedAt: string;
};

type ConnectionCacheEntry = {
  latest: CachedConnection;
  history: CachedConnection[];
};

const STORAGE_KEY = 'pendler_alarm_connection_cache_v2';
const MAX_HISTORY = 6;

const loadCache = (): Record<string, ConnectionCacheEntry> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, ConnectionCacheEntry> | null;
    return parsed ?? {};
  } catch {
    return {};
  }
};

let cache: Record<string, ConnectionCacheEntry> = loadCache();

const saveCache = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors.
  }
};

export const getCachedConnection = (eventId: string): ConnectionCacheEntry | null =>
  cache[eventId] ?? null;

export const storeConnection = (
  eventId: string,
  connection: ConnectionSummary,
  fetchedAt: string,
): void => {
  const entry: CachedConnection = { connection, fetchedAt };
  const existing = cache[eventId];
  const history = existing?.history ?? [];
  const mergedHistory = [
    entry,
    ...history.filter((item) => item.fetchedAt !== fetchedAt),
  ].slice(0, MAX_HISTORY);

  cache = {
    ...cache,
    [eventId]: {
      latest: entry,
      history: mergedHistory,
    },
  };

  saveCache();
};
