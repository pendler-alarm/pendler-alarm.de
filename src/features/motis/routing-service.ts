import { getLocale, translate } from '@/i18n';
import { incrementApiMetric } from '@/lib/api-metrics';
import { MOTIS_API_PLAN } from '@/utils/constants/api';
import { createPlaceQuery, type Coordinates } from './location-service';

export type ConnectionStatus = 'on_time' | 'delayed';

export type ConnectionProductType =
  | 'regio'
  | 'sbahn'
  | 'ubahn'
  | 'bus'
  | 'tram'
  | 'train'
  | 'walk';

export type ConnectionSegment = {
  id: string;
  productType: ConnectionProductType;
  productLabel: string;
  lineLabel: string;
  fromStop: string;
  toStop: string;
  departureIso: string | null;
  departureTime: string;
  arrivalIso: string | null;
  arrivalTime: string;
};

export type ConnectionOption = {
  departureIso: string | null;
  departureTime: string;
  arrivalIso: string | null;
  arrivalTime: string;
  fromStop: string;
  toStop: string;
  durationMinutes: number | null;
  transferCount: number;
  transportModes: string[];
  segments: ConnectionSegment[];
  status: ConnectionStatus;
};

export type ConnectionSummary = ConnectionOption & {
  alternatives: ConnectionOption[];
};

type FetchConnectionOptions = {
  time?: string;
  latestArrivalIso?: string;
  arriveBy?: boolean;
  maxConnections?: number;
  searchWindowMinutes?: number;
};

type MotisPlace = {
  name?: string;
  departure?: string;
  arrival?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
};

type MotisLeg = {
  mode?: string;
  from?: MotisPlace;
  to?: MotisPlace;
  departure?: string;
  arrival?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  realTime?: boolean;
  cancelled?: boolean;
  tripCancelled?: boolean;
  routeShortName?: string;
  displayName?: string;
  headsign?: string;
};

type MotisItinerary = {
  legs?: MotisLeg[];
  transfers?: number;
  departure?: string;
  arrival?: string;
  startTime?: string;
  endTime?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
};

type MotisPlanResponse =
  | MotisItinerary[]
  | {
    itineraries?: MotisItinerary[];
    direct?: MotisItinerary[];
  };

