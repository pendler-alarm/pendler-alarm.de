import type { Coordinates, ResolvedLocation } from '@/features/motis/location-service';

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

const loadCache = (): GeoCacheStore => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, normalizeEntry(value)] as const)
        .filter((entry): entry is [string, GeoCacheValue] => entry[1] !== null),
    );
  } catch {
    return {};
  }
};

let cache = loadCache();

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
