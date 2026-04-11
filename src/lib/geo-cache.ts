import type { Coordinates, ResolvedLocation } from '@/features/motis/location-service';
import { localStorageStore } from '@/lib/storage';

export type GeoCacheValue = ResolvedLocation & {
  fetchedAt: string;
};

type GeoCacheStore = Record<string, GeoCacheValue>;

const STORAGE_KEY = 'pendler_alarm_geo_cache_v1';
const MAX_ENTRIES = 80;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeCoordinates = (value: unknown): Coordinates | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<Coordinates>;

  if (!isFiniteNumber(candidate.lat) || !isFiniteNumber(candidate.lon)) {
    return null;
  }

  return {
    lat: candidate.lat,
    lon: candidate.lon,
  };
};

const normalizeEntry = (value: unknown): GeoCacheValue | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<GeoCacheValue>;

  return {
    address: typeof candidate.address === 'string' ? candidate.address : null,
    coordinates: normalizeCoordinates(candidate.coordinates),
    fetchedAt: typeof candidate.fetchedAt === 'string' ? candidate.fetchedAt : new Date(0).toISOString(),
  };
};

const loadCache = (): GeoCacheStore => localStorageStore.getJson(STORAGE_KEY, (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, normalizeEntry(entry)] as const)
      .filter((entry): entry is [string, GeoCacheValue] => entry[1] !== null),
  );
}) ?? {};

let cache = loadCache();

const saveCache = (): void => {
  localStorageStore.setJson(STORAGE_KEY, cache);
};

const pruneCache = (): void => {
  const entries = Object.entries(cache)
    .sort((left, right) => new Date(right[1].fetchedAt).getTime() - new Date(left[1].fetchedAt).getTime())
    .slice(0, MAX_ENTRIES);

  cache = Object.fromEntries(entries);
};

export const getCachedGeoLocation = (key: string): GeoCacheValue | null => cache[key] ?? null;

export const storeCachedGeoLocation = (key: string, value: ResolvedLocation): GeoCacheValue => {
  const entry: GeoCacheValue = {
    ...value,
    fetchedAt: new Date().toISOString(),
  };

  cache = {
    ...cache,
    [key]: entry,
  };

  pruneCache();
  saveCache();
  return entry;
};
