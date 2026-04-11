import type { Coordinates } from '@/features/motis/location-service';

export type OriginMode = 'current' | 'fixed';

export type FavoriteLocation = {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates | null;
};

export type StoredOriginPreferences = {
  mode: OriginMode;
  fixedLocationInput: string;
  favorites: FavoriteLocation[];
};

const STORAGE_KEY = 'pendler-alarm.origin-preferences';

const defaultPreferences: StoredOriginPreferences = {
  mode: 'current',
  fixedLocationInput: '',
  favorites: [],
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeCoordinates = (value: unknown): Coordinates | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const coordinates = value as Partial<Coordinates>;

  if (!isFiniteNumber(coordinates.lat) || !isFiniteNumber(coordinates.lon)) {
    return null;
  }

  return {
    lat: coordinates.lat,
    lon: coordinates.lon,
  };
};

const normalizeFavorite = (value: unknown): FavoriteLocation | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const favorite = value as Partial<FavoriteLocation>;
  const id = favorite.id?.trim();
  const name = favorite.name?.trim();
  const address = favorite.address?.trim();

  if (!id || !name || !address) {
    return null;
  }

  return {
    id,
    name,
    address,
    coordinates: normalizeCoordinates(favorite.coordinates),
  };
};

export const loadStoredOriginPreferences = (): StoredOriginPreferences => {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<StoredOriginPreferences> | null;

    return {
      mode: parsed?.mode === 'fixed' ? 'fixed' : 'current',
      fixedLocationInput: parsed?.fixedLocationInput?.trim() ?? '',
      favorites: Array.isArray(parsed?.favorites)
        ? parsed.favorites
          .map((favorite) => normalizeFavorite(favorite))
          .filter((favorite): favorite is FavoriteLocation => favorite !== null)
        : [],
    };
  } catch {
    return defaultPreferences;
  }
};

export const storeOriginPreferences = (preferences: StoredOriginPreferences): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage errors.
  }
};
