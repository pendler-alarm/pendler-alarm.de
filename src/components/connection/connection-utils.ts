import { translate } from '@/i18n';
import type {
  ConnectionOption,
  ConnectionProductType,
  ConnectionSegment,
} from '@/features/motis/routing-service';

export type BahnBookingClass = '1' | '2';

export type BahnBookingProfile = {
  bookingClass?: BahnBookingClass;
  travelerProfileParam?: string | null;
  deutschlandticketEnabled?: boolean;
};

export const formatConnectionDuration = (durationMinutes: number | null): string => {
  if (durationMinutes === null) {
    return translate('calendar.connection.timeUnknown');
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};

export const formatDistanceMeters = (meters: number | null): string | null => {
  if (meters === null || !Number.isFinite(meters)) {
    return null;
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  }

  return `${String(Math.round(meters))} m`;
};

export const formatDelayMinutes = (delayMinutes: number | null): string | null => {
  if (delayMinutes === null || !Number.isFinite(delayMinutes)) {
    return null;
  }

  const rounded = Math.round(delayMinutes * 10) / 10;

  if (rounded === 0) {
    return translate('views.dashboard.events.connection.delayNoChange');
  }

  return `${rounded > 0 ? '+' : ''}${String(rounded)} min`;
};

export const formatProbability = (value: number | null): string | null => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return `${String(Math.round(value * 100))} %`;
};

const normalizeStationSlug = (value: string): string => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[+&]/g, ' ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const looksLikeDbStation = (stopName: string): boolean => {
  const normalized = stopName.trim().toLowerCase();

  return /\b(hbf|hauptbahnhof|bahnhof|bhf)\b/u.test(normalized)
    || /^s\s/iu.test(normalized)
    || /^s\+u\s/iu.test(normalized)
    || /^u\+s\s/iu.test(normalized);
};

export const buildBahnhofStationUrl = (stopName: string): string => {
  const params = new URLSearchParams({
    query: stopName,
  });

  return `https://www.bahnhof.de/suche?${params.toString()}`;
};

export const buildBvgStationUrl = (stopName: string): string => (
  `https://www.bvg.de/en/connections/station-overview/${normalizeStationSlug(stopName)}`
);

export const buildStationInfoUrl = (stopName: string, stopId?: string | null): string => {
  const normalizedStopId = stopId?.trim().toLowerCase() ?? '';

  if (looksLikeDbStation(stopName) || normalizedStopId.startsWith('de:80')) {
    return buildBahnhofStationUrl(stopName);
  }

  return buildBvgStationUrl(stopName);
};

export const getStationInfoProviderLabel = (stopName: string, stopId?: string | null): string => (
  looksLikeDbStation(stopName) || (stopId?.trim().toLowerCase() ?? '').startsWith('de:80')
    ? 'bahnhof.de'
    : 'BVG'
);

export const getConnectionLeadMinutes = (
  eventStartIso: string | null,
  connection: ConnectionOption | null | undefined,
): number | null => {
  if (!eventStartIso || !connection?.arrivalIso) {
    return null;
  }

  const diffMs = new Date(eventStartIso).getTime() - new Date(connection.arrivalIso).getTime();

  if (Number.isNaN(diffMs)) {
    return null;
  }

  return Math.round(diffMs / 60_000);
};

export const getConnectionLeadLabel = (
  eventStartIso: string | null,
  connection: ConnectionOption | null | undefined,
): string | null => {
  const leadMinutes = getConnectionLeadMinutes(eventStartIso, connection);

  if (leadMinutes === null) {
    return null;
  }

  if (leadMinutes < 0) {
    return translate('views.dashboard.events.connection.arrivesTooLate', { count: Math.abs(leadMinutes) });
  }

  return translate('views.dashboard.events.connection.buffer', { count: leadMinutes });
};

export const getConnectionProductIcon = (type: ConnectionProductType): string | null => {
  switch (type) {
    case 'regio':
      return 'products/BAHN';
    case 'sbahn':
      return 'products/SBAHN';
    case 'ubahn':
      return 'products/UBAHN';
    case 'ferry':
      return 'products/FERRY';
    case 'bus':
      return 'products/BUS';
    case 'tram':
      return 'products/TRAM';
    case 'train':
      return 'products/BAHN';
    case 'flight':
      return 'material/flight';
    case 'ice':
      return 'products/ICE';
    case 'ic':
      return 'products/IC';
    default:
      return null;
  }
};

