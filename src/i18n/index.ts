import { createI18n } from 'vue-i18n';
import { APP_LOCALE_STORAGE_KEY } from '@/features/privacy/privacy';
import { localStorageStore } from '@/lib/storage';
import { de } from './messages/de';
import { en } from './messages/en';

export const messages = {
  de,
  en,
} as const;

export type AppLocale = keyof typeof messages;

const DEFAULT_LOCALE: AppLocale = 'de';
const isBrowser = typeof window !== 'undefined';

export const availableLocales = Object.keys(messages) as AppLocale[];

const isAppLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && availableLocales.includes(value as AppLocale);

const getInitialLocale = (): AppLocale => {
  if (!isBrowser) {
    return DEFAULT_LOCALE;
  }

  const storedLocale = localStorageStore.getString(APP_LOCALE_STORAGE_KEY);

  if (isAppLocale(storedLocale)) {
    return storedLocale;
  }

  const browserLocale = window.navigator.language.toLowerCase();

  if (browserLocale.startsWith('de')) {
    return 'de';
  }

  if (browserLocale.startsWith('en')) {
    return 'en';
  }

  return DEFAULT_LOCALE;
};

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
});

export const setLocale = (locale: AppLocale): void => {
  i18n.global.locale.value = locale;

  if (isBrowser) {
    localStorageStore.setString(APP_LOCALE_STORAGE_KEY, locale);
  }
};

export const getLocale = (): AppLocale => i18n.global.locale.value as AppLocale;

export const translate = (key: string, values?: Record<string, unknown>): string => {
  return i18n.global.t(key, values ?? {}) as string;
};