const nonTransitModes = new Set(['WALK', 'BIKE', 'CAR', 'CAR_PARKING', 'CAR_DROPOFF', 'RENTAL']);
const DEFAULT_MAX_CONNECTIONS = 3;
const tramLinePattern = /\b(tram|str|m\d{1,2})\b/i;
const sbahnPattern = /\bs\s?\d{1,2}\b/i;
const ubahnPattern = /\bu\s?\d{1,2}\b/i;
const regioPattern = /\b(re|rb|ire|mrx|merz|ag|erx)\b/i;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const formatTime = (value?: string): string => {
  if (!value) {
    return translate('calendar.connection.timeUnknown');
  }

  return new Intl.DateTimeFormat(getLocale(), {
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatModeName = (mode?: string): string =>
  mode?.replaceAll('_', ' ').trim() || translate('calendar.connection.modeUnknown');

const getLegLabel = (leg: MotisLeg): string =>
  leg.displayName?.trim()
  || leg.routeShortName?.trim()
  || leg.headsign?.trim()
  || formatModeName(leg.mode);

const getLegLineLabel = (leg: MotisLeg): string =>
  leg.routeShortName?.trim()
  || leg.displayName?.trim()
  || leg.headsign?.trim()
  || formatModeName(leg.mode);

const uniqueLabels = (labels: string[]): string[] => Array.from(new Set(labels));

const extractItineraries = (response: MotisPlanResponse): MotisItinerary[] => {
  if (Array.isArray(response)) {
    return response;
  }

  const itineraries = Array.isArray(response.itineraries) ? response.itineraries : [];
  const direct = Array.isArray(response.direct) ? response.direct : [];

  return [...itineraries, ...direct];
};

const getFirstLeg = (itinerary: MotisItinerary): MotisLeg | undefined =>
  Array.isArray(itinerary.legs) ? itinerary.legs[0] : undefined;

const getLastLeg = (itinerary: MotisItinerary): MotisLeg | undefined =>
  Array.isArray(itinerary.legs) ? itinerary.legs[itinerary.legs.length - 1] : undefined;

const getDepartureIso = (itinerary: MotisItinerary, firstLeg?: MotisLeg): string | undefined =>
  firstLeg?.departure
  || firstLeg?.from?.departure
  || itinerary.departure
  || itinerary.startTime;

const getArrivalIso = (itinerary: MotisItinerary, lastLeg?: MotisLeg): string | undefined =>
  lastLeg?.arrival
  || lastLeg?.to?.arrival
  || itinerary.arrival
  || itinerary.endTime;

const getScheduledDepartureIso = (itinerary: MotisItinerary, firstLeg?: MotisLeg): string | undefined =>
  firstLeg?.scheduledDeparture
  || firstLeg?.from?.scheduledDeparture
  || itinerary.scheduledDeparture;

const getScheduledArrivalIso = (itinerary: MotisItinerary, lastLeg?: MotisLeg): string | undefined =>
  lastLeg?.scheduledArrival
  || lastLeg?.to?.scheduledArrival
  || itinerary.scheduledArrival;

const isDelayed = (actual?: string, scheduled?: string): boolean => {
  if (!actual || !scheduled) {
    return false;
  }

  return new Date(actual).getTime() - new Date(scheduled).getTime() > 60_000;
};

const getStatus = (itinerary: MotisItinerary, firstLeg?: MotisLeg, lastLeg?: MotisLeg): ConnectionStatus => {
  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];

  if (legs.some((leg) => leg.cancelled || leg.tripCancelled)) {
    return 'delayed';
  }

  if (isDelayed(getDepartureIso(itinerary, firstLeg), getScheduledDepartureIso(itinerary, firstLeg))) {
    return 'delayed';
  }

  if (isDelayed(getArrivalIso(itinerary, lastLeg), getScheduledArrivalIso(itinerary, lastLeg))) {
    return 'delayed';
  }

  return 'on_time';
};

const getTransportModes = (itinerary: MotisItinerary): string[] => {
  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];
  const transitLabels = legs
    .filter((leg) => !nonTransitModes.has(leg.mode ?? ''))
    .map(getLegLabel)
    .filter(Boolean);

  if (transitLabels.length > 0) {
    return uniqueLabels(transitLabels);
  }

  return uniqueLabels(legs.map(getLegLabel).filter(Boolean));
};

const getStopName = (value?: string): string =>
  value?.trim() || translate('calendar.connection.stopUnknown');

const getProductType = (leg: MotisLeg): ConnectionProductType => {
  const mode = leg.mode?.toUpperCase().trim() ?? '';
  const label = getLegLineLabel(leg);

  if (mode == 'SUBWAY' || ubahnPattern.test(label)) {
    return 'ubahn';
  }

  if (mode == 'TRAM' || mode == 'LIGHT_RAIL' || tramLinePattern.test(label)) {
    return 'tram';
  }

  if (mode == 'BUS' || mode == 'COACH') {
    return 'bus';
  }

  if (mode == 'RAIL') {
    if (sbahnPattern.test(label)) {
      return 'sbahn';
    }

    if (regioPattern.test(label)) {
      return 'regio';
    }

    return 'train';
  }

  return 'walk';
};

const getProductLabel = (type: ConnectionProductType): string => {
  switch (type) {
    case 'sbahn':
      return 'S-Bahn';
    case 'ubahn':
      return 'U-Bahn';
    case 'bus':
      return 'Bus';
    case 'tram':
      return 'Tram';
    case 'regio':
      return 'Regio';
    case 'train':
      return 'Bahn';
    default:
      return 'Weg';
  }
};

const getSegments = (itinerary: MotisItinerary): ConnectionSegment[] => {
  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];

  return legs
    .filter((leg) => !nonTransitModes.has(leg.mode ?? ''))
    .map((leg, index) => {
      const departureIso = leg.departure ?? leg.from?.departure ?? null;
      const arrivalIso = leg.arrival ?? leg.to?.arrival ?? null;
      const productType = getProductType(leg);

      return {
        id: `${productType}-${index}-${departureIso ?? arrivalIso ?? 'segment'}`,
        productType,
        productLabel: getProductLabel(productType),
        lineLabel: getLegLineLabel(leg),
        fromStop: getStopName(leg.from?.name),
        toStop: getStopName(leg.to?.name),
        departureIso,
        departureTime: formatTime(departureIso ?? undefined),
        arrivalIso,
        arrivalTime: formatTime(arrivalIso ?? undefined),
      };
    });
};

