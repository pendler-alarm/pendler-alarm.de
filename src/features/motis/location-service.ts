import { getLocale, translate } from '@/i18n';
import { MOTIS_API_GEOCODE, MOTIS_API_REVERSE_GEOCODE } from '@/utils/constants/api';

export type Coordinates = {
  lat: number;
  lon: number;
};

export type ResolvedLocation = {
  address: string | null;
  coordinates: Coordinates | null;
};

type MotisArea = {
  name?: string;
};

type MotisMatch = {
  name?: string;
  lat?: number;
  lon?: number;
  street?: string;
  houseNumber?: string;
  zip?: string;
  areas?: MotisArea[];
};

const coordinatesPattern = /^\s*(-?\d+(?:\.\d+)?)\s*[,;/ ]\s*(-?\d+(?:\.\d+)?)\s*$/;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidCoordinates = (coordinates: Coordinates): boolean =>
  coordinates.lat >= -90
  && coordinates.lat <= 90
  && coordinates.lon >= -180
  && coordinates.lon <= 180;

const dedupeParts = (parts: Array<string | undefined>): string | null => {
  const seen = new Set<string>();
  const normalized = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      if (seen.has(part)) {
        return false;
      }

      seen.add(part);
      return true;
    });

  return normalized.length > 0 ? normalized.join(', ') : null;
};

const formatAddress = (match?: MotisMatch, fallback?: string | null): string | null => {
  if (!match) {
    return fallback?.trim() || null;
  }

  const streetLine = [match.street?.trim(), match.houseNumber?.trim()]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();

  const areaNames = Array.isArray(match.areas)
    ? match.areas
      .map((area) => area.name?.trim())
      .filter((area): area is string => Boolean(area))
    : [];

  const locality = [match.zip?.trim(), areaNames.join(', ').trim()]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();

  return dedupeParts([
    streetLine || undefined,
    locality || undefined,
    match.name?.trim(),
    fallback ?? undefined,
  ]);
};

const requestMotis = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(translate('calendar.error.motisFailed', { status: response.status }));
  }

  return (await response.json()) as T;
};

export const formatCoordinates = ({ lat, lon }: Coordinates): string =>
  `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

export const createPlaceQuery = ({ lat, lon }: Coordinates): string => `${lat},${lon}`;

export const parseCoordinatesFromText = (value?: string | null): Coordinates | null => {
  if (!value) {
    return null;
  }

  const match = value.match(coordinatesPattern);

  if (!match) {
    return null;
  }

  const [, rawLat, rawLon] = match;

  if (!rawLat || !rawLon) {
    return null;
  }

  const lat = Number.parseFloat(rawLat);
  const lon = Number.parseFloat(rawLon);
  const coordinates = { lat, lon };

  return isValidCoordinates(coordinates) ? coordinates : null;
};

export const reverseGeocodeLocation = async (coordinates: Coordinates): Promise<ResolvedLocation> => {
  const params = new URLSearchParams({
    place: createPlaceQuery(coordinates),
  });

  const matches = await requestMotis<MotisMatch[]>(`${MOTIS_API_REVERSE_GEOCODE}?${params.toString()}`);
  const bestMatch = matches.find((candidate) => isFiniteNumber(candidate.lat) && isFiniteNumber(candidate.lon));

  return {
    address: formatAddress(bestMatch),
    coordinates: bestMatch && isFiniteNumber(bestMatch.lat) && isFiniteNumber(bestMatch.lon)
      ? { lat: bestMatch.lat, lon: bestMatch.lon }
      : coordinates,
  };
};

export const geocodeLocation = async (text: string): Promise<ResolvedLocation> => {
  const params = new URLSearchParams({
    text,
  });

  params.append('language', getLocale());

  const matches = await requestMotis<MotisMatch[]>(`${MOTIS_API_GEOCODE}?${params.toString()}`);
  const bestMatch = matches.find((candidate) => isFiniteNumber(candidate.lat) && isFiniteNumber(candidate.lon));

  return {
    address: formatAddress(bestMatch, text),
    coordinates: bestMatch && isFiniteNumber(bestMatch.lat) && isFiniteNumber(bestMatch.lon)
      ? { lat: bestMatch.lat, lon: bestMatch.lon }
      : null,
  };
};

export const resolveLocation = async (value?: string | null): Promise<ResolvedLocation> => {
  const normalized = value?.trim();

  if (!normalized) {
    return {
      address: null,
      coordinates: null,
    };
  }

  const coordinates = parseCoordinatesFromText(normalized);

  if (coordinates) {
    const resolved = await reverseGeocodeLocation(coordinates);

    return {
      address: resolved.address,
      coordinates: resolved.coordinates ?? coordinates,
    };
  }

  return geocodeLocation(normalized);
};

const resolveGeolocationError = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return translate('calendar.error.locationPermissionDenied');
  }

  if (error.code === error.TIMEOUT) {
    return translate('calendar.error.locationTimeout');
  }

  return translate('calendar.error.locationUnknown');
};

export const getCurrentResolvedLocation = async (): Promise<ResolvedLocation> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error(translate('calendar.error.locationUnavailable'));
  }

  const coordinates = await new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          lat: coords.latitude,
          lon: coords.longitude,
        });
      },
      (error) => reject(new Error(resolveGeolocationError(error))),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  });

  try {
    const resolved = await reverseGeocodeLocation(coordinates);

    return {
      address: resolved.address,
      coordinates,
    };
  } catch {
    return {
      address: null,
      coordinates,
    };
  }
};
