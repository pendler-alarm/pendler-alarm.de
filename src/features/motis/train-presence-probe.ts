import { translate } from '@/i18n';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';

type ProbeCoordinates = {
  lat: number;
  lon: number;
};

type BrowserNetworkInformation = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

export type TrainPresenceProbeResult = {
  shouldCheckIsp: boolean;
  coordinates: ProbeCoordinates | null;
  networkFingerprint: string | null;
  trigger: 'initial' | 'location-changed' | 'network-changed' | 'unchanged';
};

type TrainPresenceProbeInput = {
  previousCoordinates: ProbeCoordinates | null;
  previousNetworkFingerprint: string | null;
  hasPreviousIspResult: boolean;
};

const GEOLOCATION_TIMEOUT_MS = 8_000;
const GEOLOCATION_MAX_AGE_MS = 5 * 60_000;
const POSITION_CHANGE_THRESHOLD_METERS = 250;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getBrowserNetworkInformation = (): BrowserNetworkInformation | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const connection = (navigator as Navigator & {
    connection?: BrowserNetworkInformation;
    mozConnection?: BrowserNetworkInformation;
    webkitConnection?: BrowserNetworkInformation;
  }).connection
    ?? (navigator as Navigator & { mozConnection?: BrowserNetworkInformation }).mozConnection
    ?? (navigator as Navigator & { webkitConnection?: BrowserNetworkInformation }).webkitConnection;

  return connection ?? null;
};

const toFingerprintPart = (value: number | string | undefined): string => {
  if (typeof value === 'number') {
    return String(value);
  }

  return value?.trim() || 'na';
};

const getNetworkFingerprint = (): string | null => {
  const network = getBrowserNetworkInformation();

  if (!network) {
    return null;
  }

  return [
    toFingerprintPart(network.type),
    toFingerprintPart(network.effectiveType),
    toFingerprintPart(network.downlink),
    toFingerprintPart(network.rtt),
  ].join('|');
};

const toRadians = (value: number): number => value * (Math.PI / 180);

const getDistanceMeters = (from: ProbeCoordinates, to: ProbeCoordinates): number => {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const hasMeaningfulLocationChange = (
  previousCoordinates: ProbeCoordinates | null,
  nextCoordinates: ProbeCoordinates | null,
): boolean => {
  if (!previousCoordinates || !nextCoordinates) {
    return false;
  }

  return getDistanceMeters(previousCoordinates, nextCoordinates) >= POSITION_CHANGE_THRESHOLD_METERS;
};

const hasNetworkFingerprintChange = (
  previousFingerprint: string | null,
  nextFingerprint: string | null,
): boolean => previousFingerprint !== nextFingerprint && (previousFingerprint !== null || nextFingerprint !== null);

const getCurrentCoordinates = async (): Promise<ProbeCoordinates | null> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isFiniteNumber(coords.latitude) || !isFiniteNumber(coords.longitude)) {
          resolve(null);
          return;
        }

        resolve({
          lat: coords.latitude,
          lon: coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      },
    );
  });
};

const getProbeTrigger = (
  hasPreviousIspResult: boolean,
  locationChanged: boolean,
  networkChanged: boolean,
): TrainPresenceProbeResult['trigger'] => {
  if (!hasPreviousIspResult) {
    return 'initial';
  }

  if (locationChanged) {
    return 'location-changed';
  }

  if (networkChanged) {
    return 'network-changed';
  }

  return 'unchanged';
};

export const probeTrainPresenceSignals = async ({
  previousCoordinates,
  previousNetworkFingerprint,
  hasPreviousIspResult,
}: TrainPresenceProbeInput): Promise<TrainPresenceProbeResult> => {
  const requestId = startApiRequest('motis', 'train-presence-probe', {
    method: 'BROWSER',
    url: 'navigator.geolocation',
        note: translate('app.trainPresence.probeNote'),
  });

  const coordinates = await getCurrentCoordinates();
  const networkFingerprint = getNetworkFingerprint();
  const locationChanged = hasMeaningfulLocationChange(previousCoordinates, coordinates);
  const networkChanged = hasNetworkFingerprintChange(previousNetworkFingerprint, networkFingerprint);
  const trigger = getProbeTrigger(hasPreviousIspResult, locationChanged, networkChanged);
  const shouldCheckIsp = !hasPreviousIspResult || locationChanged || networkChanged;

  finishApiRequest(requestId, 'success', null, {
    responseJson: {
      coordinates,
      networkFingerprint,
      locationChanged,
      networkChanged,
      shouldCheckIsp,
      trigger,
    },
  });

  return {
    shouldCheckIsp,
    coordinates,
    networkFingerprint,
    trigger,
  };
};
