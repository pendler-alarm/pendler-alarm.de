 
import { getLocale, translate } from '@/i18n';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import { getCachedGeoLocation, storeCachedGeoLocation } from '@/lib/geo-cache';
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

const paramsToObject = (params: URLSearchParams): Record<string, string> =>
  Object.fromEntries(params.entries());

const requestMotis = async <T>(
  label: 'geocode' | 'reverse-geocode',
  url: string,
  query: Record<string, string>,
  cacheKey?: string,
  cachedResponse?: T,
): Promise<T> => {
  const requestId = startApiRequest('motis', label, {
    method: 'GET',
    url,
    query,
    requestJson: query,
    requestHeaders: {
      Accept: 'application/json',
    },
    cacheHit: cachedResponse !== undefined,
    cacheKey,
    cacheSource: cachedResponse !== undefined ? 'localStorage' : undefined,
  });

  if (cachedResponse !== undefined) {
    finishApiRequest(requestId, 'success', 200, {
      responseJson: cachedResponse,
      cacheHit: true,
      cacheKey,
      cacheSource: 'localStorage',
      note: translate('views.dashboard.events.debug.history.errors.cacheServed'),
    });
    return cachedResponse;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    finishApiRequest(requestId, 'error', null, {
      errorKind: 'network',
      errorMessage: error instanceof Error ? error.message : translate('views.dashboard.events.debug.history.errors.unknownFetch'),
      cacheHit: false,
      cacheKey,
    });
    throw error;
  }

  let responseJson: unknown = null;

  try {
    responseJson = await response.json();
  } catch (error) {
    finishApiRequest(requestId, 'error', response.status, {
      errorKind: 'invalid-json',
      errorMessage: error instanceof Error ? error.message : translate('views.dashboard.events.debug.history.errors.invalidJson'),
      cacheHit: false,
      cacheKey,
    });
    throw error;
  }

  if (!response.ok) {
    finishApiRequest(requestId, 'error', response.status, {
      responseJson,
      errorKind: 'http',
      errorMessage: translate('calendar.error.motisFailed', { status: response.status }),
      cacheHit: false,
      cacheKey,
    });
    throw new Error(translate('calendar.error.motisFailed', { status: response.status }));
  }

  finishApiRequest(requestId, 'success', response.status, {
    responseJson,
    responseHeaders: {
      'content-type': response.headers.get('content-type') ?? '',
    },
    cacheHit: false,
    cacheKey,
  });

  return responseJson as T;
};

export const formatCoordinates = ({ lat, lon }: Coordinates): string =>
  `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

export const createPlaceQuery = ({ lat, lon }: Coordinates): string => `${lat},${lon}`;

const createGeocodeCacheKey = (text: string): string => `geocode:${text.trim().toLocaleLowerCase(getLocale())}`;

const createReverseGeocodeCacheKey = (coordinates: Coordinates): string =>
  `reverse:${coordinates.lat.toFixed(6)},${coordinates.lon.toFixed(6)}`;

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
  const cacheKey = createReverseGeocodeCacheKey(coordinates);
  const cached = getCachedGeoLocation(cacheKey);
  const url = `${MOTIS_API_REVERSE_GEOCODE}?${params.toString()}`;
  const matches = await requestMotis<MotisMatch[]>(
    'reverse-geocode',
    url,
    paramsToObject(params),
    cacheKey,
    cached ? [{
      name: cached.address ?? undefined,
      lat: cached.coordinates?.lat,
      lon: cached.coordinates?.lon,
    }] : undefined,
  );
  const bestMatch = matches.find((candidate) => isFiniteNumber(candidate.lat) && isFiniteNumber(candidate.lon));

  const resolved = {
    address: formatAddress(bestMatch, cached?.address ?? null),
    coordinates: bestMatch && isFiniteNumber(bestMatch.lat) && isFiniteNumber(bestMatch.lon)
      ? { lat: bestMatch.lat, lon: bestMatch.lon }
      : cached?.coordinates ?? coordinates,
  } satisfies ResolvedLocation;

  storeCachedGeoLocation(cacheKey, resolved);
  return resolved;
};

export const geocodeLocation = async (text: string): Promise<ResolvedLocation> => {
  const params = new URLSearchParams({
    text,
  });

  params.append('language', getLocale());

  const cacheKey = createGeocodeCacheKey(text);
  const cached = getCachedGeoLocation(cacheKey);
  const url = `${MOTIS_API_GEOCODE}?${params.toString()}`;
  const matches = await requestMotis<MotisMatch[]>(
    'geocode',
    url,
    paramsToObject(params),
    cacheKey,
    cached ? [{
      name: cached.address ?? undefined,
      lat: cached.coordinates?.lat,
      lon: cached.coordinates?.lon,
    }] : undefined,
  );
  const bestMatch = matches.find((candidate) => isFiniteNumber(candidate.lat) && isFiniteNumber(candidate.lon));

  const resolved = {
    address: formatAddress(bestMatch, text),
    coordinates: bestMatch && isFiniteNumber(bestMatch.lat) && isFiniteNumber(bestMatch.lon)
      ? { lat: bestMatch.lat, lon: bestMatch.lon }
      : cached?.coordinates ?? null,
  } satisfies ResolvedLocation;

  storeCachedGeoLocation(cacheKey, resolved);
  return resolved;
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
