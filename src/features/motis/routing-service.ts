 
import { getLocale, translate } from '@/i18n';
import { finishApiRequest, startApiRequest } from '@/lib/api-metrics';
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
  | 'ice'
  | 'ic'
  | 'flight'
  | 'ferry'
  | 'walk';

export type ConnectionSegment = {
  id: string;
  productType: ConnectionProductType;
  productLabel: string;
  lineLabel: string;
  fromStop: string;
  fromStopId: string | null;
  fromCoordinates: Coordinates | null;
  toStop: string;
  toStopId: string | null;
  toCoordinates: Coordinates | null;
  departureIso: string | null;
  departureTime: string;
  arrivalIso: string | null;
  arrivalTime: string;
};

export type ConnectionDelayDistributionBucket = {
  delayMinutes: number;
  probability: number;
};

export type ConnectionDelayCall = {
  key: string;
  stopName: string;
  stopId: string | null;
  serviceLabel: string;
  eventType: 'departure' | 'arrival';
  plannedIso: string | null;
  likelyIso: string | null;
  expectedDelayMinutes: number | null;
  mostLikelyDelayMinutes: number | null;
  p50DelayMinutes: number | null;
  p90DelayMinutes: number | null;
  probabilityLate: number | null;
  distribution: ConnectionDelayDistributionBucket[];
};

export type ConnectionTransferAssessment = {
  key: string;
  fromStopName: string;
  toStopName: string;
  incomingSegmentId: string;
  outgoingSegmentId: string;
  transferMinutes: number | null;
  successProbability: number | null;
  missedProbability: number | null;
  arrivalExpectedDelayMinutes: number | null;
  arrivalP50DelayMinutes: number | null;
  arrivalP90DelayMinutes: number | null;
  departureExpectedDelayMinutes: number | null;
  departureP50DelayMinutes: number | null;
  departureP90DelayMinutes: number | null;
};

export type MobilityHubSharingStation = {
  stationId: string | null;
  name: string;
  operator: string | null;
  capacity: number | null;
  lat: number;
  lon: number;
  lastReported: string | null;
  realtimeAvailability: Array<{
    key: string;
    mode: string;
    value: number;
  }>;
};

export type MobilityHubParkingSite = {
  id: string | null;
  name: string;
  purpose: string | null;
  capacity: number | null;
  type: string | null;
  lat: number;
  lon: number;
  modifiedAt: string | null;
  photoUrl: string | null;
  realtimeFreeCapacity: number | null;
};

export type ConnectionMobilityHubGroup = {
  lat: number;
  lon: number;
  parkingSites: MobilityHubParkingSite[];
  sharingStations: MobilityHubSharingStation[];
};

export type ConnectionDelayPrediction = {
  likelyConnection: ConnectionOption | null;
  expectedDepartureDelayMinutes: number | null;
  expectedArrivalDelayMinutes: number | null;
  p50DepartureDelayMinutes: number | null;
  p50ArrivalDelayMinutes: number | null;
  p90DepartureDelayMinutes: number | null;
  p90ArrivalDelayMinutes: number | null;
  probabilityArrivalLate: number | null;
  calls: ConnectionDelayCall[];
  transferAssessments: ConnectionTransferAssessment[];
  mobilityHubRadiusMeters: number | null;
  originMobilityHubs: ConnectionMobilityHubGroup | null;
  destinationMobilityHubs: ConnectionMobilityHubGroup | null;
  historyAvailable: boolean;
  historyNote: string | null;
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
  delayPrediction?: ConnectionDelayPrediction | null;
};

export type ConnectionSummary = ConnectionOption & {
  alternatives: ConnectionOption[];
  requestedBufferMinutes: number;
  effectiveBufferMinutes: number;
  minimumBufferMinutes: number;
};

type FetchConnectionOptions = {
  time?: string;
  latestArrivalIso?: string;
  arriveBy?: boolean;
  maxConnections?: number;
  searchWindowMinutes?: number;
  showTransferWalkNodes?: boolean;
};

