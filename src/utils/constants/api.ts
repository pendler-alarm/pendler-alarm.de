import type { ApiRequestType } from '@/lib/api-metrics';

const GOOGLE_API = 'https://www.googleapis.com';
const MOTIS_API = 'https://api.transitous.org';
const PENDLER_ALARM_API = 'https://ola-vm.duckdns.org';
const TRAIN_ISP_CHECK_API = 'https://train-isp-check.vercel.app';
const NEXTBIKE_API = 'https://maps.nextbike.net/maps/nextbike-live.json';
const CD_WIFI_API = 'http://cdwifi.cz';
const GEOLOCATION_API = 'navigator.geolocation';

export const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CALENDAR_SCOPE = `${GOOGLE_API}/auth/calendar`;

export type PrivacyItemType = 'api' | 'localStorage' | 'sessionStorage';
export type PrivacyProviderKey =
  | 'browser'
  | 'cdWifi'
  | 'google'
  | 'nextbike'
  | 'pendlerAlarm'
  | 'trainIspCheck'
  | 'transitous';

type PrivacyItemBase = {
  key: string;
  icon?: string;
};

export type PrivacyApiItem = PrivacyItemBase & {
  type: 'api';
  url: string;
  requestType: ApiRequestType;
  labels: string[];
  provider: PrivacyProviderKey;
};

export type PrivacyStorageItem = PrivacyItemBase & {
  type: 'localStorage' | 'sessionStorage';
  storageKey: string;
};

export type PrivacyItemDefinition = PrivacyApiItem | PrivacyStorageItem;

export const PRIVACY_ITEM_KEY_PREFIX = 'views.privacy.items';
export const PRIVACY_PROVIDER_KEY_PREFIX = 'views.privacy.providers';

export const getPrivacyItemTitleKey = (key: string): string =>
  `${PRIVACY_ITEM_KEY_PREFIX}.${key}.title`;

export const getPrivacyItemDescriptionKey = (key: string): string =>
  `${PRIVACY_ITEM_KEY_PREFIX}.${key}.description`;

export const getPrivacyProviderKey = (provider: PrivacyProviderKey): string =>
  `${PRIVACY_PROVIDER_KEY_PREFIX}.${provider}`;

export const PRIVACY_ITEMS = [
  {
    key: 'googleCalendarEvents',
    type: 'api',
    url: `${GOOGLE_API}/calendar/v3/calendars/primary/events`,
    requestType: 'googleCalendar',
    labels: ['events'],
    provider: 'google',
    icon: 'material/event',
  },
  {
    key: 'motisGeocode',
    type: 'api',
    url: `${MOTIS_API}/api/v1/geocode`,
    requestType: 'motis',
    labels: ['geocode'],
    provider: 'transitous',
    icon: 'material/place',
  },
  {
    key: 'motisReverseGeocode',
    type: 'api',
    url: `${MOTIS_API}/api/v1/reverse-geocode`,
    requestType: 'motis',
    labels: ['reverse-geocode'],
    provider: 'transitous',
    icon: 'material/pin_drop',
  },
  {
    key: 'motisPlan',
    type: 'api',
    url: `${MOTIS_API}/api/v5/plan`,
    requestType: 'motis',
    labels: ['plan'],
    provider: 'transitous',
    icon: 'material/route',
  },
  {
    key: 'delayPredictions',
    type: 'api',
    url: `${PENDLER_ALARM_API}/api/delay-predictions`,
    requestType: 'motis',
    labels: ['delay-prediction'],
    provider: 'pendlerAlarm',
  },
  {
    key: 'workflowStations',
    type: 'api',
    url: `${PENDLER_ALARM_API}/api/workflow/stations`,
    requestType: 'motis',
    labels: ['workflow-stations'],
    provider: 'pendlerAlarm',
  },
  {
    key: 'nextbike',
    type: 'api',
    url: NEXTBIKE_API,
    requestType: 'sharing',
    labels: ['nextbike'],
    provider: 'nextbike',
    icon: 'material/pedal_bike',
  },
  {
    key: 'trainIspCheck',
    type: 'api',
    url: `${TRAIN_ISP_CHECK_API}/api/check`,
    requestType: 'motis',
    labels: ['train-isp-check'],
    provider: 'trainIspCheck',
    icon: 'material/train',
  },
  {
    key: 'cdWifiRealtime',
    type: 'api',
    url: `${CD_WIFI_API}/portal/api/vehicle/realtime`,
    requestType: 'motis',
    labels: ['cdwifi-realtime'],
    provider: 'cdWifi',
    icon: 'providers/cd',
  },
  {
    key: 'cdWifiCurrent',
    type: 'api',
    url: `${CD_WIFI_API}/portal/api/timetable/connexion/current`,
    requestType: 'motis',
    labels: ['cdwifi-current'],
    provider: 'cdWifi',
    icon: 'providers/cd',
  },
  {
    key: 'browserGeolocation',
    type: 'api',
    url: GEOLOCATION_API,
    requestType: 'motis',
    labels: ['train-presence-probe'],
    provider: 'browser',
    icon: 'material/my_location',
  },
  { key: 'appLocale', type: 'localStorage', storageKey: 'app-locale' },
  { key: 'calendarSource', type: 'localStorage', storageKey: 'pendler-alarm.calendar-source' },
  { key: 'reminderLead', type: 'localStorage', storageKey: 'pendler-alarm.reminder-lead-minutes' },
  { key: 'sharingPreferences', type: 'localStorage', storageKey: 'pendler-alarm.sharing-preferences' },
  { key: 'connectionBuffer', type: 'localStorage', storageKey: 'pendler-alarm.connection-buffer-minutes-by-event' },
  { key: 'deutschlandticket', type: 'localStorage', storageKey: 'pendler-alarm.deutschlandticket-enabled' },
  { key: 'transferWalkNodes', type: 'localStorage', storageKey: 'pendler-alarm.transfer-walk-nodes' },
  { key: 'bahnBookingClass', type: 'localStorage', storageKey: 'pendler-alarm.bahn-booking-class' },
  { key: 'bahnTravelerProfile', type: 'localStorage', storageKey: 'pendler-alarm.bahn-traveler-profile' },
  { key: 'setupVisit', type: 'localStorage', storageKey: 'pendler-alarm.setup-visit-seen' },
  { key: 'geoCache', type: 'localStorage', storageKey: 'pendler_alarm_geo_cache_v1' },
  { key: 'connectionCache', type: 'localStorage', storageKey: 'pendler_alarm_connection_cache_v3' },
  { key: 'calendarEventsCache', type: 'localStorage', storageKey: 'pendler-alarm.calendar-events-cache' },
  { key: 'appVersion', type: 'localStorage', storageKey: 'pendler-alarm.app-version' },
  { key: 'apiMetrics', type: 'localStorage', storageKey: 'pendler_alarm_api_metrics_v1' },
  { key: 'originPreferences', type: 'localStorage', storageKey: 'pendler-alarm.origin-preferences' },
  { key: 'googleAuthSession', type: 'sessionStorage', storageKey: 'google-calendar-auth' },
  { key: 'serviceWorkerReload', type: 'sessionStorage', storageKey: 'pendler-alarm.service-worker-reload' },
] as const satisfies readonly PrivacyItemDefinition[];

