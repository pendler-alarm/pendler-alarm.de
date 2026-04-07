import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import type { Coordinates } from '@/features/motis/location-service';
import { PENDLER_ALARM_API_WORKFLOW_STATIONS } from '@/utils/constants/api';

type WorkflowStation = {
  name?: string;
  ifopt?: string;
  latitude?: number;
  longitude?: number;
};

let stationRegistryPromise: Promise<WorkflowStation[]> | null = null;

const normalizeName = (value: string): string => value
  .normalize('NFKD')
  .replaceAll(/[^\p{Letter}\p{Number}]+/gu, '')
  .toLowerCase();

const getDistanceMeters = (from: Coordinates, to: Coordinates): number => {
  const earthRadiusMeters = 6_371_000;
  const toRad = (value: number): number => value * (Math.PI / 180);
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const loadStations = async (): Promise<WorkflowStation[]> => {
  if (stationRegistryPromise) {
    return stationRegistryPromise;
  }

  stationRegistryPromise = (async () => {
    const requestId = startApiRequest('motis', 'workflow-stations', {
      method: 'GET',
      url: PENDLER_ALARM_API_WORKFLOW_STATIONS,
      requestHeaders: {
        Accept: 'application/json',
      },
    });

    let response: Response;

    try {
      response = await fetch(PENDLER_ALARM_API_WORKFLOW_STATIONS, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      stationRegistryPromise = null;
      finishApiRequest(requestId, 'error', null, {
        errorKind: 'network',
        errorMessage: error instanceof Error ? error.message : 'workflow-stations-network-error',
      });
      return [];
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      stationRegistryPromise = null;
      finishApiRequest(requestId, 'error', response.status, {
        errorKind: 'invalid-json',
        errorMessage: error instanceof Error ? error.message : 'workflow-stations-invalid-json',
      });
      return [];
    }

    if (!response.ok || !Array.isArray(payload)) {
      stationRegistryPromise = null;
      finishApiRequest(requestId, 'error', response.status, {
        errorKind: 'http',
        responseJson: payload,
        errorMessage: `HTTP ${String(response.status)}`,
      });
      return [];
    }

    finishApiRequest(requestId, 'success', response.status, {
      responseJson: payload,
      responseHeaders: {
        'content-type': response.headers.get('content-type') ?? '',
      },
    });

    return payload as WorkflowStation[];
  })();

  return stationRegistryPromise;
};

const scoreStationMatch = (
  station: WorkflowStation,
  normalizedTarget: string,
  coordinates: Coordinates | null,
): number | null => {
  if (!station.ifopt || !station.name) {
    return null;
  }

  const normalizedStationName = normalizeName(station.name);
  const exactNameMatch = normalizedStationName === normalizedTarget;
  const fuzzyNameMatch = normalizedStationName.includes(normalizedTarget)
    || normalizedTarget.includes(normalizedStationName);

  if (!exactNameMatch && !fuzzyNameMatch) {
    return null;
  }

  const nameScore = exactNameMatch ? 10_000 : 5_000;

  if (!coordinates || typeof station.latitude !== 'number' || typeof station.longitude !== 'number') {
    return nameScore;
  }

  const distancePenalty = getDistanceMeters(coordinates, {
    lat: station.latitude,
    lon: station.longitude,
  });

  return nameScore - distancePenalty;
};

export const resolveWorkflowStationIfopt = async (
  stopName: string,
  coordinates: Coordinates | null,
): Promise<string | null> => {
  const stations = await loadStations();
  const normalizedTarget = normalizeName(stopName);

  const rankedStations = stations
    .map((station) => ({
      ifopt: station.ifopt ?? null,
      score: scoreStationMatch(station, normalizedTarget, coordinates),
    }))
    .filter((entry): entry is { ifopt: string; score: number } => entry.ifopt !== null && entry.score !== null)
    .sort((left, right) => right.score - left.score);

  return rankedStations[0]?.ifopt ?? null;
};
