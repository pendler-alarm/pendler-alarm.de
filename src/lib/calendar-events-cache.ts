import type { GoogleCalendarEvent } from '@/features/auth/google/calendar-api';
import { localStorageStore } from '@/lib/storage';

const STORAGE_KEY = 'pendler-alarm.calendar-events-cache';

const normalizeEvents = (value: unknown): GoogleCalendarEvent[] | null => (
  Array.isArray(value) ? value as GoogleCalendarEvent[] : null
);

export const getCachedCalendarEvents = (): GoogleCalendarEvent[] =>
  localStorageStore.getJson(STORAGE_KEY, normalizeEvents) ?? [];

export const hasCachedCalendarEvents = (): boolean =>
  getCachedCalendarEvents().length > 0;

export const storeCachedCalendarEvents = (events: GoogleCalendarEvent[]): void => {
  localStorageStore.setJson(STORAGE_KEY, events);
};
