export type ApiMetrics = {
  motis: number;
  googleCalendar: number;
  lastUpdatedIso: string | null;
};

const STORAGE_KEY = 'pendler_alarm_api_metrics_v1';

const defaultMetrics: ApiMetrics = {
  motis: 0,
  googleCalendar: 0,
  lastUpdatedIso: null,
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
      lastUpdatedIso: typeof parsed?.lastUpdatedIso === 'string' ? parsed.lastUpdatedIso : null,
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

export const getApiMetrics = (): ApiMetrics => ({ ...metrics });

export const incrementApiMetric = (type: 'motis' | 'googleCalendar'): ApiMetrics => {
  metrics = {
    ...metrics,
    [type]: metrics[type] + 1,
    lastUpdatedIso: new Date().toISOString(),
  };

  saveMetrics();
  return getApiMetrics();
};