export const getConnectionProductFallbackLabel = (type: ConnectionProductType): string => {
  switch (type) {
    case 'regio':
      return 'RE';
    case 'sbahn':
      return 'S';
    case 'ubahn':
      return 'U';
    case 'bus':
      return 'Bus';
    case 'tram':
      return 'Tram';
    case 'ferry':
      return 'Fähre';
    case 'flight':
      return 'Flug';
    case 'ice':
      return 'ICE';
    case 'ic':
      return 'IC';
    case 'walk':
      return '🚶';
    default:
      return 'Bahn';
  }
};

export const getConnectionProductEmoji = (
  type: ConnectionProductType,
  options?: { isDestination?: boolean },
): string | null => {
  if (options?.isDestination) {
    return '🎯';
  }

  if (type === 'walk') {
    return '🚶';
  }

  return null;
};

export const formatConnectionServiceLabel = (segment: ConnectionSegment): string => {
  const lineLabel = segment.lineLabel.trim();
  const productLabel = segment.productLabel.trim();

  if (lineLabel.toLowerCase().includes(productLabel.toLowerCase())) {
    return lineLabel;
  }

  return `${productLabel} ${lineLabel}`;
};

const bahnBookableModes: ConnectionProductType[] = ['train', 'ice', 'ic'];
const deutschlandticketModes: ConnectionProductType[] = ['regio', 'sbahn', 'ubahn', 'bus', 'tram'];
export const DEFAULT_BAHN_BOOKING_CLASS: BahnBookingClass = '2';
export const DEFAULT_BAHN_TRAVELER_PROFILE = '13:23:KLASSE_2:1';

const normalizeBahnBookingClass = (value?: string | null): BahnBookingClass =>
  value === '1' ? '1' : DEFAULT_BAHN_BOOKING_CLASS;

const normalizeTravelerProfileParam = (value?: string | null): string => {
  const normalized = value?.trim();

  return normalized || DEFAULT_BAHN_TRAVELER_PROFILE;
};

const formatBahnDateTime = (isoString: string): string | null => {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const getTransitSegments = (connection: ConnectionOption): ConnectionSegment[] =>
  connection.segments.filter((segment) => segment.productType !== 'walk');

const isDeutschlandticketCoveredSegment = (segment: ConnectionSegment): boolean =>
  deutschlandticketModes.includes(segment.productType);

const getTicketPurchaseSegments = (
  connection: ConnectionOption,
  deutschlandticketEnabled: boolean,
): ConnectionSegment[] => {
  const transitSegments = getTransitSegments(connection);

  if (!deutschlandticketEnabled) {
    return transitSegments;
  }

  return transitSegments.filter((segment) => !isDeutschlandticketCoveredSegment(segment));
};

export const canUseDeutschlandticket = (connection: ConnectionOption): boolean => {
  const transitSegments = getTransitSegments(connection);

  return transitSegments.length > 0
    && transitSegments.every(isDeutschlandticketCoveredSegment);
};

export const requiresTrainTicketBooking = (
  connection: ConnectionOption,
  deutschlandticketEnabled: boolean,
): boolean =>
  getTicketPurchaseSegments(connection, deutschlandticketEnabled)
    .some((segment) => bahnBookableModes.includes(segment.productType));

export const buildBahnBookingUrl = (
  connection: ConnectionOption,
  profile: BahnBookingProfile = {},
): string | null => {
  const deutschlandticketEnabled = profile.deutschlandticketEnabled === true;
  const ticketSegments = getTicketPurchaseSegments(connection, deutschlandticketEnabled);
  const firstTransitSegment = ticketSegments[0];
  const lastTransitSegment = ticketSegments[ticketSegments.length - 1];
  const departureIso = firstTransitSegment?.departureIso ?? connection.departureIso;
  const formattedDeparture = departureIso ? formatBahnDateTime(departureIso) : null;

  if (!firstTransitSegment || !lastTransitSegment || !formattedDeparture) {
    return null;
  }

  const bookingClass = normalizeBahnBookingClass(profile.bookingClass);
  const travelerProfileParam = normalizeTravelerProfileParam(profile.travelerProfileParam);
  const params = new URLSearchParams({
    so: firstTransitSegment.fromStop,
    zo: lastTransitSegment.toStop,
    hd: formattedDeparture,
    kl: bookingClass,
    r: travelerProfileParam,
    dltv: deutschlandticketEnabled ? 'true' : 'false',
    dlt: 'false',
  });

  return `https://www.bahn.de/buchung/start?STS=false&${params.toString()}`;
};
