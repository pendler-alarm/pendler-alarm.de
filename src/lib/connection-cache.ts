import type { ConnectionSummary } from '@/features/motis/routing-service';
import { localStorageStore } from '@/lib/storage';

type CachedConnection = {
  connection: ConnectionSummary;
  fetchedAt: string;
};

type ConnectionCacheEntry = {
  latest: CachedConnection;
  history: CachedConnection[];
};

const STORAGE_KEY = 'pendler_alarm_connection_cache_v3';
const MAX_HISTORY = 6;

const loadCache = (): Record<string, ConnectionCacheEntry> => localStorageStore.getJson(STORAGE_KEY, (value) => (
  value && typeof value === 'object' ? value as Record<string, ConnectionCacheEntry> : null
)) ?? {};

const createCacheKey = (eventId: string, requestedBufferMinutes: number): string =>
  `${eventId}:${requestedBufferMinutes}`;

let cache: Record<string, ConnectionCacheEntry> = loadCache();

const saveCache = (): void => {
  localStorageStore.setJson(STORAGE_KEY, cache);
};

export const getCachedConnection = (eventId: string, requestedBufferMinutes: number): ConnectionCacheEntry | null =>
  cache[createCacheKey(eventId, requestedBufferMinutes)] ?? null;

export const storeConnection = (
  eventId: string,
  requestedBufferMinutes: number,
  connection: ConnectionSummary,
  fetchedAt: string,
): void => {
  const cacheKey = createCacheKey(eventId, requestedBufferMinutes);
  const entry: CachedConnection = { connection, fetchedAt };
  const existing = cache[cacheKey];
  const history = existing?.history ?? [];
  const mergedHistory = [
    entry,
    ...history.filter((item) => item.fetchedAt !== fetchedAt),
  ].slice(0, MAX_HISTORY);

  cache = {
    ...cache,
    [cacheKey]: {
      latest: entry,
      history: mergedHistory,
    },
  };

  saveCache();
};
