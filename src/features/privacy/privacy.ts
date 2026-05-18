import type { ApiMetrics, ApiRequestHistoryEntry, ApiRequestType } from '@/lib/api-metrics';
import {
  API_METRICS_STORAGE_KEY,
  APP_LOCALE_STORAGE_KEY,
  APP_VERSION_STORAGE_KEY,
  BAHN_BOOKING_CLASS_STORAGE_KEY,
  BAHN_TRAVELER_PROFILE_STORAGE_KEY,
  CALENDAR_EVENTS_CACHE_STORAGE_KEY,
  CALENDAR_SOURCE_STORAGE_KEY,
  CONNECTION_BUFFER_STORAGE_KEY,
  CONNECTION_CACHE_STORAGE_KEY,
  DEUTSCHLANDTICKET_STORAGE_KEY,
  GEO_CACHE_STORAGE_KEY,
  GOOGLE_CALENDAR_AUTH_SESSION_KEY,
  ORIGIN_PREFERENCES_STORAGE_KEY,
  PRIVACY_ITEMS,
  REMINDER_LEAD_STORAGE_KEY,
  SERVICE_WORKER_RELOAD_SESSION_KEY,
  SETUP_VISIT_STORAGE_KEY,
  SHARING_PREFERENCES_STORAGE_KEY,
  TRANSFER_WALK_NODES_STORAGE_KEY,
  getPrivacyItemDescriptionKey,
  getPrivacyItemTitleKey,
  getPrivacyProviderKey,
  isPrivacyApiItem,
  isPrivacyStorageItem,
  type PrivacyApiItem,
  type PrivacyStorageItem,
} from '@/utils/constants/api';

export {
  API_METRICS_STORAGE_KEY,
  APP_LOCALE_STORAGE_KEY,
  APP_VERSION_STORAGE_KEY,
  BAHN_BOOKING_CLASS_STORAGE_KEY,
  BAHN_TRAVELER_PROFILE_STORAGE_KEY,
  CALENDAR_EVENTS_CACHE_STORAGE_KEY,
  CALENDAR_SOURCE_STORAGE_KEY,
  CONNECTION_BUFFER_STORAGE_KEY,
  CONNECTION_CACHE_STORAGE_KEY,
  DEUTSCHLANDTICKET_STORAGE_KEY,
  GEO_CACHE_STORAGE_KEY,
  GOOGLE_CALENDAR_AUTH_SESSION_KEY,
  ORIGIN_PREFERENCES_STORAGE_KEY,
  REMINDER_LEAD_STORAGE_KEY,
  SERVICE_WORKER_RELOAD_SESSION_KEY,
  SETUP_VISIT_STORAGE_KEY,
  SHARING_PREFERENCES_STORAGE_KEY,
  TRANSFER_WALK_NODES_STORAGE_KEY,
};

export type PrivacyStorageArea = 'localStorage' | 'sessionStorage';

export type PrivacyApiDefinition = {
  key: string;
  type: ApiRequestType;
  labels: string[];
  titleKey?: string;
  titleText?: string;
  descriptionKey: string;
  providerKey?: string;
  providerText?: string;
  url: string;
  matchPrefixes: string[];
  icon?: string;
};

export type PrivacyApiUsageEntry = PrivacyApiDefinition & {
  isObserved: boolean;
  requestCount: number;
  lastUsedIso: string | null;
};

export type PrivacyStorageDefinition = {
  key: string;
  storageKey: string;
  storage: PrivacyStorageArea;
  titleKey: string;
  descriptionKey: string;
};

export type PrivacyStorageStateEntry = PrivacyStorageDefinition & {
  isPresent: boolean;
};

const buildUrlPrefix = (url: string): string => {
  try {
    const target = new URL(url);
    return `${target.origin}${target.pathname}`;
  } catch {
    return url;
  }
};