type MotisPlace = {
  stopId?: string;
  name?: string;
  lat?: number;
  lon?: number;
  level?: number;
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
  duration?: number;
  realTime?: boolean;
  cancelled?: boolean;
  tripCancelled?: boolean;
  routeShortName?: string;
  tripShortName?: string;
  displayName?: string;
  headsign?: string;
  steps?: Array<{
    distance?: number;
    relativeDirection?: string;
    streetName?: string;
  }>;
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
const displayNonTransitModes = new Set(['WALK']);
const DEFAULT_MAX_CONNECTIONS = 3;
const WALK_TRANSFER_DISTANCE_THRESHOLD_METERS = 180;
const WALK_TRANSFER_DURATION_THRESHOLD_SECONDS = 180;
const tramLinePattern = /\b(tram|str|m\d{1,2})\b/i;
const sbahnPattern = /\bs\s?\d{1,2}\b/i;
const ubahnPattern = /\bu\s?\d{1,2}\b/i;
const regioPattern = /\b(re|rb|ire|mrx|merz|ag|erx)\b/i;
const icePattern = /\bice\b/i;
const icPattern = /\b(ic|ec)\b/i;
const flightPattern = /\b(flug|flight|lh\d+|ew\d+|ux\d+|az\d+)\b/i;

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

const getLegLabel = (leg: MotisLeg): string => {
  const mode = leg.mode?.toUpperCase().trim() ?? '';

  if (mode === 'WALK') {
    return 'Fußweg';
  }

  const routeShortName = leg.routeShortName?.trim();
  const tripShortName = leg.tripShortName?.trim();
  const displayName = leg.displayName?.trim();
  const headsign = leg.headsign?.trim();
  const isNumericRoute = Boolean(routeShortName && /^\d+$/u.test(routeShortName));
  const preferredLong = displayName || tripShortName;

  if (preferredLong && (isNumericRoute || !routeShortName)) {
    return preferredLong;
  }

  return routeShortName
    || preferredLong
    || headsign
    || formatModeName(leg.mode);
};

const getLegLineLabel = (leg: MotisLeg): string => {
  const mode = leg.mode?.toUpperCase().trim() ?? '';

  if (mode === 'WALK') {
    return 'Fußweg';
  }

  const routeShortName = leg.routeShortName?.trim();
  const tripShortName = leg.tripShortName?.trim();
  const displayName = leg.displayName?.trim();
  const headsign = leg.headsign?.trim();
  const isNumericRoute = Boolean(routeShortName && /^\d+$/u.test(routeShortName));
  const preferredLong = displayName || tripShortName;

  if (preferredLong && (isNumericRoute || !routeShortName)) {
    return preferredLong;
  }

  return routeShortName
    || preferredLong
    || headsign
    || formatModeName(leg.mode);
};

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

const normalizeStopKey = (place?: MotisPlace): string | null =>
  place?.stopId?.trim() || place?.name?.trim().toLowerCase() || null;

const getPlaceCoordinates = (place?: MotisPlace): Coordinates | null => (
  typeof place?.lat === 'number' && typeof place?.lon === 'number'
    ? { lat: place.lat, lon: place.lon }
    : null
);

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

export const getConnectionDistanceMeters = (
  from: Coordinates | null | undefined,
  to: Coordinates | null | undefined,
): number | null => {
  if (!from || !to) {
    return null;
  }

  return getDistanceMeters(from, to);
};

const isTransitLeg = (leg?: MotisLeg | null): boolean => {
  const mode = leg?.mode?.toUpperCase().trim() ?? '';

  return Boolean(leg) && !nonTransitModes.has(mode);
};

const hasMeaningfulWalkTransfer = (walkLeg: MotisLeg, previousLeg?: MotisLeg | null, nextLeg?: MotisLeg | null): boolean => {
  if (!previousLeg || !nextLeg) {
    return true;
  }

  const previousStop = previousLeg.to;
  const nextStop = nextLeg.from;

  if (!previousStop || !nextStop) {
    return true;
  }

  const previousName = previousStop.name?.trim().toLowerCase();
  const nextName = nextStop.name?.trim().toLowerCase();

  if (previousName && nextName && previousName != nextName) {
    return true;
  }

  if (typeof previousStop.level === 'number' && typeof nextStop.level === 'number' && previousStop.level !== nextStop.level) {
    return true;
  }

  const previousCoordinates = getPlaceCoordinates(previousStop);
  const nextCoordinates = getPlaceCoordinates(nextStop);

  if (previousCoordinates && nextCoordinates) {
    return getDistanceMeters(previousCoordinates, nextCoordinates) >= WALK_TRANSFER_DISTANCE_THRESHOLD_METERS;
  }

  return (walkLeg.duration ?? 0) >= WALK_TRANSFER_DURATION_THRESHOLD_SECONDS;
};

const shouldIncludeSegment = (legs: MotisLeg[], index: number, leg: MotisLeg, showTransferWalkNodes: boolean): boolean => {
  const mode = leg.mode?.toUpperCase().trim() ?? '';

  if (!nonTransitModes.has(mode)) {
    return true;
  }

  if (!displayNonTransitModes.has(mode)) {
    return false;
  }

  const previousLeg = index > 0 ? legs[index - 1] ?? null : null;
  const nextLeg = index < legs.length - 1 ? legs[index + 1] ?? null : null;
  const isInternalTransferWalk = isTransitLeg(previousLeg) && isTransitLeg(nextLeg);

  if (!isInternalTransferWalk) {
    return true;
  }

  if (showTransferWalkNodes) {
    return true;
  }

  return hasMeaningfulWalkTransfer(leg, previousLeg, nextLeg);
};

const getProductType = (leg: MotisLeg): ConnectionProductType => {
  const mode = leg.mode?.toUpperCase().trim() ?? '';
  const label = getLegLineLabel(leg);

  if (mode === 'AIRPLANE' || mode === 'AIR' || mode === 'FLIGHT' || flightPattern.test(label)) {
    return 'flight';
  }

  if (mode === 'SUBWAY' || mode === 'METRO' || ubahnPattern.test(label)) {
    return 'ubahn';
  }

  if (mode === 'SUBURBAN' || sbahnPattern.test(label)) {
    return 'sbahn';
  }

  if (mode === 'TRAM' || mode === 'LIGHT_RAIL' || tramLinePattern.test(label)) {
    return 'tram';
  }

  if (mode === 'BUS' || mode === 'COACH') {
    return 'bus';
  }

  if (mode === 'REGIONAL_RAIL' || mode === 'REGIONAL_FAST_RAIL') {
    return 'regio';
  }

  if (mode === 'LONG_DISTANCE' || mode === 'HIGHSPEED_RAIL' || mode === 'NIGHT_RAIL') {
    if (icePattern.test(label)) {
      return 'ice';
    }

    if (icPattern.test(label)) {
      return 'ic';
    }

    return 'train';
  }

  if (mode === 'RAIL' || mode === 'TRANSIT') {
    if (sbahnPattern.test(label)) {
      return 'sbahn';
    }

    if (regioPattern.test(label)) {
      return 'regio';
    }

    if (icePattern.test(label)) {
      return 'ice';
    }

    if (icPattern.test(label)) {
      return 'ic';
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
    case 'ice':
      return 'ICE';
    case 'ic':
      return 'IC';
    case 'train':
      return 'Bahn';
    case 'flight':
      return 'Flug';
    case 'walk':
      return 'Fußweg';
    default:
      return 'Weg';
  }
};

const getSegments = (itinerary: MotisItinerary, showTransferWalkNodes: boolean): ConnectionSegment[] => {
  const legs = Array.isArray(itinerary.legs) ? itinerary.legs : [];

  return legs
    .filter((leg, index) => shouldIncludeSegment(legs, index, leg, showTransferWalkNodes))
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
        fromStopId: normalizeStopKey(leg.from),
        fromCoordinates: getPlaceCoordinates(leg.from),
        toStop: getStopName(leg.to?.name),
        toStopId: normalizeStopKey(leg.to),
        toCoordinates: getPlaceCoordinates(leg.to),
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

const toConnectionOption = (itinerary: MotisItinerary, showTransferWalkNodes: boolean): ConnectionOption => {
  const firstLeg = getFirstLeg(itinerary);
  const lastLeg = getLastLeg(itinerary);
  const departureIso = getDepartureIso(itinerary, firstLeg) ?? null;
  const arrivalIso = getArrivalIso(itinerary, lastLeg) ?? null;
  const segments = getSegments(itinerary, showTransferWalkNodes);

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
    delayPrediction: null,
  };
};

export const buildConnectionSummaryFromPlanResponse = (
  payload: unknown,
  options: FetchConnectionOptions = {},
): ConnectionSummary | null => {
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

  const includeTransferWalkNodes = Boolean(options.showTransferWalkNodes);
  const [primary, ...alternatives] = itineraries.map((itinerary) => toConnectionOption(itinerary, includeTransferWalkNodes));

  if (!primary) {
    return null;
  }

  return {
    ...primary,
    alternatives,
    requestedBufferMinutes: 0,
    effectiveBufferMinutes: 0,
    minimumBufferMinutes: 0,
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

  const url = `${MOTIS_API_PLAN}?${params.toString()}`;
  const query = Object.fromEntries(params.entries());
  const requestId = startApiRequest('motis', 'plan', {
    method: 'GET',
    url,
    query,
    requestJson: query,
    requestHeaders: {
      Accept: 'application/json',
    },
  });
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
    });
    throw error;
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch (error) {
    finishApiRequest(requestId, 'error', response.status, {
      errorKind: 'invalid-json',
      errorMessage: error instanceof Error ? error.message : translate('views.dashboard.events.debug.history.errors.invalidJson'),
    });
    throw error;
  }

  if (!response.ok) {
    finishApiRequest(requestId, 'error', response.status, {
      responseJson: payload,
      errorKind: 'http',
      errorMessage: translate('calendar.connection.loadFailed', { status: response.status }),
    });
    throw new Error(translate('calendar.connection.loadFailed', { status: response.status }));
  }

  finishApiRequest(requestId, 'success', response.status, {
    responseJson: payload,
    responseHeaders: {
      'content-type': response.headers.get('content-type') ?? '',
    },
  });

  return buildConnectionSummaryFromPlanResponse(payload, options);
};
