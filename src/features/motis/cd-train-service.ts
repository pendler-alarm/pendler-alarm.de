import { translate } from '@/i18n';
import type { Coordinates, ResolvedLocation } from '@/features/motis/location-service';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import { CD_WIFI_API_CURRENT, CD_WIFI_API_REALTIME } from '@/utils/constants/api';

const REQUEST_TIMEOUT_MS = 4_000;
const COMPLETED_STATE = 4;
export const CD_CARRIER_NAME = (): string => translate('views.dashboard.events.currentLocation.carrierCdName');
export const CD_CARRIER_LOGO_ICON = 'providers/cd';

type CdRealtimeResponse = {
  gpsLat?: number;
  gpsLng?: number;
  speed?: number;
};

type CdStation = {
  name?: string;
  gpsLat?: number;
  gpsLng?: number;
};

type CdConnexionTime = {
  state?: number;
  station?: CdStation;
};

type CdCurrentResponse = {
  name?: string;
  connexionTimes?: CdConnexionTime[];
};

export type CdTrainContext = {
  carrierLogoIcon: string;
  carrierName: string;
  finalStationName: string | null;
  nextStationCoordinates: Coordinates | null;
  nextStationName: string | null;
  originStationName: string | null;
  resolvedLocation: ResolvedLocation | null;
  speedKmh: number | null;
  trainName: string | null;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeIsp = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? '';

export const isCdWifiIsp = (value: string | null | undefined): boolean => {
  const isp = normalizeIsp(value);

  return /as25512/u.test(isp) || /cd[-\s]?telematika/u.test(isp);
};

const createCdUrl = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
};

const fetchCdJson = async <T>(label: 'cdwifi-current' | 'cdwifi-realtime', url: string): Promise<T> => {
  const requestId = startApiRequest('motis', label, {
    method: 'GET',
    url,
    requestHeaders: {
      Accept: 'application/json',
    },
  });

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const responseJson = await response.json() as T;

    finishApiRequest(requestId, response.ok ? 'success' : 'error', response.status, {
      responseJson,
    });

    if (!response.ok) {
      throw new Error(`${label}-${String(response.status)}`);
    }

    return responseJson;
  } catch (error) {
    finishApiRequest(requestId, 'error', null, {
      errorKind: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network',
      errorMessage: error instanceof Error ? error.message : `${label}-failed`,
    });
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const getCoordinates = (payload: CdRealtimeResponse): Coordinates | null => {
  if (!isFiniteNumber(payload.gpsLat) || !isFiniteNumber(payload.gpsLng)) {
    return null;
  }

  return {
    lat: payload.gpsLat,
    lon: payload.gpsLng,
  };
};

const getStationCoordinates = (station: CdStation | undefined): Coordinates | null => {
  if (!isFiniteNumber(station?.gpsLat) || !isFiniteNumber(station?.gpsLng)) {
    return null;
  }

  return {
    lat: station.gpsLat,
    lon: station.gpsLng,
  };
};

const toRadians = (value: number): number => value * (Math.PI / 180);

const getDistanceMeters = (from: Coordinates, to: Coordinates): number => {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const getStationName = (entry: CdConnexionTime | undefined): string | null =>
  entry?.station?.name?.trim() || null;

const getOriginStationName = (entries: CdConnexionTime[]): string | null =>
  getStationName(entries[0]);

const getFinalStationName = (entries: CdConnexionTime[]): string | null =>
  getStationName(entries[entries.length - 1]);

const getNextStationName = (entries: CdConnexionTime[]): string | null => {
  const nextEntry = entries.find((entry) => entry.state !== COMPLETED_STATE) ?? entries[entries.length - 1];
  return getStationName(nextEntry);
};

const getNearestStationName = (entries: CdConnexionTime[], coordinates: Coordinates): string | null => {
  const nearestEntry = entries
    .map((entry) => ({
      distanceMeters: getDistanceMeters(coordinates, getStationCoordinates(entry.station) ?? coordinates),
      name: getStationName(entry),
      stationCoordinates: getStationCoordinates(entry.station),
    }))
    .filter((entry) => entry.name && entry.stationCoordinates)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];

  return nearestEntry?.name ?? null;
};

const toResolvedLocation = (
  coordinates: Coordinates | null,
  entries: CdConnexionTime[],
): ResolvedLocation | null => {
  if (!coordinates) {
    return null;
  }

  return {
    address: getNearestStationName(entries, coordinates) ?? getNextStationName(entries) ?? getOriginStationName(entries),
    coordinates,
  };
};

const getLocalTime = (): string => String(Date.now());

export const fetchCdTrainContext = async (): Promise<CdTrainContext> => {
  const realtimeUrl = createCdUrl(CD_WIFI_API_REALTIME, {
    localTime: getLocalTime(),
  });
  const currentUrl = createCdUrl(CD_WIFI_API_CURRENT, {
    locale: 'en_GB',
    localTime: getLocalTime(),
  });
  const [realtime, current] = await Promise.all([
    fetchCdJson<CdRealtimeResponse>('cdwifi-realtime', realtimeUrl),
    fetchCdJson<CdCurrentResponse>('cdwifi-current', currentUrl),
  ]);
  const entries = Array.isArray(current.connexionTimes) ? current.connexionTimes : [];
  const coordinates = getCoordinates(realtime);

  return {
    carrierLogoIcon: CD_CARRIER_LOGO_ICON,
    carrierName: CD_CARRIER_NAME(),
    finalStationName: getFinalStationName(entries),
    nextStationCoordinates: getStationCoordinates(
      (entries.find((entry) => entry.state !== COMPLETED_STATE) ?? entries[entries.length - 1])?.station,
    ),
    nextStationName: getNextStationName(entries),
    originStationName: getOriginStationName(entries),
    resolvedLocation: toResolvedLocation(coordinates, entries),
    speedKmh: isFiniteNumber(realtime.speed) ? realtime.speed : null,
    trainName: current.name?.trim() || null,
  };
};