const createApiDefinition = (definition: PrivacyApiItem): PrivacyApiDefinition => ({
  key: definition.key,
  type: definition.requestType,
  labels: definition.labels,
  titleKey: getPrivacyItemTitleKey(definition.key),
  descriptionKey: getPrivacyItemDescriptionKey(definition.key),
  providerKey: getPrivacyProviderKey(definition.provider),
  url: definition.url,
  matchPrefixes: [buildUrlPrefix(definition.url)],
  icon: definition.icon,
});

const createStorageDefinition = (definition: PrivacyStorageItem): PrivacyStorageDefinition => ({
  key: definition.key,
  storageKey: definition.storageKey,
  storage: definition.type,
  titleKey: getPrivacyItemTitleKey(definition.key),
  descriptionKey: getPrivacyItemDescriptionKey(definition.key),
});

const staticApiDefinitions: PrivacyApiDefinition[] = [];
for (const definition of PRIVACY_ITEMS) {
  if (isPrivacyApiItem(definition)) {
    staticApiDefinitions.push(createApiDefinition(definition));
  }
}

const storageDefinitions: PrivacyStorageDefinition[] = [];
for (const definition of PRIVACY_ITEMS) {
  if (isPrivacyStorageItem(definition)) {
    storageDefinitions.push(createStorageDefinition(definition));
  }
}

const getRequestUrlPrefix = (entry: ApiRequestHistoryEntry): string => {
  const url = entry.payload?.url;

  if (!url) {
    return '';
  }

  return buildUrlPrefix(url);
};

const isMatchingApiEntry = (definition: PrivacyApiDefinition, entry: ApiRequestHistoryEntry): boolean => (
  definition.type === entry.type
  && definition.labels.includes(entry.label)
  && definition.matchPrefixes.includes(getRequestUrlPrefix(entry))
);

const createObservedApiDefinition = (entry: ApiRequestHistoryEntry): PrivacyApiDefinition | null => {
  const url = entry.payload?.url?.trim();

  if (!url) {
    return null;
  }

  let hostname = url;

  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return {
    key: `observed-${entry.type}-${entry.label}-${hostname}`,
    type: entry.type,
    labels: [entry.label],
    titleText: hostname,
    descriptionKey: getPrivacyItemDescriptionKey('observed'),
    providerText: hostname,
    url,
    matchPrefixes: [buildUrlPrefix(url)],
  };
};

const withUsage = (
  definition: PrivacyApiDefinition,
  history: ApiRequestHistoryEntry[],
): PrivacyApiUsageEntry => {
  const matches = history.filter((entry) => isMatchingApiEntry(definition, entry));
  const lastUsedIso = matches[0]?.startedAtIso ?? null;

  return {
    ...definition,
    isObserved: matches.length > 0,
    requestCount: matches.length,
    lastUsedIso,
  };
};

const getStorageItem = (storage: PrivacyStorageArea): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
};

const isStoragePresent = ({ storage, storageKey }: PrivacyStorageDefinition): boolean => {
  try {
    return getStorageItem(storage)?.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

export const getPrivacyApiUsageEntries = (metrics: ApiMetrics): PrivacyApiUsageEntry[] => {
  const history = [...metrics.history].sort((left, right) =>
    new Date(right.startedAtIso).getTime() - new Date(left.startedAtIso).getTime());

  const staticEntries = staticApiDefinitions.map((definition) => withUsage(definition, history));
  const unmatchedEntries = history.filter((entry) =>
    !staticApiDefinitions.some((definition) => isMatchingApiEntry(definition, entry)));

  const observedEntries = unmatchedEntries
    .map((entry) => createObservedApiDefinition(entry))
    .filter((entry): entry is PrivacyApiDefinition => entry !== null)
    .filter((entry, index, allEntries) => allEntries.findIndex((candidate) => candidate.key === entry.key) === index)
    .map((definition) => withUsage(definition, history));

  return [...staticEntries, ...observedEntries];
};

export const getPrivacyStorageEntries = (): PrivacyStorageStateEntry[] => storageDefinitions.map((entry) => ({
  ...entry,
  isPresent: isStoragePresent(entry),
}));
