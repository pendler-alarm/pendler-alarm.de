import type { GoogleCalendarEvent } from '@/features/auth/google/calendar-api';
import { CALENDAR_EVENTS_CACHE_STORAGE_KEY } from '@/features/privacy/privacy';
import { localStorageStore } from '@/lib/storage';

const normalizeEvents = (value: unknown): GoogleCalendarEvent[] | null => (
  Array.isArray(value) ? value as GoogleCalendarEvent[] : null
);

export const getCachedCalendarEvents = (): GoogleCalendarEvent[] =>
  localStorageStore.getJson(CALENDAR_EVENTS_CACHE_STORAGE_KEY, normalizeEvents) ?? [];

export const hasCachedCalendarEvents = (): boolean =>
  getCachedCalendarEvents().length > 0;

export const storeCachedCalendarEvents = (events: GoogleCalendarEvent[]): void => {
  localStorageStore.setJson(CALENDAR_EVENTS_CACHE_STORAGE_KEY, events);
};
