import { getLocale, translate } from '@/i18n';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
import type { Coordinates } from '@/features/motis/location-service';
import {
  buildConnectionSummaryFromPlanResponse,
  type ConnectionDelayCall,
  type ConnectionDelayDistributionBucket,
  type ConnectionDelayPrediction,
  type ConnectionSummary,
  type ConnectionTransferAssessment,
} from '@/features/motis/routing-service';
import { PENDLER_ALARM_API_DELAY_PREDICTIONS } from '@/utils/constants/api';

type DelayPredictionResponse = {
  response?: unknown;
  predictor_response?: {
    predictions?: unknown;
    offset?: number;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const formatTime = (value: string | null): string => {
  if (!value) {
    return translate('calendar.connection.timeUnknown');
  }

  return new Intl.DateTimeFormat(getLocale(), {
    timeStyle: 'short',
  }).format(new Date(value));
};

const toCoordinatesParam = (coordinates: Coordinates): string => `${coordinates.lat},${coordinates.lon}`;

const normalizePredictionRows = (value: unknown): number[][] => (
  Array.isArray(value)
    ? value.map((row) => Array.isArray(row) ? row.map((entry) => typeof entry === 'number' ? entry : 0) : [])
    : []
);

const getDistribution = (row: number[], offset: number): ConnectionDelayDistributionBucket[] => row
  .map((probability, index) => ({
    delayMinutes: index - offset,
    probability,
  }))
  .filter((bucket) => Number.isFinite(bucket.probability) && bucket.probability > 0);

const getExpectedDelay = (distribution: ConnectionDelayDistributionBucket[]): number | null => {
  if (distribution.length === 0) {
    return null;
  }

  const weighted = distribution.reduce((total, bucket) => total + bucket.delayMinutes * bucket.probability, 0);
  return Math.round(weighted * 10) / 10;
};

const getMostLikelyDelay = (distribution: ConnectionDelayDistributionBucket[]): number | null => {
  if (distribution.length === 0) {
    return null;
  }

  return distribution.reduce((best, bucket) => (
    bucket.probability > best.probability ? bucket : best
  )).delayMinutes;
};

const getQuantileDelay = (distribution: ConnectionDelayDistributionBucket[], quantile: number): number | null => {
  if (distribution.length === 0) {
    return null;
  }

  const sorted = [...distribution].sort((left, right) => left.delayMinutes - right.delayMinutes);
  let cumulative = 0;

  for (const bucket of sorted) {
    cumulative += bucket.probability;

    if (cumulative >= quantile) {
      return bucket.delayMinutes;
    }
  }

  return sorted[sorted.length - 1]?.delayMinutes ?? null;
};

const getProbabilityLate = (distribution: ConnectionDelayDistributionBucket[]): number | null => {
  if (distribution.length === 0) {
    return null;
  }

  return distribution
    .filter((bucket) => bucket.delayMinutes > 0)
    .reduce((total, bucket) => total + bucket.probability, 0);
};

const getTransferWindowMinutes = (arrivalIso: string | null, departureIso: string | null): number | null => {
  if (!arrivalIso || !departureIso) {
    return null;
  }

  const diffMs = new Date(departureIso).getTime() - new Date(arrivalIso).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const getTransferSuccessProbability = (
  arrivalDistribution: ConnectionDelayDistributionBucket[],
  departureDistribution: ConnectionDelayDistributionBucket[],
  transferWindowMinutes: number | null,
): number | null => {
  if (transferWindowMinutes === null || arrivalDistribution.length === 0) {
    return null;
  }

  const effectiveDepartureDistribution = departureDistribution.length > 0
    ? departureDistribution
    : [{ delayMinutes: 0, probability: 1 }];

  const probability = arrivalDistribution.reduce((arrivalTotal, arrivalBucket) => (
    arrivalTotal + effectiveDepartureDistribution.reduce((departureTotal, departureBucket) => {
      const makesConnection = arrivalBucket.delayMinutes - departureBucket.delayMinutes <= transferWindowMinutes;

      return makesConnection
        ? departureTotal + arrivalBucket.probability * departureBucket.probability
        : departureTotal;
    }, 0)
  ), 0);

  return Math.max(0, Math.min(1, Math.round(probability * 1000) / 1000));
};

const getServiceLabel = (segmentLabel: string, productLabel: string): string => (
  segmentLabel.toLowerCase().includes(productLabel.toLowerCase())
    ? segmentLabel
    : `${productLabel} ${segmentLabel}`
);

const shiftIso = (value: string | null, delayMinutes: number | null): string | null => {
  if (!value || delayMinutes === null || !Number.isFinite(delayMinutes)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setMinutes(date.getMinutes() + delayMinutes);
  return date.toISOString();
};

const getDurationMinutes = (departureIso: string | null, arrivalIso: string | null): number | null => {
  if (!departureIso || !arrivalIso) {
    return null;
  }

  const diffMs = new Date(arrivalIso).getTime() - new Date(departureIso).getTime();

  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const buildLikelyConnection = (
  connection: ConnectionSummary,
  calls: ConnectionDelayCall[],
): ConnectionSummary => {
  const delayedSegments = connection.segments.map((segment) => {
    if (segment.productType === 'walk' || segment.productType === 'bike') {
      return segment;
    }

    const departureCall = calls.find((call) => call.key === `${segment.id}-departure`) ?? null;
    const arrivalCall = calls.find((call) => call.key === `${segment.id}-arrival`) ?? null;
    const departureIso = shiftIso(segment.departureIso, departureCall?.p50DelayMinutes ?? null);
    const arrivalIso = shiftIso(segment.arrivalIso, arrivalCall?.p50DelayMinutes ?? null);

    return {
      ...segment,
      departureIso,
      departureTime: formatTime(departureIso),
      arrivalIso,
      arrivalTime: formatTime(arrivalIso),
    };
  });

  const departureIso = delayedSegments[0]?.departureIso ?? connection.departureIso;
  const arrivalIso = delayedSegments[delayedSegments.length - 1]?.arrivalIso ?? connection.arrivalIso;

  return {
    ...connection,
    departureIso,
    departureTime: formatTime(departureIso),
    arrivalIso,
    arrivalTime: formatTime(arrivalIso),
    durationMinutes: getDurationMinutes(departureIso, arrivalIso),
    segments: delayedSegments,
    delayPrediction: null,
    alternatives: connection.alternatives,
  };
};

const buildTransferAssessments = (
  connection: ConnectionSummary,
  calls: ConnectionDelayCall[],
): ConnectionTransferAssessment[] => {
  const transitSegments = connection.segments.filter((segment) => segment.productType !== 'walk' && segment.productType !== 'bike');
  const callMap = new Map(calls.map((call) => [call.key, call]));

  return transitSegments.slice(0, -1).flatMap((segment, index) => {
    const nextSegment = transitSegments[index + 1] ?? null;

    if (!nextSegment) {
      return [];
    }

    const arrivalCall = callMap.get(`${segment.id}-arrival`) ?? null;
    const departureCall = callMap.get(`${nextSegment.id}-departure`) ?? null;
    const transferMinutes = getTransferWindowMinutes(segment.arrivalIso, nextSegment.departureIso);
    const successProbability = getTransferSuccessProbability(
      arrivalCall?.distribution ?? [],
      departureCall?.distribution ?? [],
      transferMinutes,
    );

    return [{
      key: `${segment.id}-${nextSegment.id}`,
      fromStopName: segment.toStop,
      toStopName: nextSegment.fromStop,
      incomingSegmentId: segment.id,
      outgoingSegmentId: nextSegment.id,
      transferMinutes,
      successProbability,
      missedProbability: successProbability === null ? null : Math.max(0, Math.min(1, 1 - successProbability)),
      arrivalExpectedDelayMinutes: arrivalCall?.expectedDelayMinutes ?? null,
      arrivalP50DelayMinutes: arrivalCall?.p50DelayMinutes ?? null,
      arrivalP90DelayMinutes: arrivalCall?.p90DelayMinutes ?? null,
      departureExpectedDelayMinutes: departureCall?.expectedDelayMinutes ?? null,
      departureP50DelayMinutes: departureCall?.p50DelayMinutes ?? null,
      departureP90DelayMinutes: departureCall?.p90DelayMinutes ?? null,
    }];
  });
};

export const fetchDelayPrediction = async (
  origin: Coordinates,
  destination: Coordinates,
  departureIso: string,
): Promise<ConnectionDelayPrediction | null> => {
  const body = {
    origin: toCoordinatesParam(origin),
    destination: toCoordinatesParam(destination),
    departure_time: departureIso,
  };

  const requestId = startApiRequest('motis', 'delay-prediction', {
    method: 'POST',
    url: PENDLER_ALARM_API_DELAY_PREDICTIONS,
    requestJson: body,
    requestHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  let response: Response;

  try {
    response = await fetch(PENDLER_ALARM_API_DELAY_PREDICTIONS, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    finishApiRequest(requestId, 'error', null, {
      errorKind: 'network',
      errorMessage: error instanceof Error ? error.message : translate('views.dashboard.events.debug.history.errors.unknownFetch'),
    });
    return null;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    finishApiRequest(requestId, 'error', response.status, {
      errorKind: 'invalid-json',
      errorMessage: error instanceof Error ? error.message : translate('views.dashboard.events.debug.history.errors.invalidJson'),
    });
    return null;
  }

  if (!response.ok) {
    finishApiRequest(requestId, 'error', response.status, {
      responseJson: payload,
      errorKind: 'http',
      errorMessage: `HTTP ${String(response.status)}`,
    });
    return null;
  }

  finishApiRequest(requestId, 'success', response.status, {
    responseJson: payload,
    responseHeaders: {
      'content-type': response.headers.get('content-type') ?? '',
    },
  });

  if (!isObject(payload)) {
    return null;
  }

  const delayPayload = payload as DelayPredictionResponse;
  const baseConnection = buildConnectionSummaryFromPlanResponse(delayPayload.response, {
    maxConnections: 1,
  });

  if (!baseConnection) {
    return null;
  }

  const rows = normalizePredictionRows(delayPayload.predictor_response?.predictions);
  const offset = typeof delayPayload.predictor_response?.offset === 'number' ? delayPayload.predictor_response.offset : 0;
  const transitSegments = baseConnection.segments.filter((segment) => segment.productType !== 'walk' && segment.productType !== 'bike');
  const calls: ConnectionDelayCall[] = [];

  transitSegments.forEach((segment, index) => {
    const departureDistribution = getDistribution(rows[index * 2] ?? [], offset);
    const arrivalDistribution = getDistribution(rows[index * 2 + 1] ?? [], offset);
    const serviceLabel = getServiceLabel(segment.lineLabel, segment.productLabel);

    calls.push({
      key: `${segment.id}-departure`,
      stopName: segment.fromStop,
      stopId: segment.fromStopId,
      serviceLabel,
      eventType: 'departure',
      plannedIso: segment.departureIso,
      likelyIso: shiftIso(segment.departureIso, getQuantileDelay(departureDistribution, 0.5)),
      expectedDelayMinutes: getExpectedDelay(departureDistribution),
      mostLikelyDelayMinutes: getMostLikelyDelay(departureDistribution),
      p50DelayMinutes: getQuantileDelay(departureDistribution, 0.5),
      p90DelayMinutes: getQuantileDelay(departureDistribution, 0.9),
      probabilityLate: getProbabilityLate(departureDistribution),
      distribution: departureDistribution,
    });

    calls.push({
      key: `${segment.id}-arrival`,
      stopName: segment.toStop,
      stopId: segment.toStopId,
      serviceLabel,
      eventType: 'arrival',
      plannedIso: segment.arrivalIso,
      likelyIso: shiftIso(segment.arrivalIso, getQuantileDelay(arrivalDistribution, 0.5)),
      expectedDelayMinutes: getExpectedDelay(arrivalDistribution),
      mostLikelyDelayMinutes: getMostLikelyDelay(arrivalDistribution),
      p50DelayMinutes: getQuantileDelay(arrivalDistribution, 0.5),
      p90DelayMinutes: getQuantileDelay(arrivalDistribution, 0.9),
      probabilityLate: getProbabilityLate(arrivalDistribution),
      distribution: arrivalDistribution,
    });
  });

  const departureCall = calls.find((call) => call.eventType === 'departure') ?? null;
  const arrivalCall = [...calls].reverse().find((call) => call.eventType === 'arrival') ?? null;
  const transferAssessments = buildTransferAssessments(baseConnection, calls);

  return {
    likelyConnection: buildLikelyConnection(baseConnection, calls),
    expectedDepartureDelayMinutes: departureCall?.expectedDelayMinutes ?? null,
    expectedArrivalDelayMinutes: arrivalCall?.expectedDelayMinutes ?? null,
    p50DepartureDelayMinutes: departureCall?.p50DelayMinutes ?? null,
    p50ArrivalDelayMinutes: arrivalCall?.p50DelayMinutes ?? null,
    p90DepartureDelayMinutes: departureCall?.p90DelayMinutes ?? null,
    p90ArrivalDelayMinutes: arrivalCall?.p90DelayMinutes ?? null,
    probabilityArrivalLate: arrivalCall?.probabilityLate ?? null,
    calls,
    transferAssessments,
    historyAvailable: rows.length > 0,
    historyNote: rows.length > 0
      ? translate('views.dashboard.events.connection.delayAverageNote')
      : translate('views.dashboard.events.connection.delayHistoryUnavailable'),
  };
};
