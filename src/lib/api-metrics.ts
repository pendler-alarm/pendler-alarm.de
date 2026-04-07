/* eslint-disable local-i18n/no-hardcoded-text */
export type ApiRequestType = 'motis' | 'googleCalendar' | 'sharing';

export type ApiRequestStatus = 'pending' | 'success' | 'error';

export type ApiRequestPayload = {
  method?: string;
  url?: string;
  query?: Record<string, string>;
  requestJson?: unknown;
  responseJson?: unknown;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  errorMessage?: string;
  errorKind?: string;
  cacheHit?: boolean;
  cacheKey?: string;
  cacheSource?: string;
  note?: string;
};

export type ApiRequestHistoryEntry = {
  id: string;
  type: ApiRequestType;
  label: string;
  startedAtIso: string;
  finishedAtIso: string | null;
  status: ApiRequestStatus;
  statusCode: number | null;
  durationMs: number | null;
  payload: ApiRequestPayload | null;
};

export type ApiMetrics = {
  motis: number;
  googleCalendar: number;
  sharing: number;
  lastUpdatedIso: string | null;
  history: ApiRequestHistoryEntry[];
};

const STORAGE_KEY = 'pendler_alarm_api_metrics_v1';
const MAX_HISTORY_ENTRIES = 120;
const MAX_JSON_DEPTH = 5;
const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_KEYS = 20;
const MAX_STRING_LENGTH = 800;

