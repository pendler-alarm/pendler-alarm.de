import { getLocale, translate } from '@/i18n';
import { incrementApiMetric } from '@/lib/api-metrics';
import { fetchNextConnection, type ConnectionSummary } from '@/features/motis/routing-service';
import {
  formatCoordinates,
  resolveLocation,
  type Coordinates,
  type ResolvedLocation,
} from '@/features/motis/location-service';
import type { SharingSuggestion } from '@/features/sharing/sharing-service';
import { GOOGLE_API_CALENDAR_EVENTS } from '@/utils/constants/api';
import { MAX_EVENT_RESULTS } from '@/utils/constants/const';

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  startLabel: string;
  startIso: string | null;
  timeZone: string;
  hasExactStartTime: boolean;
  locationAddress: string | null;
  locationCoordinates: Coordinates | null;
  coordinatesLabel: string | null;
  connection: ConnectionSummary | null;
  connectionError: string | null;
  connectionFetchedAt: string | null;
  sharingSuggestion: SharingSuggestion | null;
  sharingError: string | null;
};

type CalendarApiEvent = {
  id?: string;
  summary?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

type CalendarApiResponse = {
  items?: CalendarApiEvent[];
};

type EnrichedLocation = {
  address: string | null;
  coordinates: Coordinates | null;
  coordinatesLabel: string | null;
};

const DEFAULT_TIME_ZONE = 'Europe/Berlin';
const MAX_CONNECTION_OPTIONS = 3;
const CONNECTION_SEARCH_WINDOW_MINUTES = 120;
const CALENDAR_FETCH_RESULTS = String(Math.max(Number(MAX_EVENT_RESULTS) * 4, Number(MAX_EVENT_RESULTS)));

const getEventTimeZone = (start?: { timeZone?: string }): string => start?.timeZone?.trim() || DEFAULT_TIME_ZONE;

const getTimeZoneOffset = (date: Date, timeZone: string): string => {
  const offsetValue = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;

  const match = offsetValue?.match(/^GMT(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?$/u);

  if (!match?.groups) {
    return '+00:00';
  }

  const hours = (match.groups.hours ?? '0').padStart(2, '0');
  const minutes = (match.groups.minutes ?? '00').padStart(2, '0');

  return `${match.groups.sign}${hours}:${minutes}`;
};

const toTimeZoneIsoString = (value: string, timeZone: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}${getTimeZoneOffset(date, timeZone)}`;
};

const formatEventStart = (
  start?: { date?: string; dateTime?: string; timeZone?: string },
  timeZone = DEFAULT_TIME_ZONE,
): string => {
  if (!start) {
    return translate('calendar.event.noStartTime');
  }

  if (start.dateTime) {
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(start.dateTime));
  }

  if (start.date) {
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
      timeZone,
    }).format(new Date(start.date));
  }

  return translate('calendar.event.noStartTime');
};

const getEventStartIso = (start?: { date?: string; dateTime?: string }): string | null => {
  if (start?.dateTime) {
    return start.dateTime;
  }

  return null;
};

const resolveEventLocation = async (rawLocation?: string): Promise<EnrichedLocation> => {
  const normalized = rawLocation?.trim();

  if (!normalized) {
    return {
      address: null,
      coordinates: null,
      coordinatesLabel: null,
    };
  }

  try {
    const resolved = await resolveLocation(normalized);

    return {
      address: resolved.address ?? normalized,
      coordinates: resolved.coordinates,
      coordinatesLabel: resolved.coordinates ? formatCoordinates(resolved.coordinates) : null,
    };
  } catch {
    return {
      address: normalized,
      coordinates: null,
      coordinatesLabel: null,
    };
  }
};

const createBaseEvent = async (
  event: CalendarApiEvent,
  index: number,
): Promise<GoogleCalendarEvent> => {
  const location = await resolveEventLocation(event.location);
  const startIso = getEventStartIso(event.start);
  const timeZone = getEventTimeZone(event.start);

  return {
    id: event.id ?? `event-${String(index)}`,
    summary: event.summary?.trim() || translate('calendar.event.untitled'),
    startLabel: formatEventStart(event.start, timeZone),
    startIso,
    timeZone,
    hasExactStartTime: Boolean(startIso),
    locationAddress: location.address,
    locationCoordinates: location.coordinates,
    coordinatesLabel: location.coordinatesLabel,
    connection: null,
    connectionError: null,
    connectionFetchedAt: null,
    sharingSuggestion: null,
    sharingError: null,
  };
};

const isUpcomingEvent = (event: GoogleCalendarEvent): boolean => {
  if (!event.startIso) {
    return false;
  }

  const startTimeMs = new Date(event.startIso).getTime();

  if (Number.isNaN(startTimeMs)) {
    return false;
  }

  return startTimeMs >= Date.now();
};

export const fetchEventConnection = async (
  origin: ResolvedLocation | null | undefined,
  event: GoogleCalendarEvent,
): Promise<{ connection: ConnectionSummary | null; connectionError: string | null }> => {
  if (!event.locationAddress && !event.locationCoordinates) {
    return {
      connection: null,
      connectionError: translate('calendar.connection.destinationMissing'),
    };
  }

  if (!origin?.coordinates) {
    return {
      connection: null,
      connectionError: translate('calendar.connection.originUnavailable'),
    };
  }

  if (!event.locationCoordinates) {
    return {
      connection: null,
      connectionError: translate('calendar.connection.destinationUnavailable'),
    };
  }

  if (!event.startIso) {
    return {
      connection: null,
      connectionError: translate('calendar.connection.eventStartUnavailable'),
    };
  }

  try {
    const latestArrivalIso = toTimeZoneIsoString(event.startIso, event.timeZone);
    const connection = await fetchNextConnection(origin.coordinates, event.locationCoordinates, {
      time: latestArrivalIso,
      latestArrivalIso,
      arriveBy: true,
      maxConnections: MAX_CONNECTION_OPTIONS,
      searchWindowMinutes: CONNECTION_SEARCH_WINDOW_MINUTES,
    });

    return connection
      ? { connection, connectionError: null }
      : {
        connection: null,
        connectionError: translate('calendar.connection.noneFound'),
      };
  } catch (error) {
    return {
      connection: null,
      connectionError: error instanceof Error ? error.message : translate('calendar.connection.errorFallback'),
    };
  }
};

export const fetchUpcomingCalendarEvents = async (
  accessToken: string,
): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    maxResults: CALENDAR_FETCH_RESULTS,
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });
  incrementApiMetric('googleCalendar');

  const response = await fetch(
    `${GOOGLE_API_CALENDAR_EVENTS}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(translate('calendar.error.loadFailed', { status: response.status }));
  }

  const data = (await response.json()) as CalendarApiResponse;
  const upcomingEvents = (data.items ?? []).slice(0, Number(CALENDAR_FETCH_RESULTS));

  const normalizedEvents = await Promise.all(
    upcomingEvents.map((event, index) => createBaseEvent(event, index)),
  );

  return normalizedEvents.filter(isUpcomingEvent).slice(0, Number(MAX_EVENT_RESULTS));
};