export const isPrivacyApiItem = (entry: PrivacyItemDefinition): entry is PrivacyApiItem =>
  entry.type === 'api';

export const isPrivacyStorageItem = (entry: PrivacyItemDefinition): entry is PrivacyStorageItem =>
  entry.type === 'localStorage' || entry.type === 'sessionStorage';

const getApiUrl = (key: string): string => {
  const entry = PRIVACY_ITEMS.find((candidate) => candidate.key === key);

  if (!entry || entry.type !== 'api') {
    throw new Error(`Missing API definition for "${key}".`);
  }

  return entry.url;
};

const getStorageKey = (key: string): string => {
  const entry = PRIVACY_ITEMS.find((candidate) => candidate.key === key);

  if (!entry || (entry.type !== 'localStorage' && entry.type !== 'sessionStorage')) {
    throw new Error(`Missing storage definition for "${key}".`);
  }

  return entry.storageKey;
};

export const GOOGLE_API_CALENDAR_EVENTS = getApiUrl('googleCalendarEvents');
export const MOTIS_API_GEOCODE = getApiUrl('motisGeocode');
export const MOTIS_API_REVERSE_GEOCODE = getApiUrl('motisReverseGeocode');
export const MOTIS_API_PLAN = getApiUrl('motisPlan');
export const PENDLER_ALARM_API_DELAY_PREDICTIONS = getApiUrl('delayPredictions');
export const PENDLER_ALARM_API_WORKFLOW_STATIONS = getApiUrl('workflowStations');
export const TRAIN_ISP_CHECK_API_CHECK = getApiUrl('trainIspCheck');
export const CD_WIFI_API_REALTIME = getApiUrl('cdWifiRealtime');
export const CD_WIFI_API_CURRENT = getApiUrl('cdWifiCurrent');

export const APP_LOCALE_STORAGE_KEY = getStorageKey('appLocale');
export const CALENDAR_SOURCE_STORAGE_KEY = getStorageKey('calendarSource');
export const GOOGLE_CALENDAR_AUTH_SESSION_KEY = getStorageKey('googleAuthSession');
export const REMINDER_LEAD_STORAGE_KEY = getStorageKey('reminderLead');
export const SHARING_PREFERENCES_STORAGE_KEY = getStorageKey('sharingPreferences');
export const CONNECTION_BUFFER_STORAGE_KEY = getStorageKey('connectionBuffer');
export const DEUTSCHLANDTICKET_STORAGE_KEY = getStorageKey('deutschlandticket');
export const TRANSFER_WALK_NODES_STORAGE_KEY = getStorageKey('transferWalkNodes');
export const BAHN_BOOKING_CLASS_STORAGE_KEY = getStorageKey('bahnBookingClass');
export const BAHN_TRAVELER_PROFILE_STORAGE_KEY = getStorageKey('bahnTravelerProfile');
export const SETUP_VISIT_STORAGE_KEY = getStorageKey('setupVisit');
export const GEO_CACHE_STORAGE_KEY = getStorageKey('geoCache');
export const CONNECTION_CACHE_STORAGE_KEY = getStorageKey('connectionCache');
export const CALENDAR_EVENTS_CACHE_STORAGE_KEY = getStorageKey('calendarEventsCache');
export const APP_VERSION_STORAGE_KEY = getStorageKey('appVersion');
export const API_METRICS_STORAGE_KEY = getStorageKey('apiMetrics');
export const ORIGIN_PREFERENCES_STORAGE_KEY = getStorageKey('originPreferences');
export const SERVICE_WORKER_RELOAD_SESSION_KEY = getStorageKey('serviceWorkerReload');
