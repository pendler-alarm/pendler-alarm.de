import { getLocale, translate } from '@/i18n';
import { GOOGLE_API_CALENDAR_EVENTS } from '@/utils/constants/api';
import { MAX_EVENT_RESULTS } from '@/utils/constants/const';

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  startLabel: string;
};

type CalendarApiEvent = {
  id?: string;
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
};

type CalendarApiResponse = {
  items?: CalendarApiEvent[];
};

const formatEventStart = (start?: { date?: string; dateTime?: string }): string => {
  if (!start) {
    return translate('calendar.event.noStartTime');
  }

  if (start.dateTime) {
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(start.dateTime));
  }

  if (start.date) {
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
    }).format(new Date(start.date));
  }

  return translate('calendar.event.noStartTime');
};

export const fetchUpcomingCalendarEvents = async (accessToken: string): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    maxResults: MAX_EVENT_RESULTS,
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });

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

  return (data.items ?? []).slice(0, 3).map((event, index) => ({
    id: event.id ?? `event-${String(index)}`,
    summary: event.summary?.trim() || translate('calendar.event.untitled'),
    startLabel: formatEventStart(event.start),
  }));
};