const defaultMetrics: ApiMetrics = {
  motis: 0,
  googleCalendar: 0,
  sharing: 0,
  lastUpdatedIso: null,
  history: [],
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clampString = (value: string): string => (
  value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…`
    : value
);

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return clampString(value);
  }

  if (depth >= MAX_JSON_DEPTH) {
    if (Array.isArray(value)) {
      return `[array(${String(value.length)}) truncated]`;
    }

    if (isPlainObject(value)) {
      return '[object truncated]';
    }
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_ARRAY_ITEMS).map((entry) => sanitizeValue(entry, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      limited.push(`[+${String(value.length - MAX_ARRAY_ITEMS)} more items]`);
    }

    return limited;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    const normalized = Object.fromEntries(
      entries.map(([key, entry]) => [key, sanitizeValue(entry, depth + 1)]),
    ) as Record<string, unknown>;

    if (Object.keys(value).length > MAX_OBJECT_KEYS) {
      normalized.__truncatedKeys = `+${String(Object.keys(value).length - MAX_OBJECT_KEYS)} more keys`;
    }

    return normalized;
  }

  return String(value);
};

const normalizePayload = (payload: Partial<ApiRequestPayload> | null | undefined): ApiRequestPayload | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalized: ApiRequestPayload = {};

  if (typeof payload.method === 'string') {
    normalized.method = payload.method;
  }

  if (typeof payload.url === 'string') {
    normalized.url = payload.url;
  }

  if (isPlainObject(payload.query)) {
    normalized.query = Object.fromEntries(
      Object.entries(payload.query).map(([key, value]) => [key, String(value)]),
    );
  }

  if (payload.requestJson !== undefined) {
    normalized.requestJson = sanitizeValue(payload.requestJson);
  }

  if (payload.responseJson !== undefined) {
    normalized.responseJson = sanitizeValue(payload.responseJson);
  }

  if (isPlainObject(payload.requestHeaders)) {
    normalized.requestHeaders = Object.fromEntries(
      Object.entries(payload.requestHeaders).map(([key, value]) => [key, String(value)]),
    );
  }

  if (isPlainObject(payload.responseHeaders)) {
    normalized.responseHeaders = Object.fromEntries(
      Object.entries(payload.responseHeaders).map(([key, value]) => [key, String(value)]),
    );
  }

  if (typeof payload.errorMessage === 'string') {
    normalized.errorMessage = payload.errorMessage;
  }

  if (typeof payload.errorKind === 'string') {
    normalized.errorKind = payload.errorKind;
  }

  if (typeof payload.cacheHit === 'boolean') {
    normalized.cacheHit = payload.cacheHit;
  }

  if (typeof payload.cacheKey === 'string') {
    normalized.cacheKey = payload.cacheKey;
  }

  if (typeof payload.cacheSource === 'string') {
    normalized.cacheSource = payload.cacheSource;
  }

  if (typeof payload.note === 'string') {
    normalized.note = payload.note;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const mergePayload = (
  current: ApiRequestPayload | null,
  patch: Partial<ApiRequestPayload> | null | undefined,
): ApiRequestPayload | null => {
  const normalizedPatch = normalizePayload(patch);

  if (!current) {
    return normalizedPatch;
  }

  if (!normalizedPatch) {
    return current;
  }

  return {
    ...current,
    ...normalizedPatch,
    query: {
      ...current.query,
      ...normalizedPatch.query,
    },
    requestHeaders: {
      ...current.requestHeaders,
      ...normalizedPatch.requestHeaders,
    },
    responseHeaders: {
      ...current.responseHeaders,
      ...normalizedPatch.responseHeaders,
    },
  };
};

const normalizeHistoryEntry = (entry: Partial<ApiRequestHistoryEntry> | null | undefined): ApiRequestHistoryEntry | null => {
  if (!entry?.id || !entry.type || !entry.label || !entry.startedAtIso) {
    return null;
  }

  return {
    id: entry.id,
    type: entry.type,
    label: entry.label,
    startedAtIso: entry.startedAtIso,
    finishedAtIso: typeof entry.finishedAtIso === 'string' ? entry.finishedAtIso : null,
    status: entry.status === 'success' || entry.status === 'error' ? entry.status : 'pending',
    statusCode: typeof entry.statusCode === 'number' ? entry.statusCode : null,
    durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
    payload: normalizePayload(entry.payload),
  };
};

const loadMetrics = (): ApiMetrics => {
  if (typeof window === 'undefined') {
    return { ...defaultMetrics };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultMetrics };
    }

    const parsed = JSON.parse(raw) as Partial<ApiMetrics> | null;
    return {
      motis: typeof parsed?.motis === 'number' ? parsed.motis : 0,
      googleCalendar: typeof parsed?.googleCalendar === 'number' ? parsed.googleCalendar : 0,
      sharing: typeof parsed?.sharing === 'number' ? parsed.sharing : 0,
      lastUpdatedIso: typeof parsed?.lastUpdatedIso === 'string' ? parsed.lastUpdatedIso : null,
      history: Array.isArray(parsed?.history)
        ? parsed.history
          .map((entry) => normalizeHistoryEntry(entry))
          .filter((entry): entry is ApiRequestHistoryEntry => entry !== null)
          .slice(0, MAX_HISTORY_ENTRIES)
        : [],
    };
  } catch {
    return { ...defaultMetrics };
  }
};

let metrics: ApiMetrics = loadMetrics();

const saveMetrics = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // Ignore storage errors.
  }
};

export const getApiMetrics = (): ApiMetrics => ({
  ...metrics,
  history: [...metrics.history],
});

export const startApiRequest = (
  type: ApiRequestType,
  label: string,
  payload?: Partial<ApiRequestPayload>,
): string => {
  const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAtIso = new Date().toISOString();

  metrics = {
    ...metrics,
    [type]: metrics[type] + 1,
    lastUpdatedIso: startedAtIso,
    history: [
      {
        id: requestId,
        type,
        label,
        startedAtIso,
        finishedAtIso: null,
        status: 'pending' as const,
        statusCode: null,
        durationMs: null,
        payload: normalizePayload(payload),
      },
      ...metrics.history,
    ].slice(0, MAX_HISTORY_ENTRIES),
  };

  saveMetrics();
  return requestId;
};

export const finishApiRequest = (
  requestId: string,
  status: Exclude<ApiRequestStatus, 'pending'>,
  statusCode?: number | null,
  payload?: Partial<ApiRequestPayload>,
): ApiMetrics => {
  const finishedAtIso = new Date().toISOString();

  metrics = {
    ...metrics,
    lastUpdatedIso: finishedAtIso,
    history: metrics.history.map((entry) => {
      if (entry.id !== requestId) {
        return entry;
      }

      const durationMs = new Date(finishedAtIso).getTime() - new Date(entry.startedAtIso).getTime();

      return {
        ...entry,
        finishedAtIso,
        status,
        statusCode: typeof statusCode === 'number' ? statusCode : null,
        durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null,
        payload: mergePayload(entry.payload, payload),
      };
    }),
  };

  saveMetrics();
  return getApiMetrics();
};

export const annotateApiRequest = (
  requestId: string,
  payload: Partial<ApiRequestPayload>,
): ApiMetrics => {
  metrics = {
    ...metrics,
    history: metrics.history.map((entry) => (
      entry.id === requestId
        ? {
          ...entry,
          payload: mergePayload(entry.payload, payload),
        }
        : entry
    )),
  };

  saveMetrics();
  return getApiMetrics();
};

export const clearApiRequestHistory = (): ApiMetrics => {
  metrics = { ...defaultMetrics };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      saveMetrics();
      return getApiMetrics();
    }
  }

  return getApiMetrics();
};
