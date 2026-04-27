import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { localStorageStore } from '@/lib/storage';

export type CalendarSourceMode = 'google' | 'ical';

type PersistedCalendarSource = {
  mode: CalendarSourceMode;
  icalUrl: string;
};

const STORAGE_KEY = 'pendler-alarm.calendar-source';

const readPersistedCalendarSource = (): PersistedCalendarSource | null => localStorageStore.getJson(
  STORAGE_KEY,
  (value) => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const parsed = value as Partial<PersistedCalendarSource>;
    const mode = parsed.mode === 'ical' ? 'ical' : 'google';
    const icalUrl = typeof parsed.icalUrl === 'string' ? parsed.icalUrl.trim() : '';

    return {
      mode,
      icalUrl,
    };
  },
);

const persistCalendarSource = (value: PersistedCalendarSource): void => {
  localStorageStore.setJson(STORAGE_KEY, value);
};

export const useCalendarSourceStore = defineStore('calendar-source', () => {
  const persisted = readPersistedCalendarSource();
  const mode = ref<CalendarSourceMode>(persisted?.mode ?? 'google');
  const icalUrl = ref<string>(persisted?.icalUrl ?? '');

  const normalizedIcalUrl = computed(() => icalUrl.value.trim());
  const isIcalConfigured = computed(() => normalizedIcalUrl.value.length > 0);

  const persist = (): void => {
    persistCalendarSource({
      mode: mode.value,
      icalUrl: normalizedIcalUrl.value,
    });
  };

  const setGoogleMode = (): void => {
    mode.value = 'google';
    persist();
  };

  const setIcalSource = (nextUrl: string): void => {
    mode.value = 'ical';
    icalUrl.value = nextUrl.trim();
    persist();
  };

  const clearIcalSource = (): void => {
    icalUrl.value = '';

    if (mode.value === 'ical') {
      mode.value = 'google';
    }

    persist();
  };

  return {
    mode,
    icalUrl,
    normalizedIcalUrl,
    isIcalConfigured,
    setGoogleMode,
    setIcalSource,
    clearIcalSource,
  };
});
