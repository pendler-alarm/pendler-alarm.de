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
    return 'Kein Startzeitpunkt';
  }

  if (start.dateTime) {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(start.dateTime));
  }

  if (start.date) {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
    }).format(new Date(start.date));
  }

  return 'Kein Startzeitpunkt';
};

export const fetchUpcomingCalendarEvents = async (accessToken: string): Promise<GoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    maxResults: '3',
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Kalendertermine konnten nicht geladen werden: ${response.status}`);
  }

  const data = (await response.json()) as CalendarApiResponse;

  return (data.items ?? []).slice(0, 3).map((event, index) => ({
    id: event.id ?? `event-${String(index)}`,
    summary: event.summary?.trim() || 'Ohne Titel',
    startLabel: formatEventStart(event.start),
  }));
};