const getDurationMinutes = (departure?: string, arrival?: string): number | null => {
  if (!departure || !arrival) {
    return null;
  }

  const diffMs = new Date(arrival).getTime() - new Date(departure).getTime();

  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

const getTransferCount = (itinerary: MotisItinerary): number => {
  if (typeof itinerary.transfers === 'number') {
    return itinerary.transfers;
  }

  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];
  const transitLegs = legs.filter((leg) => !nonTransitModes.has(leg.mode ?? ''));

  return Math.max(transitLegs.length - 1, 0);
};

const getIsoMs = (value?: string): number => {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
};

const pickItineraries = (
  itineraries: MotisItinerary[],
  latestArrivalIso?: string,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
): MotisItinerary[] => {
  const validItineraries = itineraries.filter((candidate) => Array.isArray(candidate.legs) && candidate.legs.length > 0);

  if (validItineraries.length === 0) {
    return [];
  }

  if (!latestArrivalIso) {
    return validItineraries
      .sort((left, right) => getIsoMs(getDepartureIso(left, getFirstLeg(left))) - getIsoMs(getDepartureIso(right, getFirstLeg(right))))
      .slice(0, maxConnections);
  }

  const latestArrivalMs = getIsoMs(latestArrivalIso);

  return validItineraries
    .filter((candidate) => getIsoMs(getArrivalIso(candidate, getLastLeg(candidate))) <= latestArrivalMs)
    .sort((left, right) => getIsoMs(getDepartureIso(right, getFirstLeg(right))) - getIsoMs(getDepartureIso(left, getFirstLeg(left))))
    .slice(0, maxConnections);
};

const toConnectionOption = (itinerary: MotisItinerary): ConnectionOption => {
  const firstLeg = getFirstLeg(itinerary);
  const lastLeg = getLastLeg(itinerary);
  const departureIso = getDepartureIso(itinerary, firstLeg) ?? null;
  const arrivalIso = getArrivalIso(itinerary, lastLeg) ?? null;
  const segments = getSegments(itinerary);

  return {
    departureIso,
    departureTime: formatTime(departureIso ?? undefined),
    arrivalIso,
    arrivalTime: formatTime(arrivalIso ?? undefined),
    fromStop: getStopName(firstLeg?.from?.name),
    toStop: getStopName(lastLeg?.to?.name),
    durationMinutes: getDurationMinutes(departureIso ?? undefined, arrivalIso ?? undefined),
    transferCount: getTransferCount(itinerary),
    transportModes: getTransportModes(itinerary),
    segments,
    status: getStatus(itinerary, firstLeg, lastLeg),
  };
};

export const fetchNextConnection = async (
  from: Coordinates,
  to: Coordinates,
  options: FetchConnectionOptions = {},
): Promise<ConnectionSummary | null> => {
  const params = new URLSearchParams({
    fromPlace: createPlaceQuery(from),
    toPlace: createPlaceQuery(to),
    time: options.time ?? new Date().toISOString(),
  });

  params.append('language', getLocale());
  params.append('arriveBy', String(Boolean(options.arriveBy)));
  params.append('numItineraries', String(options.maxConnections ?? DEFAULT_MAX_CONNECTIONS));

  if (options.searchWindowMinutes && options.searchWindowMinutes > 0) {
    params.append('searchWindow', `${options.searchWindowMinutes}m`);
  }

  incrementApiMetric('motis');

  const response = await fetch(`${MOTIS_API_PLAN}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(translate('calendar.connection.loadFailed', { status: response.status }));
  }

  const payload = (await response.json()) as unknown;

  if (!isObject(payload) && !Array.isArray(payload)) {
    return null;
  }

  const itineraries = pickItineraries(
    extractItineraries(payload as MotisPlanResponse),
    options.latestArrivalIso,
    options.maxConnections,
  );

  if (itineraries.length === 0) {
    return null;
  }

  const [primary, ...alternatives] = itineraries.map(toConnectionOption);

  if (!primary) {
    return null;
  }

  return {
    ...primary,
    alternatives,
  };
};
