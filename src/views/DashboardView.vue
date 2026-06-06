<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { BahnBookingClass } from '@/components/connection/connection-utils';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Message from '@/components/Message.vue';
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue';
import Widget from '@/components/Widget.vue';
import { useExpandToggleGroupCount } from '@/components/ExpandToggle/ExpandToggle.ts';
import ConnectionCard from '@/components/connection/ConnectionCard/ConnectionCard.vue';
import SharingOptionCard from '@/components/connection/SharingOptionCard.vue';
import GoogleAuthCard from '@/features/auth/google/GoogleAuthCard.vue';
import {
  DEFAULT_CONNECTION_BUFFER_MINUTES,
  fetchEventConnection,
  fetchUpcomingIcalEvents,
  fetchUpcomingCalendarEvents,
  type GoogleCalendarEvent,
} from '@/features/auth/google/calendar-api';
import { useCalendarSourceStore } from '@/features/calendar/calendar-source-store';
import {
  formatCoordinates,
  getCurrentResolvedLocation,
  resolveLocation,
  searchLocationSuggestions,
  type Coordinates,
  type LocationSuggestion,
  type ResolvedLocation,
} from '@/features/motis/location-service';
import { detectTrainLocation, type TrainLocationContext } from '@/features/motis/train-location-service';
import { trainPresenceState } from '@/features/motis/train-presence-store';
import {
  loadStoredOriginPreferences,
  storeOriginPreferences,
  type FavoriteLocation,
  type OriginMode,
} from '@/lib/location-preferences';
import {
  findSharingSuggestion,
  getDefaultSharingPreferences,
  type SharingPreferences,
  type SharingProviderId,
} from '@/features/sharing/sharing-service';
import {
  clearApiRequestHistory,
  getApiMetrics,
  type ApiRequestHistoryEntry,
  type ApiRequestStatus,
  type ApiRequestType,
} from '@/lib/api-metrics';
import { getCachedCalendarEvents, storeCachedCalendarEvents } from '@/lib/calendar-events-cache';
import { getCachedConnection, storeConnection } from '@/lib/connection-cache';
import { localStorageStore } from '@/lib/storage';
import { useGoogleAuthStore } from '@/features/auth/google/store';

type NotificationUiState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

const refreshIntervalMs = 5 * 60_000;
const REMINDER_LEAD_KEY = 'pendler-alarm.reminder-lead-minutes';
const SHARING_PREFERENCES_KEY = 'pendler-alarm.sharing-preferences';
const CONNECTION_BUFFER_KEY = 'pendler-alarm.connection-buffer-minutes-by-event';
const DEUTSCHLANDTICKET_KEY = 'pendler-alarm.deutschlandticket-enabled';
const TRANSFER_WALK_NODES_KEY = 'pendler-alarm.transfer-walk-nodes';
const BAHN_BOOKING_CLASS_KEY = 'pendler-alarm.bahn-booking-class';
const BAHN_TRAVELER_PROFILE_KEY = 'pendler-alarm.bahn-traveler-profile';
const DEFAULT_BAHN_BOOKING_CLASS: BahnBookingClass = '2';
const DEFAULT_BAHN_TRAVELER_PROFILE = '13:23:KLASSE_2:1';
const DEFAULT_TRANSFER_WALK_NODES = false;
const DEFAULT_LEAD_MINUTES = 30;
const AUTOCOMPLETE_DELAY_MS = 250;
const defaultSharingPreferences = getDefaultSharingPreferences();

const normalizeConnectionBufferMinutes = (value: number | null | undefined): number => {
  const normalized = Math.round(value ?? DEFAULT_CONNECTION_BUFFER_MINUTES);

  if (!Number.isFinite(normalized)) {
    return DEFAULT_CONNECTION_BUFFER_MINUTES;
  }

  return Math.min(Math.max(normalized, 0), 12 * 60);
};

const loadStoredConnectionBuffers = (): Record<string, number> => localStorageStore.getJson(CONNECTION_BUFFER_KEY, (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => typeof entry === 'number' && Number.isFinite(entry))
    .map(([eventId, entry]) => [eventId, normalizeConnectionBufferMinutes(entry)]));
}) ?? {};

const storeConnectionBuffers = (buffers: Record<string, number>): void => {
  localStorageStore.setJson(CONNECTION_BUFFER_KEY, buffers);
};

const loadStoredSharingPreferences = (): SharingPreferences => localStorageStore.getJson(SHARING_PREFERENCES_KEY, (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<SharingPreferences>;

  return {
    providerId: (parsed.providerId as SharingProviderId | undefined) ?? defaultSharingPreferences.providerId,
    shortTripDistanceKm: typeof parsed.shortTripDistanceKm === 'number'
      ? parsed.shortTripDistanceKm
      : defaultSharingPreferences.shortTripDistanceKm,
    stationSearchRadiusMeters: typeof parsed.stationSearchRadiusMeters === 'number'
      ? parsed.stationSearchRadiusMeters
      : defaultSharingPreferences.stationSearchRadiusMeters,
    customProviderLabel: parsed.customProviderLabel?.trim() || defaultSharingPreferences.customProviderLabel,
    customGbfsUrl: parsed.customGbfsUrl?.trim() || defaultSharingPreferences.customGbfsUrl,
  };
}) ?? defaultSharingPreferences;

const loadStoredDeutschlandticket = (): boolean =>
  localStorageStore.getBoolean(DEUTSCHLANDTICKET_KEY) ?? true;

const loadStoredBahnBookingClass = (): BahnBookingClass =>
  localStorageStore.getString(BAHN_BOOKING_CLASS_KEY) === '1' ? '1' : DEFAULT_BAHN_BOOKING_CLASS;

const loadStoredBahnTravelerProfile = (): string => {
  const raw = localStorageStore.getString(BAHN_TRAVELER_PROFILE_KEY)?.trim();

  return raw || DEFAULT_BAHN_TRAVELER_PROFILE;
};

const loadStoredTransferWalkNodes = (): boolean =>
  localStorageStore.getBoolean(TRANSFER_WALK_NODES_KEY) ?? DEFAULT_TRANSFER_WALK_NODES;

const getReminderLeadTimeMs = (): number => {
  const minutes = localStorageStore.getNumber(REMINDER_LEAD_KEY) ?? DEFAULT_LEAD_MINUTES;
  const normalized = minutes > 0 ? minutes : DEFAULT_LEAD_MINUTES;
  return normalized * 60_000;
};

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const calendarSourceStore = useCalendarSourceStore();
const initialOriginPreferences = loadStoredOriginPreferences();
const initialSharingPreferences = loadStoredSharingPreferences();
const storedConnectionBuffers = ref<Record<string, number>>(loadStoredConnectionBuffers());
const events = ref<GoogleCalendarEvent[]>([]);
const currentLocation = ref<ResolvedLocation | null>(null);
const currentLocationError = ref('');
const originMode = ref<OriginMode>(initialOriginPreferences.mode);
const fixedLocationInput = ref<string>(initialOriginPreferences.fixedLocationInput);
const favoriteLocations = ref<FavoriteLocation[]>(initialOriginPreferences.favorites);
const favoriteNameInput = ref('');
const editingFavoriteId = ref<string | null>(null);
const fixedLocationSuggestions = ref<LocationSuggestion[]>([]);
const isLoadingFixedLocationSuggestions = ref(false);
const trainDetection = ref<TrainLocationContext | null>(null);
const notificationState = ref<NotificationUiState>('unknown');
const isStandalone = ref(false);
const isLoadingEvents = ref(false);
const eventsError = ref('');
const loadingConnectionsById = ref<Record<string, boolean>>({});
const connectionRequestTokens = ref<Record<string, number>>({});
const apiMetrics = ref(getApiMetrics());
const shouldUseCachedEvents = computed(() => route.query.cachedEvents === '1');
const hasCalendarAccess = computed(() => googleAuthStore.isAuthenticated || calendarSourceStore.isIcalConfigured);
const activeCalendarSourceLabel = computed(() => (
  calendarSourceStore.mode === 'ical' && calendarSourceStore.isIcalConfigured
    ? t('views.dashboard.events.sources.ical')
    : t('views.dashboard.events.sources.google')
));
const calendarAccessKey = computed(() => JSON.stringify({
  googleAuthenticated: googleAuthStore.isAuthenticated,
  icalMode: calendarSourceStore.mode,
  icalUrl: calendarSourceStore.normalizedIcalUrl,
}));
const lastConnectionRefreshAt = ref<string | null>(null);
const debugNotificationFeedback = ref<{
  variant: 'success' | 'error' | 'warning';
  message: string;
} | null>(null);
const currentDebugNotificationTag = ref<string | null>(null);
const debugHistoryQuery = ref('');
const debugHistoryTypeFilter = ref<'all' | ApiRequestType>('all');
const debugHistoryStatusFilter = ref<'all' | ApiRequestStatus>('all');
const sharingProviderId = ref<SharingProviderId>(initialSharingPreferences.providerId);
const sharingShortTripDistanceKm = ref<number>(initialSharingPreferences.shortTripDistanceKm);
const sharingStationSearchRadiusMeters = ref<number>(initialSharingPreferences.stationSearchRadiusMeters);
const sharingCustomProviderLabel = ref<string>(initialSharingPreferences.customProviderLabel);
const sharingCustomGbfsUrl = ref<string>(initialSharingPreferences.customGbfsUrl);
const deutschlandticketEnabled = ref<boolean>(loadStoredDeutschlandticket());
const bahnBookingClass = ref<BahnBookingClass>(loadStoredBahnBookingClass());
const bahnTravelerProfileParam = ref<string>(loadStoredBahnTravelerProfile());
const showTransferWalkNodes = ref<boolean>(loadStoredTransferWalkNodes());
let loadSequence = 0;
let fixedLocationAutocompleteTimer: number | null = null;
let refreshTimer: number | null = null;
const reminderTimers = new Map<string, number>();
const sentReminderKeys = new Set<string>();
const notificationIconUrl = new URL('../assets/svg/logo.svg', import.meta.url).href;

const apiTotal = computed(() => apiMetrics.value.googleCalendar + apiMetrics.value.motis + apiMetrics.value.sharing);
const expandedConnectionCount = useExpandToggleGroupCount('dashboard-connections');
const filteredApiHistory = computed<ApiRequestHistoryEntry[]>(() => apiMetrics.value.history.filter((entry) => {
  const matchesType = debugHistoryTypeFilter.value === 'all' || entry.type === debugHistoryTypeFilter.value;
  const matchesStatus = debugHistoryStatusFilter.value === 'all' || entry.status === debugHistoryStatusFilter.value;
  const query = debugHistoryQuery.value.trim().toLowerCase();
  const matchesQuery = query.length === 0
    || entry.label.toLowerCase().includes(query)
    || formatTimestamp(entry.startedAtIso)?.toLowerCase().includes(query)
    || String(entry.statusCode ?? '').includes(query);

  return matchesType && matchesStatus && matchesQuery;
}));
const sharingProviderOptions = computed(() => [
  { value: 'disabled', label: t('views.dashboard.events.sharing.providers.disabled') },
  { value: 'nextbike', label: t('views.dashboard.events.sharing.providers.nextbike') },
  { value: 'custom', label: t('views.dashboard.events.sharing.providers.custom') },
]);
const currentSharingProviderLabel = computed(() =>
  sharingProviderOptions.value.find((provider) => provider.value === sharingProviderId.value)?.label
  ?? t('views.dashboard.events.sharing.providers.disabled'),
);
const sharingPreferences = computed<SharingPreferences>(() => ({
  providerId: sharingProviderId.value,
  shortTripDistanceKm: sharingShortTripDistanceKm.value,
  stationSearchRadiusMeters: sharingStationSearchRadiusMeters.value,
  customProviderLabel: sharingCustomProviderLabel.value,
  customGbfsUrl: sharingCustomGbfsUrl.value,
}));
const isCustomSharingProvider = computed(() => sharingProviderId.value === 'custom');
const bahnBookingClassOptions = computed(() => [
  { value: '1', label: t('views.dashboard.events.settings.classFirst') },
  { value: '2', label: t('views.dashboard.events.settings.classSecond') },
]);
const travelerProfileSummaryLabel = computed(() => {
  if (bahnTravelerProfileParam.value === DEFAULT_BAHN_TRAVELER_PROFILE) {
    return t('views.dashboard.events.settings.travelerProfileDefault');
  }

  return bahnTravelerProfileParam.value;
});
const toRadians = (value: number): number => value * (Math.PI / 180);

const getDistanceMeters = (from: Coordinates, to: Coordinates): number => {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const settingsSummaryLabel = computed(() => t('views.dashboard.events.settings.summary', {
  deutschlandticket: deutschlandticketEnabled.value
    ? t('views.dashboard.events.settings.deutschlandticketEnabled')
    : t('views.dashboard.events.settings.deutschlandticketDisabled'),
  travelerProfile: travelerProfileSummaryLabel.value,
  bookingClass: bahnBookingClassOptions.value.find((option) => option.value === bahnBookingClass.value)?.label
    ?? t('views.dashboard.events.settings.classSecond'),
  provider: currentSharingProviderLabel.value,
  distanceKm: sharingShortTripDistanceKm.value,
  radiusMeters: sharingStationSearchRadiusMeters.value,
}));
const favoriteSaveLabel = computed(() => editingFavoriteId.value
  ? t('views.dashboard.events.currentLocation.updateFavorite')
  : t('views.dashboard.events.currentLocation.saveFavorite'));
const currentLocationSourceLabel = computed(() => {
  if (originMode.value === 'fixed') {
    return t('views.dashboard.events.currentLocation.sourceFixed');
  }

  if (trainDetection.value?.carrierName) {
    return t('views.dashboard.events.currentLocation.sourceCd');
  }

  if (trainDetection.value?.icePortalReachable) {
    return t('views.dashboard.events.currentLocation.sourceTrain');
  }

  return t('views.dashboard.events.currentLocation.sourceCurrent');
});
const trainPortalLabel = computed(() => {
  if (originMode.value != 'current' || trainDetection.value?.carrierName) {
    return null;
  }

  const trainName = [trainDetection.value?.trainType, trainDetection.value?.trainNumber]
    .filter((part): part is string => Boolean(part))
    .join(' ');

  if (trainDetection.value?.icePortalReachable) {
    return trainName
      ? t('views.dashboard.events.currentLocation.trainReachableNamed', { train: trainName })
      : t('views.dashboard.events.currentLocation.trainReachable');
  }

  return t('views.dashboard.events.currentLocation.trainUnavailable');
});
const trainSpeedLabel = computed(() => {
  const speedKmh = trainDetection.value?.speedKmh;

  return speedKmh !== null && speedKmh !== undefined
    ? t('views.dashboard.events.currentLocation.speedLabel', { value: Math.round(speedKmh) })
    : null;
});
const trainConnectionLabel = computed(() => {
  const parts = [trainDetection.value?.connectionType, trainDetection.value?.effectiveType]
    .filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? t('views.dashboard.events.currentLocation.connectionLabel', { value: parts.join(' / ') })
    : null;
});
const browserTrainStatusLabel = computed(() => {
  if (originMode.value !== 'current') {
    return null;
  }

  if (trainDetection.value?.trainIspReachable) {
    return trainDetection.value.trainIspLikely
      ? t('views.dashboard.events.currentLocation.trainLikely')
      : t('views.dashboard.events.currentLocation.trainUnlikely');
  }

  if (trainPresenceState.status === 'success') {
    return trainPresenceState.isTrainLikely
      ? t('views.dashboard.events.currentLocation.trainLikely')
      : t('views.dashboard.events.currentLocation.trainUnlikely');
  }

  return t('views.dashboard.events.currentLocation.trainCheckUnavailable');
});
const browserTrainIspLabel = computed(() => {
  if (originMode.value !== 'current') {
    return null;
  }

  const provider = trainDetection.value?.trainIspProvider ?? trainPresenceState.isp;

  return provider
    ? t('views.dashboard.events.currentLocation.trainIspLabel', { value: provider })
    : null;
});
const trainCarrierIcon = computed(() => trainDetection.value?.carrierLogoIcon ?? null);
const trainCarrierLabel = computed(() => trainDetection.value?.carrierName
  ? t('views.dashboard.events.currentLocation.carrierLabel', { value: trainDetection.value.carrierName })
  : null);
const trainNameLabel = computed(() => trainDetection.value?.trainType
  ? t('views.dashboard.events.currentLocation.trainNameLabel', { value: trainDetection.value.trainType })
  : null);
const currentLocationMapLink = computed(() => {
  const coordinates = currentLocation.value?.coordinates;

  if (!coordinates) {
    return null;
  }

  const params = new URLSearchParams({
    mlat: String(coordinates.lat),
    mlon: String(coordinates.lon),
    zoom: '14',
  });

  return `https://www.openstreetmap.org/?${params.toString()}`;
});
const currentLocationCoordinateLabel = computed(() => currentLocation.value?.coordinates
  ? t('views.dashboard.events.currentLocation.mapCoordinates', {
    value: formatCoordinates(currentLocation.value.coordinates),
  })
  : null);
const currentLocationMapEmbedUrl = computed(() => {
  const coordinates = currentLocation.value?.coordinates;

  if (!coordinates) {
    return null;
  }

  const deltaLat = 0.006;
  const deltaLon = 0.012;
  const params = new URLSearchParams({
    bbox: `${coordinates.lon - deltaLon},${coordinates.lat - deltaLat},${coordinates.lon + deltaLon},${coordinates.lat + deltaLat}`,
    layer: 'mapnik',
    marker: `${coordinates.lat},${coordinates.lon}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
});
const hasCdTrainRoute = computed(() => originMode.value === 'current' && Boolean(trainDetection.value?.carrierName));
const routeEtaMinutes = computed(() => {
  const currentCoordinates = currentLocation.value?.coordinates;
  const nextCoordinates = trainDetection.value?.nextStationCoordinates;
  const speedKmh = trainDetection.value?.speedKmh;

  if (!currentCoordinates || !nextCoordinates || !speedKmh || speedKmh <= 5) {
    return null;
  }

  const distanceMeters = getDistanceMeters(currentCoordinates, nextCoordinates);
  const metersPerMinute = (speedKmh * 1000) / 60;

  if (!Number.isFinite(distanceMeters) || metersPerMinute <= 0) {
    return null;
  }

  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
});
const routeEtaLabel = computed(() => {
  const nextStationName = trainDetection.value?.nextStationName;

  if (!nextStationName) {
    return null;
  }

  return routeEtaMinutes.value !== null
    ? t('views.dashboard.events.currentLocation.routeEtaLabel', { station: nextStationName })
    : t('views.dashboard.events.currentLocation.routeEtaUnavailable');
});
const routeEtaValueLabel = computed(() => routeEtaMinutes.value !== null
  ? t('views.dashboard.events.currentLocation.routeEtaValue', { value: routeEtaMinutes.value })
  : null);
const connectionRoutingOrigin = computed<ResolvedLocation | null>(() => {
  if (!hasCdTrainRoute.value) {
    return currentLocation.value;
  }

  const nextStationCoordinates = trainDetection.value?.nextStationCoordinates;

  if (!nextStationCoordinates) {
    return currentLocation.value;
  }

  return {
    address: trainDetection.value?.nextStationName ?? currentLocation.value?.address ?? null,
    coordinates: nextStationCoordinates,
  };
});
const connectionRoutingDepartureNotBeforeIso = computed(() => {
  if (!hasCdTrainRoute.value || routeEtaMinutes.value === null) {
    return null;
  }

  return new Date(Date.now() + routeEtaMinutes.value * 60_000).toISOString();
});
const getConnectionRequestOptions = () => ({
  showTransferWalkNodes: showTransferWalkNodes.value,
  routingOrigin: connectionRoutingOrigin.value,
  departureNotBeforeIso: connectionRoutingDepartureNotBeforeIso.value,
});
const notificationStatusVariant = computed<'success' | 'warning' | 'error'>(() => {
  if (notificationState.value === 'granted') {
    return 'success';
  }

  if (notificationState.value === 'denied') {
    return 'error';
  }

  return 'warning';
});
const notificationStatusMessage = computed(() => {
  if (notificationState.value === 'granted') {
    return isStandalone.value
      ? t('views.dashboard.events.notification.statusGrantedStandalone')
      : t('views.dashboard.events.notification.statusGrantedBrowser');
  }

  if (notificationState.value === 'denied') {
    return t('views.dashboard.events.notification.statusDenied');
  }

  return t('views.dashboard.events.notification.statusPrompt');
});

const updateApiMetrics = (): void => {
  apiMetrics.value = getApiMetrics();
};

const debugHistoryJson = computed(() => JSON.stringify({
  googleCalendar: apiMetrics.value.googleCalendar,
  motis: apiMetrics.value.motis,
  sharing: apiMetrics.value.sharing,
  lastUpdatedIso: apiMetrics.value.lastUpdatedIso,
  lastConnectionRefreshAt: lastConnectionRefreshAt.value,
  filters: {
    query: debugHistoryQuery.value,
    type: debugHistoryTypeFilter.value,
    status: debugHistoryStatusFilter.value,
  },
  visibleHistory: filteredApiHistory.value,
}, null, 2));

const clearDebugHistory = (): void => {
  apiMetrics.value = clearApiRequestHistory();
  debugHistoryQuery.value = '';
  debugHistoryTypeFilter.value = 'all';
  debugHistoryStatusFilter.value = 'all';
};

const getDebugTypeLabel = (type: 'all' | ApiRequestType): string => {
  if (type === 'all') {
    return t('views.dashboard.events.debug.filters.allTypes');
  }

  if (type === 'googleCalendar') {
    return t('views.dashboard.events.debug.history.googleCalendar');
  }

  if (type === 'sharing') {
    return t('views.dashboard.events.debug.history.sharing');
  }

  return t('views.dashboard.events.debug.history.motis');
};

const getDebugStatusLabel = (status: 'all' | ApiRequestStatus): string => {
  if (status === 'all') {
    return t('views.dashboard.events.debug.filters.allStatuses');
  }

  switch (status) {
    case 'pending':
      return t('views.dashboard.events.debug.status.pending');
    case 'success':
      return t('views.dashboard.events.debug.status.success');
    case 'error':
      return t('views.dashboard.events.debug.status.error');
    default:
      return status;
  }
};

const getDebugRequestLabel = (entry: ApiRequestHistoryEntry): string => {
  if (entry.type === 'googleCalendar' && entry.label === 'events') {
    return t('views.dashboard.events.debug.history.googleCalendarEvents');
  }

  if (entry.type === 'motis' && entry.label === 'plan') {
    return t('views.dashboard.events.debug.history.motisPlan');
  }

  if (entry.type === 'motis' && entry.label === 'delay-prediction') {
    return t('views.dashboard.events.debug.history.motisDelayPrediction');
  }

  if (entry.type === 'motis' && entry.label === 'geocode') {
    return t('views.dashboard.events.debug.history.motisGeocode');
  }

  if (entry.type === 'motis' && entry.label === 'reverse-geocode') {
    return t('views.dashboard.events.debug.history.motisReverseGeocode');
  }

  if (entry.type === 'sharing' && entry.label === 'nextbike') {
    return t('views.dashboard.events.debug.history.nextbike');
  }

  if (entry.type === 'sharing' && entry.label === 'gbfs-discovery') {
    return t('views.dashboard.events.debug.history.gbfsDiscovery');
  }

  if (entry.type === 'sharing' && entry.label === 'gbfs-station-information') {
    return t('views.dashboard.events.debug.history.gbfsStationInformation');
  }

  if (entry.type === 'sharing' && entry.label === 'gbfs-station-status') {
    return t('views.dashboard.events.debug.history.gbfsStationStatus');
  }

  return `${getDebugTypeLabel(entry.type)} · ${entry.label}`;
};

const formatDurationMs = (value: number | null): string => {
  if (value === null) {
    return '...';
  }

  if (value < 1000) {
    return `${String(value)} ms`;
  }

  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} s`;
};

const getDebugEntryJson = (entry: ApiRequestHistoryEntry): string => JSON.stringify({
  id: entry.id,
  type: entry.type,
  label: entry.label,
  startedAtIso: entry.startedAtIso,
  finishedAtIso: entry.finishedAtIso,
  status: entry.status,
  statusCode: entry.statusCode,
  durationMs: entry.durationMs,
  payload: entry.payload,
}, null, 2);

const setDebugNotificationFeedback = (
  variant: 'success' | 'error' | 'warning',
  message: string,
): void => {
  debugNotificationFeedback.value = { variant, message };
};

const syncNotificationState = (): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    notificationState.value = 'unsupported';
    return;
  }

  if (Notification.permission === 'granted') {
    notificationState.value = 'granted';
    return;
  }

  if (Notification.permission === 'denied') {
    notificationState.value = 'denied';
    return;
  }

  notificationState.value = 'prompt';
};

const syncStandaloneState = (): void => {
  if (typeof window === 'undefined') {
    isStandalone.value = false;
    return;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  // eslint-disable-next-line local-i18n/no-hardcoded-text
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
};

const handleServiceWorkerMessage = (event: MessageEvent): void => {
  if (event.data?.type !== 'DEBUG_NOTIFICATION_RESULT') {
    return;
  }

  const { ok, error, tag } = event.data.payload ?? {};

  if (!currentDebugNotificationTag.value || tag !== currentDebugNotificationTag.value) {
    return;
  }

  currentDebugNotificationTag.value = null;

  if (ok) {
    setDebugNotificationFeedback('success', t('views.dashboard.events.debug.feedback.displayed'));
    return;
  }

  setDebugNotificationFeedback(
    'error',
    error
      ? t('views.dashboard.events.debug.feedback.failedWithReason', { reason: error })
      : t('views.dashboard.events.debug.feedback.failed'),
  );
};

const formatTimestamp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const compactLocationLabel = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index);
  return uniqueParts.slice(0, 2).join(', ');
};

const hasResolvedLocation = (location: ResolvedLocation | null | undefined): boolean =>
  Boolean(location?.address || location?.coordinates);

const clearFixedLocationAutocomplete = (): void => {
  if (fixedLocationAutocompleteTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(fixedLocationAutocompleteTimer);
    fixedLocationAutocompleteTimer = null;
  }
};

const persistOriginPreferences = (): void => {
  storeOriginPreferences({
    mode: originMode.value,
    fixedLocationInput: fixedLocationInput.value.trim(),
    favorites: favoriteLocations.value,
  });
};

const createFavoriteId = (): string => `favorite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resetFavoriteEditor = (): void => {
  editingFavoriteId.value = null;
  favoriteNameInput.value = '';
};

const resolveFixedLocationInput = async (): Promise<ResolvedLocation> => {
  const normalized = fixedLocationInput.value.trim();

  if (!normalized) {
    throw new Error(t('views.dashboard.events.currentLocation.applyErrorEmpty'));
  }

  const matchingFavorite = favoriteLocations.value.find((favorite) => favorite.address === normalized);
  const resolved = matchingFavorite?.coordinates
    ? { address: matchingFavorite.address, coordinates: matchingFavorite.coordinates }
    : await resolveLocation(normalized);

  if (!hasResolvedLocation(resolved)) {
    throw new Error(t('views.dashboard.events.currentLocation.applyErrorUnresolved'));
  }

  return {
    address: resolved.address ?? normalized,
    coordinates: resolved.coordinates,
  };
};

const persistSharingPreferences = (): void => {
  localStorageStore.setJson(SHARING_PREFERENCES_KEY, sharingPreferences.value);
};

const persistDeutschlandticketPreference = (): void => {
  localStorageStore.setBoolean(DEUTSCHLANDTICKET_KEY, deutschlandticketEnabled.value);
};

const persistBahnBookingClass = (): void => {
  localStorageStore.setString(BAHN_BOOKING_CLASS_KEY, bahnBookingClass.value);
};

const persistBahnTravelerProfile = (): void => {
  localStorageStore.setString(
    BAHN_TRAVELER_PROFILE_KEY,
    bahnTravelerProfileParam.value.trim() || DEFAULT_BAHN_TRAVELER_PROFILE,
  );
};

const persistTransferWalkNodes = (): void => {
  localStorageStore.setBoolean(TRANSFER_WALK_NODES_KEY, showTransferWalkNodes.value);
};

const clearReminderTimers = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  reminderTimers.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  reminderTimers.clear();
};

const getReminderKey = (event: GoogleCalendarEvent): string | null => {
  if (!event.connection?.departureIso) {
    return null;
  }

  return `${event.id}:${event.connection.departureIso}`;
};

const showLeaveNotification = async (event: GoogleCalendarEvent): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  const reminderKey = getReminderKey(event);
  const connection = event.connection;
  const departureIso = connection?.departureIso;

  if (!connection || !reminderKey || !departureIso || sentReminderKeys.has(reminderKey) || Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  registration.active?.postMessage({
    type: 'SHOW_REMINDER_NOTIFICATION',
    payload: {
      title: t('views.dashboard.events.connection.notificationTitle', { event: event.summary }),
      body: t('views.dashboard.events.connection.notificationBody', {
        time: connection.departureTime,
      }),
      icon: notificationIconUrl,
      tag: reminderKey,
      url: window.location.pathname,
    },
  });

  sentReminderKeys.add(reminderKey);
};

const ensureNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  return (await Notification.requestPermission()) === 'granted';
};

const triggerDebugNotification = async (): Promise<void> => {
  debugNotificationFeedback.value = null;
  currentDebugNotificationTag.value = null;

  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    setDebugNotificationFeedback('error', t('views.dashboard.events.debug.feedback.unsupported'));
    return;
  }

  const firstEvent = events.value[0];

  if (!firstEvent) {
    setDebugNotificationFeedback('warning', t('views.dashboard.events.debug.feedback.noEvents'));
    return;
  }

  const permissionGranted = await ensureNotificationPermission();

  if (!permissionGranted) {
    setDebugNotificationFeedback('warning', t('views.dashboard.events.debug.feedback.permissionDenied'));
    return;
  }

  const reminderKey = getReminderKey(firstEvent) ?? `${firstEvent.id}:debug`;
  const notificationTag = `${reminderKey}:debug`;
  const registration = await navigator.serviceWorker.ready;
  const activeWorker = registration.active ?? navigator.serviceWorker.controller;

  if (!activeWorker) {
    setDebugNotificationFeedback('error', t('views.dashboard.events.debug.feedback.workerUnavailable'));
    return;
  }

  currentDebugNotificationTag.value = notificationTag;
  activeWorker.postMessage({
    type: 'SHOW_REMINDER_NOTIFICATION',
    payload: {
      title: t('views.dashboard.events.debug.notificationTitle', { event: firstEvent.summary }),
      body: t('views.dashboard.events.debug.notificationBody', {
        time: firstEvent.connection?.departureTime ?? firstEvent.startLabel,
      }),
      icon: notificationIconUrl,
      tag: notificationTag,
      url: window.location.pathname,
    },
  });

  setDebugNotificationFeedback('success', t('views.dashboard.events.debug.feedback.sent'));
};

const scheduleConnectionReminders = async (): Promise<void> => {
  clearReminderTimers();

  if (typeof window === 'undefined' || events.value.length === 0) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const now = Date.now();
  const leadTimeMs = getReminderLeadTimeMs();

  events.value.forEach((event) => {
    const departureIso = event.connection?.departureIso;
    const reminderKey = getReminderKey(event);

    if (!departureIso || !reminderKey) {
      return;
    }

    const departureTimeMs = new Date(departureIso).getTime();

    if (Number.isNaN(departureTimeMs)) {
      return;
    }

    const reminderAtMs = departureTimeMs - leadTimeMs;
    const delayMs = reminderAtMs - now;

    if (delayMs <= 0) {
      if (departureTimeMs > now) {
        void showLeaveNotification(event);
      }
      return;
    }

    const timerId = window.setTimeout(() => {
      void showLeaveNotification(event);
    }, delayMs);

    reminderTimers.set(reminderKey, timerId);
  });
};

const setConnectionLoading = (eventId: string, isLoading: boolean): void => {
  loadingConnectionsById.value = {
    ...loadingConnectionsById.value,
    [eventId]: isLoading,
  };
};

const isConnectionLoading = (eventId: string): boolean => Boolean(loadingConnectionsById.value[eventId]);

const startConnectionRequest = (eventId: string): number => {
  const nextToken = (connectionRequestTokens.value[eventId] ?? 0) + 1;
  connectionRequestTokens.value = {
    ...connectionRequestTokens.value,
    [eventId]: nextToken,
  };

  return nextToken;
};

const isActiveConnectionRequest = (eventId: string, token: number): boolean =>
  connectionRequestTokens.value[eventId] === token;

const updateEvent = (eventId: string, patch: Partial<GoogleCalendarEvent>): void => {
  events.value = events.value.map((event) => (
    event.id === eventId
      ? { ...event, ...patch }
      : event
  ));
};

const getStoredConnectionBufferMinutes = (eventId: string): number =>
  normalizeConnectionBufferMinutes(storedConnectionBuffers.value[eventId]);

const storeEventConnectionBufferMinutes = (eventId: string, bufferMinutes: number): void => {
  const normalized = normalizeConnectionBufferMinutes(bufferMinutes);
  const nextBuffers = { ...storedConnectionBuffers.value };

  if (normalized === DEFAULT_CONNECTION_BUFFER_MINUTES) {
    delete nextBuffers[eventId];
  } else {
    nextBuffers[eventId] = normalized;
  }

  storedConnectionBuffers.value = nextBuffers;
  storeConnectionBuffers(nextBuffers);
};

const applyStoredConnectionBuffer = (event: GoogleCalendarEvent): GoogleCalendarEvent => ({
  ...event,
  desiredConnectionBufferMinutes: getStoredConnectionBufferMinutes(event.id),
});

const updateConnectionBuffer = (eventId: string, nextMinutes: number): void => {
  const normalized = normalizeConnectionBufferMinutes(nextMinutes);
  const event = events.value.find((item) => item.id === eventId);

  if (!event || event.desiredConnectionBufferMinutes === normalized) {
    return;
  }

  storeEventConnectionBufferMinutes(eventId, normalized);
  updateEvent(eventId, {
    desiredConnectionBufferMinutes: normalized,
  });

  const nextEvent = {
    ...event,
    desiredConnectionBufferMinutes: normalized,
  };
  const cached = getCachedConnection(eventId, normalized);

  if (cached?.latest) {
    updateEvent(eventId, {
      connection: cached.latest.connection,
      connectionError: null,
      connectionFetchedAt: cached.latest.fetchedAt,
    });
    void refreshSharingSuggestions([nextEvent.id]);
    return;
  }

  void refreshConnections([eventId]);
};

const applyCachedConnection = (event: GoogleCalendarEvent): void => {
  const cached = getCachedConnection(event.id, event.desiredConnectionBufferMinutes);
  if (!cached?.latest) {
    return;
  }

  updateEvent(event.id, {
    connection: cached.latest.connection,
    connectionError: null,
    connectionFetchedAt: cached.latest.fetchedAt,
  });
};

const loadCurrentLocation = async (): Promise<ResolvedLocation | null> => {
  try {
    if (originMode.value === 'fixed') {
      trainDetection.value = null;
      const resolvedLocation = await resolveFixedLocationInput();
      currentLocation.value = resolvedLocation;
      currentLocationError.value = '';
      return resolvedLocation;
    }

    const detectedTrainLocation = await detectTrainLocation();
    trainDetection.value = detectedTrainLocation;

    if (hasResolvedLocation(detectedTrainLocation.resolvedLocation)) {
      currentLocation.value = detectedTrainLocation.resolvedLocation;
      currentLocationError.value = '';
      return detectedTrainLocation.resolvedLocation;
    }

    const resolvedLocation = await getCurrentResolvedLocation();
    currentLocation.value = resolvedLocation;
    currentLocationError.value = '';
    return resolvedLocation;
  } catch (error) {
    currentLocation.value = null;
    currentLocationError.value = error instanceof Error
      ? error.message
      : t('calendar.error.locationUnknown');
    return null;
  }
};

const updateOriginDependentData = async (): Promise<void> => {
  const origin = await loadCurrentLocation();

  if (!hasCalendarAccess.value || !origin) {
    return;
  }

  await Promise.all([
    refreshConnections(),
    refreshSharingSuggestions(),
  ]);
};

const applyFixedLocationInput = async (): Promise<void> => {
  originMode.value = 'fixed';
  fixedLocationSuggestions.value = [];
  await updateOriginDependentData();
};

const applyLocationSuggestion = async (suggestion: LocationSuggestion): Promise<void> => {
  originMode.value = 'fixed';
  fixedLocationInput.value = suggestion.address;
  currentLocation.value = {
    address: suggestion.address,
    coordinates: suggestion.coordinates,
  };
  currentLocationError.value = '';
  fixedLocationSuggestions.value = [];
  await updateOriginDependentData();
};

const applyFavoriteLocation = async (favorite: FavoriteLocation): Promise<void> => {
  originMode.value = 'fixed';
  fixedLocationInput.value = favorite.address;
  fixedLocationSuggestions.value = [];
  currentLocation.value = {
    address: favorite.address,
    coordinates: favorite.coordinates,
  };
  currentLocationError.value = '';
  await updateOriginDependentData();
};

const startFavoriteEdit = (favorite: FavoriteLocation): void => {
  originMode.value = 'fixed';
  fixedLocationInput.value = favorite.address;
  favoriteNameInput.value = favorite.name;
  editingFavoriteId.value = favorite.id;
  fixedLocationSuggestions.value = [];
};

const cancelFavoriteEdit = (): void => {
  resetFavoriteEditor();
};

const saveFavoriteLocation = async (): Promise<void> => {
  const name = favoriteNameInput.value.trim();

  if (!name) {
    currentLocationError.value = t('views.dashboard.events.currentLocation.favoriteNameMissing');
    return;
  }

  try {
    const resolved = await resolveFixedLocationInput();
    const favorite = {
      id: editingFavoriteId.value ?? createFavoriteId(),
      name,
      address: resolved.address ?? fixedLocationInput.value.trim(),
      coordinates: resolved.coordinates,
    } satisfies FavoriteLocation;

    favoriteLocations.value = editingFavoriteId.value
      ? favoriteLocations.value.map((entry) => (entry.id === editingFavoriteId.value ? favorite : entry))
      : [favorite, ...favoriteLocations.value.filter((entry) => entry.address !== favorite.address)];

    fixedLocationInput.value = favorite.address;
    currentLocation.value = resolved;
    currentLocationError.value = '';
    persistOriginPreferences();
    resetFavoriteEditor();
  } catch (error) {
    currentLocationError.value = error instanceof Error
      ? error.message
      : t('views.dashboard.events.currentLocation.applyErrorUnresolved');
  }
};

const removeFavoriteLocation = (favoriteId: string): void => {
  favoriteLocations.value = favoriteLocations.value.filter((favorite) => favorite.id !== favoriteId);

  if (editingFavoriteId.value === favoriteId) {
    resetFavoriteEditor();
  }

  persistOriginPreferences();
};

const refreshSharingSuggestions = async (eventIds?: string[]): Promise<void> => {
  const targetIds = eventIds ?? events.value.map((event) => event.id);
  if (targetIds.length === 0) {
    return;
  }

  await Promise.all(targetIds.map(async (eventId) => {
    const event = events.value.find((item) => item.id === eventId);

    if (!event) {
      return;
    }

    const { suggestion, error } = await findSharingSuggestion(
      currentLocation.value?.coordinates,
      event.locationCoordinates,
      sharingPreferences.value,
    );

    updateEvent(event.id, {
      sharingSuggestion: suggestion ?? (error ? event.sharingSuggestion : null),
      sharingError: error,
    });
  }));
};

const refreshConnections = async (eventIds?: string[]): Promise<void> => {
  if (!hasCalendarAccess.value || !currentLocation.value) {
    return;
  }

  const targetIds = eventIds ?? events.value.map((event) => event.id);
  if (targetIds.length === 0) {
    return;
  }

  const sequence = loadSequence;

  await Promise.all(targetIds.map(async (eventId) => {
    const event = events.value.find((item) => item.id === eventId);

    if (!event || sequence !== loadSequence) {
      return;
    }

    setConnectionLoading(event.id, true);
    const requestToken = startConnectionRequest(event.id);

    try {
      const { connection, connectionError } = await fetchEventConnection(currentLocation.value, event, getConnectionRequestOptions());

      if (sequence !== loadSequence || !isActiveConnectionRequest(event.id, requestToken)) {
        return;
      }

      const fetchedAt = new Date().toISOString();
      updateEvent(event.id, {
        connection,
        connectionError,
        connectionFetchedAt: connection ? fetchedAt : event.connectionFetchedAt,
      });

      if (connection) {
        storeConnection(event.id, event.desiredConnectionBufferMinutes, connection, fetchedAt);
      }
    } finally {
      if (isActiveConnectionRequest(event.id, requestToken)) {
        setConnectionLoading(event.id, false);
      }
    }
  }));

  await refreshSharingSuggestions(targetIds);
  lastConnectionRefreshAt.value = new Date().toISOString();
  updateApiMetrics();
};

const loadConnections = async (
  nextEvents: GoogleCalendarEvent[],
  origin: ResolvedLocation | null,
  sequence: number,
): Promise<void> => {
  await Promise.all(nextEvents.map(async (event) => {
    if (sequence !== loadSequence) {
      return;
    }

    applyCachedConnection(event);
    setConnectionLoading(event.id, true);
    const requestToken = startConnectionRequest(event.id);
    const { connection, connectionError } = await fetchEventConnection(origin, event, getConnectionRequestOptions());

    if (sequence !== loadSequence || !isActiveConnectionRequest(event.id, requestToken)) {
      return;
    }

    const fetchedAt = new Date().toISOString();
    updateEvent(event.id, {
      connection,
      connectionError,
      connectionFetchedAt: connection ? fetchedAt : event.connectionFetchedAt,
    });

    if (connection) {
      storeConnection(event.id, event.desiredConnectionBufferMinutes, connection, fetchedAt);
    }

    setConnectionLoading(event.id, false);
    updateApiMetrics();
  }));
};

const loadSharingSuggestions = async (
  nextEvents: GoogleCalendarEvent[],
  origin: ResolvedLocation | null,
  sequence: number,
): Promise<void> => {
  await Promise.all(nextEvents.map(async (event) => {
    if (sequence !== loadSequence) {
      return;
    }

    const { suggestion, error } = await findSharingSuggestion(
      origin?.coordinates,
      event.locationCoordinates,
      sharingPreferences.value,
    );

    if (sequence !== loadSequence) {
      return;
    }

    updateEvent(event.id, {
      sharingSuggestion: suggestion ?? (error ? event.sharingSuggestion : null),
      sharingError: error,
    });
  }));
};

const resetDashboardState = (): void => {
  clearReminderTimers();
  events.value = [];
  eventsError.value = '';
  currentLocation.value = null;
  currentLocationError.value = '';
  loadingConnectionsById.value = {};
  connectionRequestTokens.value = {};
  lastConnectionRefreshAt.value = null;
};

const loadEvents = async (): Promise<void> => {
  if (!hasCalendarAccess.value) {
    resetDashboardState();
    return;
  }

  const sequence = ++loadSequence;
  isLoadingEvents.value = true;
  eventsError.value = '';
  loadingConnectionsById.value = {};

  try {
    const eventsPromise = calendarSourceStore.mode === 'ical' && calendarSourceStore.isIcalConfigured
      ? fetchUpcomingIcalEvents(calendarSourceStore.normalizedIcalUrl)
      : fetchUpcomingCalendarEvents(googleAuthStore.accessToken);
    const currentLocationPromise = loadCurrentLocation();
    const nextEvents = (await eventsPromise).map(applyStoredConnectionBuffer);

    if (sequence !== loadSequence) {
      return;
    }

    events.value = nextEvents;
    storeCachedCalendarEvents(nextEvents);
    isLoadingEvents.value = false;
    updateApiMetrics();

    const origin = await currentLocationPromise;

    if (sequence !== loadSequence) {
      return;
    }

    await Promise.all([
      loadConnections(nextEvents, origin, sequence),
      loadSharingSuggestions(nextEvents, origin, sequence),
    ]);
    storeCachedCalendarEvents(events.value);
  } catch (error) {
    if (sequence !== loadSequence) {
      return;
    }

    events.value = [];
    eventsError.value = error instanceof Error ? error.message : t('views.dashboard.events.errorFallback');
    isLoadingEvents.value = false;
  }
};

const loadCachedEvents = (): void => {
  const cachedEvents = getCachedCalendarEvents().map(applyStoredConnectionBuffer);

  loadSequence += 1;
  isLoadingEvents.value = false;
  eventsError.value = '';
  loadingConnectionsById.value = {};
  connectionRequestTokens.value = {};
  currentLocation.value = null;
  currentLocationError.value = '';
  events.value = cachedEvents;
};

onMounted(() => {
  syncStandaloneState();
  syncNotificationState();

  if (typeof window !== 'undefined') {
    refreshTimer = window.setInterval(() => {
      void refreshConnections();
    }, refreshIntervalMs);
    window.addEventListener('focus', syncNotificationState);
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
});

onBeforeUnmount(() => {
  if (refreshTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  clearFixedLocationAutocomplete();

  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', syncNotificationState);
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }

  clearReminderTimers();
});

watch(
  calendarAccessKey,
  () => {
    if (!hasCalendarAccess.value) {
      if (shouldUseCachedEvents.value) {
        loadCachedEvents();
        return;
      }

      loadSequence += 1;
      router.replace({ name: 'home' });
      resetDashboardState();
      return;
    }

    void loadEvents();
  },
  { immediate: true },
);

watch(originMode, (nextMode) => {
  persistOriginPreferences();
  fixedLocationSuggestions.value = [];

  if (nextMode === 'current') {
    resetFavoriteEditor();
    void updateOriginDependentData();
    return;
  }

  trainDetection.value = null;

  if (!fixedLocationInput.value.trim()) {
    currentLocation.value = null;
    currentLocationError.value = '';
    return;
  }

  void updateOriginDependentData();
});

watch(fixedLocationInput, (value) => {
  persistOriginPreferences();
  fixedLocationSuggestions.value = [];
  clearFixedLocationAutocomplete();

  if (originMode.value !== 'fixed') {
    isLoadingFixedLocationSuggestions.value = false;
    return;
  }

  const query = value.trim();

  if (query.length < 3 || typeof window === 'undefined') {
    isLoadingFixedLocationSuggestions.value = false;
    return;
  }

  isLoadingFixedLocationSuggestions.value = true;
  fixedLocationAutocompleteTimer = window.setTimeout(async () => {
    try {
      fixedLocationSuggestions.value = await searchLocationSuggestions(query);
    } catch {
      fixedLocationSuggestions.value = [];
    } finally {
      isLoadingFixedLocationSuggestions.value = false;
      fixedLocationAutocompleteTimer = null;
    }
  }, AUTOCOMPLETE_DELAY_MS);
});

watch(
  favoriteLocations,
  () => {
    persistOriginPreferences();
  },
  { deep: true },
);

watch(
  events,
  () => {
    void scheduleConnectionReminders();
  },
  { deep: true },
);

watch(
  sharingPreferences,
  () => {
    persistSharingPreferences();
    void refreshSharingSuggestions();
  },
  { deep: true },
);

watch(deutschlandticketEnabled, () => {
  persistDeutschlandticketPreference();
});

watch(bahnBookingClass, () => {
  persistBahnBookingClass();
});

watch(bahnTravelerProfileParam, () => {
  persistBahnTravelerProfile();
});

watch(showTransferWalkNodes, () => {
  persistTransferWalkNodes();
});
</script>

<template>
  <section class="dashboard-view">
    <Widget>
      <template #sub-title>{{ t('views.dashboard.hero.subTitle') }}</template>
      <template #icon>{{ t('app.logo') }}</template>
      <template #title>{{ t('views.dashboard.hero.title') }}</template>
      <template #description>{{ t('views.dashboard.hero.description') }}</template>
    </Widget>

    <GoogleAuthCard mode="status" />

    <Widget class="calendar-events-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>{{ t('views.dashboard.events.subTitle') }}</template>
      <template #title>
        <svg-icon icon="material/event" class="calendar-title-icon" :dimension="20" />
        <span class="calendar-title">
          {{ t('views.dashboard.events.title') }}
        </span>
      </template>
      <template #description>{{ t('views.dashboard.events.description') }}</template>

      <Message class="notification-status" variant="success">
        <strong>{{ t('views.dashboard.events.sourceLabel') }}</strong>
        {{ activeCalendarSourceLabel }}
      </Message>

      <Message v-if="notificationState !== 'unsupported'" class="notification-status"
        :variant="notificationStatusVariant">
        <strong>{{ t('views.dashboard.events.notification.title') }}</strong>
        {{ notificationStatusMessage }}
      </Message>

      <Message v-if="notificationState === 'granted'" class="notification-system-hint" variant="warning">
        {{ t('views.dashboard.events.notification.systemHint') }}
      </Message>

      <div class="current-location">
        <strong>{{ t('views.dashboard.events.currentLocation.title') }}</strong>

        <div class="origin-mode-switch">
          <label class="origin-mode-option">
            <input v-model="originMode" type="radio" value="current">
            <span>{{ t('views.dashboard.events.currentLocation.currentOption') }}</span>
          </label>
          <label class="origin-mode-option">
            <input v-model="originMode" type="radio" value="fixed">
            <span>{{ t('views.dashboard.events.currentLocation.fixedOption') }}</span>
          </label>
        </div>

        <div v-if="originMode === 'fixed'" class="origin-fixed-panel">
          <label class="sharing-field sharing-field--wide">
            <span>{{ t('views.dashboard.events.currentLocation.fixedInputLabel') }}</span>
            <input v-model.trim="fixedLocationInput" class="sharing-input" type="search"
              :placeholder="t('views.dashboard.events.currentLocation.fixedInputPlaceholder')"
              @keydown.enter.prevent="applyFixedLocationInput">
          </label>

          <div class="origin-fixed-actions">
            <button class="origin-action" type="button" @click="applyFixedLocationInput">
              {{ t('views.dashboard.events.currentLocation.applyFixed') }}
            </button>
          </div>

          <p v-if="isLoadingFixedLocationSuggestions" class="origin-helper-copy">
            {{ t('views.dashboard.events.currentLocation.autocompleteLoading') }}
          </p>

          <ul v-else-if="fixedLocationSuggestions.length > 0" class="origin-suggestion-list">
            <li v-for="suggestion in fixedLocationSuggestions" :key="suggestion.address">
              <button class="origin-suggestion" type="button" @click="applyLocationSuggestion(suggestion)">
                {{ suggestion.address }}
              </button>
            </li>
          </ul>

          <label class="sharing-field sharing-field--wide">
            <span>{{ t('views.dashboard.events.currentLocation.favoriteNameLabel') }}</span>
            <input v-model.trim="favoriteNameInput" class="sharing-input" type="text"
              :placeholder="t('views.dashboard.events.currentLocation.favoriteNamePlaceholder')">
          </label>

          <div class="origin-fixed-actions">
            <button class="origin-action" type="button" @click="saveFavoriteLocation">
              {{ favoriteSaveLabel }}
            </button>
            <button v-if="editingFavoriteId" class="origin-action origin-action--secondary" type="button"
              @click="cancelFavoriteEdit">
              {{ t('views.dashboard.events.currentLocation.cancelFavorite') }}
            </button>
          </div>

          <div class="favorite-list-block">
            <strong>{{ t('views.dashboard.events.currentLocation.favoritesTitle') }}</strong>
            <p v-if="favoriteLocations.length === 0" class="origin-helper-copy">
              {{ t('views.dashboard.events.currentLocation.noFavorites') }}
            </p>
            <ul v-else class="favorite-list">
              <li v-for="favorite in favoriteLocations" :key="favorite.id" class="favorite-item">
                <div class="favorite-copy">
                  <strong>{{ favorite.name }}</strong>
                  <span>{{ favorite.address }}</span>
                </div>
                <div class="favorite-actions">
                  <button class="origin-chip-action" type="button" @click="applyFavoriteLocation(favorite)">
                    {{ t('views.dashboard.events.currentLocation.useFavorite') }}
                  </button>
                  <button class="origin-chip-action" type="button" @click="startFavoriteEdit(favorite)">
                    {{ t('views.dashboard.events.currentLocation.editFavorite') }}
                  </button>
                  <button class="origin-chip-action origin-chip-action--danger" type="button"
                    @click="removeFavoriteLocation(favorite.id)">
                    {{ t('views.dashboard.events.currentLocation.deleteFavorite') }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="origin-layout">
          <section class="origin-map-card">
            <div class="origin-card-head">
              <strong>{{ t('views.dashboard.events.currentLocation.mapTitle') }}</strong>
              <a v-if="currentLocationMapLink" class="origin-map-link" :href="currentLocationMapLink" target="_blank" rel="noreferrer">
                {{ t('views.dashboard.events.currentLocation.mapOpen') }}
              </a>
            </div>

            <div class="origin-map-canvas" :class="{ 'origin-map-canvas--empty': !currentLocationMapEmbedUrl }">
              <iframe
                v-if="currentLocationMapEmbedUrl"
                class="origin-map-frame"
                :src="currentLocationMapEmbedUrl"
                :title="t('views.dashboard.events.currentLocation.mapTitle')"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              />
            </div>

            <div class="origin-map-meta">
              <span class="origin-source">{{ t('views.dashboard.events.currentLocation.locationSource', { value: currentLocationSourceLabel }) }}</span>
              <strong v-if="currentLocation?.address">{{ currentLocation.address }}</strong>
              <span v-if="currentLocationCoordinateLabel">{{ currentLocationCoordinateLabel }}</span>
              <span v-else>{{ t('views.dashboard.events.currentLocation.mapUnavailable') }}</span>
            </div>
          </section>

          <section class="origin-route-card">
            <div class="origin-card-head">
              <div>
                <strong>{{ t('views.dashboard.events.currentLocation.routeTitle') }}</strong>
                <p v-if="hasCdTrainRoute" class="origin-route-subtitle">{{ t('views.dashboard.events.currentLocation.routeSubtitle') }}</p>
              </div>
              <span v-if="hasCdTrainRoute" class="origin-live-badge">{{ t('views.dashboard.events.currentLocation.routeLiveBadge') }}</span>
            </div>

            <div v-if="hasCdTrainRoute" class="origin-route-body">
              <div v-if="trainCarrierLabel" class="origin-train-brand origin-train-brand--hero">
                <span class="origin-train-logo-shell">
                  <SvgIcon v-if="trainCarrierIcon" class="origin-train-logo" :icon="trainCarrierIcon" dimension="28"
                    fallback-text="CD" />
                </span>
                <div>
                  <strong>{{ trainCarrierLabel }}</strong>
                  <span v-if="trainNameLabel">{{ trainNameLabel }}</span>
                </div>
              </div>

              <div class="origin-route-line">
                <div class="origin-route-stop origin-route-stop--start">
                  <span class="origin-route-dot"></span>
                  <div class="origin-route-stop-shell origin-route-stop-shell--muted">
                    <div class="origin-route-stop-copy">
                      <span class="origin-route-stop-label">{{ t('views.dashboard.events.connection.startLabel') }}</span>
                      <strong>{{ trainDetection?.originStationName || t('views.dashboard.events.currentLocation.routeCurrentStop') }}</strong>
                    </div>
                  </div>
                </div>
                <div class="origin-route-progress">
                  <span class="origin-route-progress-line"></span>
                  <span class="origin-route-progress-train">🚆</span>
                </div>
                <div class="origin-route-stop origin-route-stop--current">
                  <span class="origin-route-dot origin-route-dot--pulse"></span>
                  <div class="origin-route-stop-shell origin-route-stop-shell--current">
                    <div class="origin-route-stop-copy">
                      <span class="origin-route-stop-label">{{ t('views.dashboard.events.currentLocation.routeCurrentStop') }}</span>
                      <strong>{{ currentLocation?.address || t('views.dashboard.events.currentLocation.routeCurrentStop') }}</strong>
                      <span v-if="routeEtaLabel">{{ routeEtaLabel }}</span>
                    </div>
                    <div v-if="routeEtaValueLabel || trainSpeedLabel" class="origin-route-stop-meta">
                      <span v-if="routeEtaValueLabel" class="origin-route-eta">{{ routeEtaValueLabel }}</span>
                      <span v-if="trainSpeedLabel" class="origin-route-chip origin-route-chip--accent">{{ trainSpeedLabel }}</span>
                    </div>
                  </div>
                </div>
                <div class="origin-route-progress">
                  <span class="origin-route-progress-line"></span>
                </div>
                <div class="origin-route-stop origin-route-stop--end">
                  <span class="origin-route-dot origin-route-dot--outline"></span>
                  <div class="origin-route-stop-shell origin-route-stop-shell--muted">
                    <div class="origin-route-stop-copy">
                      <span class="origin-route-stop-label">{{ t('views.dashboard.events.connection.endLabel') }}</span>
                      <strong>{{ trainDetection?.nextStationName || trainDetection?.finalStationName || t('views.dashboard.events.currentLocation.routeCurrentStop') }}</strong>
                      <span v-if="trainDetection?.finalStationName">{{ t('views.dashboard.events.currentLocation.finalStationLabel', { value: trainDetection.finalStationName }) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="origin-route-facts">
                <span v-if="trainConnectionLabel">{{ trainConnectionLabel }}</span>
                <span v-if="browserTrainIspLabel">{{ browserTrainIspLabel }}</span>
                <span v-if="browserTrainStatusLabel">{{ browserTrainStatusLabel }}</span>
                <span v-if="trainPortalLabel">{{ trainPortalLabel }}</span>
              </div>
            </div>

            <div v-else class="origin-route-fallback">
              <span v-if="browserTrainStatusLabel">{{ browserTrainStatusLabel }}</span>
              <span v-if="browserTrainIspLabel">{{ browserTrainIspLabel }}</span>
              <span>{{ t('views.dashboard.events.currentLocation.routeFallback') }}</span>
            </div>
          </section>
        </div>
      </div>

      <details class="sharing-settings">
        <summary class="sharing-settings-summary">
          <div class="sharing-settings-header">
            <strong>{{ t('views.dashboard.events.settings.title') }}</strong>
            <span>{{ settingsSummaryLabel }}</span>
          </div>
          <span class="sharing-settings-hint">{{ t('views.dashboard.events.settings.description') }}</span>
        </summary>
        <div class="sharing-settings-body">
          <label class="sharing-field sharing-field--wide sharing-field--toggle">
            <span>{{ t('views.dashboard.events.settings.deutschlandticketLabel') }}</span>
            <span class="sharing-settings-hint">{{ t('views.dashboard.events.settings.deutschlandticketHint') }}</span>
            <input v-model="deutschlandticketEnabled" class="sharing-checkbox" type="checkbox">
          </label>
          <label class="sharing-field">
            <span>{{ t('views.dashboard.events.settings.bookingClassLabel') }}</span>
            <select v-model="bahnBookingClass" class="sharing-input">
              <option v-for="option in bahnBookingClassOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="sharing-field sharing-field--wide">
            <span>{{ t('views.dashboard.events.settings.travelerProfileLabel') }}</span>
            <span class="sharing-settings-hint">{{ t('views.dashboard.events.settings.travelerProfileHint') }}</span>
            <input v-model.trim="bahnTravelerProfileParam" class="sharing-input" type="text"
              :placeholder="t('views.dashboard.events.settings.travelerProfilePlaceholder')">
          </label>
          <label class="sharing-field sharing-field--wide sharing-field--toggle">
            <span>{{ t('views.dashboard.events.settings.transferWalkLabel') }}</span>
            <span class="sharing-settings-hint">{{ t('views.dashboard.events.settings.transferWalkHint') }}</span>
            <input v-model="showTransferWalkNodes" class="sharing-checkbox" type="checkbox">
          </label>
          <label class="sharing-field">
            <span>{{ t('views.dashboard.events.sharing.providerLabel') }}</span>
            <select v-model="sharingProviderId" class="sharing-input">
              <option v-for="provider in sharingProviderOptions" :key="provider.value" :value="provider.value">
                {{ provider.label }}
              </option>
            </select>
          </label>
          <label class="sharing-field">
            <span>{{ t('views.dashboard.events.sharing.distanceLabel') }}</span>
            <input v-model.number="sharingShortTripDistanceKm" class="sharing-input" type="number" min="0.5" max="25"
              step="0.5">
          </label>
          <label class="sharing-field">
            <span>{{ t('views.dashboard.events.sharing.radiusLabel') }}</span>
            <input v-model.number="sharingStationSearchRadiusMeters" class="sharing-input" type="number" min="200"
              max="5000" step="100">
          </label>
          <label v-if="isCustomSharingProvider" class="sharing-field">
            <span>{{ t('views.dashboard.events.sharing.customProviderLabel') }}</span>
            <input v-model.trim="sharingCustomProviderLabel" class="sharing-input" type="text">
          </label>
          <label v-if="isCustomSharingProvider" class="sharing-field sharing-field--wide">
            <span>{{ t('views.dashboard.events.sharing.customFeedLabel') }}</span>
            <input v-model.trim="sharingCustomGbfsUrl" class="sharing-input" type="url"
              :placeholder="t('views.dashboard.events.sharing.customFeedPlaceholder')">
          </label>
        </div>
      </details>

      <p v-if="currentLocationError && !isLoadingEvents" class="state-copy">
        {{ currentLocationError }}
      </p>

      <p v-if="isLoadingEvents && events.length === 0" class="state-copy">
        {{ t('views.dashboard.events.loading') }}
      </p>

      <p v-else-if="eventsError" class="state-copy state-copy--error">
        {{ eventsError }}
      </p>

      <p v-else-if="events.length === 0" class="state-copy">
        {{ t('views.dashboard.events.empty') }}
      </p>

      <ul v-else class="event-list">
        <li v-for="event in events" :key="event.id" class="event-item">
          <div class="event-header">
            <div class="event-title-row">
              <svg-icon icon="material/event" class="event-item-icon" :dimension="18" />
              <strong class="event-title">{{ event.summary }}</strong>
            </div>
            <span class="event-start">🕒 {{ event.startLabel }}</span>
          </div>

          <div v-if="compactLocationLabel(event.locationAddress)" class="event-meta-row">
            <span class="event-meta-chip event-meta-chip--location">
              <SvgIcon icon="material/place" class="event-meta-icon" :dimension="16" />
              <span class="event-meta-text">{{ compactLocationLabel(event.locationAddress) }}</span>
            </span>
          </div>

          <p v-if="isConnectionLoading(event.id) && !event.connection" class="event-meta event-meta--muted">
            🚆 {{ t('views.dashboard.events.connection.loading') }}
          </p>
          <ConnectionCard v-else-if="event.connection" :connection="event.connection" :event-id="event.id"
            :event-start-iso="event.startIso" :last-updated-iso="event.connectionFetchedAt"
            :sharing-suggestion="event.sharingSuggestion"
            :deutschlandticket-enabled="deutschlandticketEnabled" :origin-address="currentLocation?.address ?? null"
            :destination-address="event.locationAddress"
            @toggle="$event ? refreshConnections([event.id]) : undefined" @update-buffer="updateConnectionBuffer(event.id, $event)" />

          <p v-else-if="event.connectionError" class="event-meta event-meta--muted">
            🚫 {{ event.connectionError }}
          </p>

          <SharingOptionCard v-if="event.sharingSuggestion && !event.connection" :suggestion="event.sharingSuggestion"
            :compact="true" />

          <p v-if="event.sharingError" class="event-meta event-meta--muted">
            🚲 {{ event.sharingError }}
          </p>
        </li>
      </ul>

      <div class="calendar-debug calendar-debug--expanded">
        <details class="debug-details">
          <summary class="debug-summary">
            <span class="debug-label">{{ t('views.dashboard.events.debug.summary') }}</span>
            <span class="debug-bubble">{{ apiTotal }}</span>
          </summary>
          <div class="debug-body">
            <Message v-if="debugNotificationFeedback" class="debug-feedback"
              :variant="debugNotificationFeedback.variant">
              {{ debugNotificationFeedback.message }}
            </Message>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.googleCalendar') }}: {{ apiMetrics.googleCalendar }}
            </div>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.motis') }}: {{ apiMetrics.motis }}
            </div>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.sharing') }}: {{ apiMetrics.sharing }}
            </div>
            <div v-if="lastConnectionRefreshAt" class="debug-row">
              {{ t('views.dashboard.events.debug.lastRefresh') }}: {{ formatTimestamp(lastConnectionRefreshAt) }}
            </div>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.openConnections', { count: expandedConnectionCount }) }}
            </div>

            <div class="debug-actions">
              <button class="debug-action" :disabled="events.length === 0" @click="triggerDebugNotification">
                {{ t('views.dashboard.events.debug.triggerFirstEventNotification') }}
              </button>
              <button class="debug-action debug-action--secondary" :disabled="apiMetrics.history.length === 0"
                @click="clearDebugHistory">
                {{ t('views.dashboard.events.debug.clearHistory') }}
              </button>
            </div>

            <div class="debug-filter-grid">
              <label class="debug-filter-field">
                <span>{{ t('views.dashboard.events.debug.filters.type') }}</span>
                <select v-model="debugHistoryTypeFilter" class="debug-filter-input">
                  <option value="all">{{ getDebugTypeLabel('all') }}</option>
                  <option value="googleCalendar">{{ getDebugTypeLabel('googleCalendar') }}</option>
                  <option value="motis">{{ getDebugTypeLabel('motis') }}</option>
                  <option value="sharing">{{ getDebugTypeLabel('sharing') }}</option>
                </select>
              </label>
              <label class="debug-filter-field">
                <span>{{ t('views.dashboard.events.debug.filters.status') }}</span>
                <select v-model="debugHistoryStatusFilter" class="debug-filter-input">
                  <option value="all">{{ getDebugStatusLabel('all') }}</option>
                  <option value="pending">{{ getDebugStatusLabel('pending') }}</option>
                  <option value="success">{{ getDebugStatusLabel('success') }}</option>
                  <option value="error">{{ getDebugStatusLabel('error') }}</option>
                </select>
              </label>
              <label class="debug-filter-field debug-filter-field--wide">
                <span>{{ t('views.dashboard.events.debug.filters.search') }}</span>
                <input v-model.trim="debugHistoryQuery" class="debug-filter-input" type="search"
                  :placeholder="t('views.dashboard.events.debug.filters.searchPlaceholder')">
              </label>
            </div>

            <div class="debug-history">
              <div class="debug-history-header">
                <strong>{{ t('views.dashboard.events.debug.history.title') }}</strong>
                <span>{{ filteredApiHistory.length }}</span>
              </div>
              <p v-if="filteredApiHistory.length === 0" class="debug-history-empty">
                {{ t('views.dashboard.events.debug.history.empty') }}
              </p>
              <ul v-else class="debug-history-list">
                <li v-for="entry in filteredApiHistory" :key="entry.id" class="debug-history-item">
                  <div class="debug-history-item-top">
                    <strong>{{ getDebugRequestLabel(entry) }}</strong>
                    <span class="debug-history-status" :class="'debug-history-status--' + entry.status">
                      {{ getDebugStatusLabel(entry.status) }}
                    </span>
                  </div>
                  <div class="debug-history-item-meta">
                    <span>{{ formatTimestamp(entry.startedAtIso) }}</span>
                    <span>{{ formatDurationMs(entry.durationMs) }}</span>
                    <span v-if="entry.statusCode !== null">{{ t('views.dashboard.events.debug.history.httpStatus', {
                      status:
                      entry.statusCode }) }}</span>
                    <span v-if="entry.payload?.cacheHit" class="debug-history-chip debug-history-chip--cache">
                      {{ t('views.dashboard.events.debug.history.cacheHit') }}
                    </span>
                    <span v-if="entry.payload?.errorKind" class="debug-history-chip">{{ entry.payload.errorKind
                      }}</span>
                  </div>
                  <p v-if="entry.payload?.note" class="debug-history-note">{{ entry.payload.note }}</p>
                  <details v-if="entry.payload" class="debug-history-json">
                    <summary class="debug-history-json-summary">{{
                      t('views.dashboard.events.debug.history.showRequestJson')
                      }}</summary>
                    <pre class="debug-json-pre debug-json-pre--entry">{{ getDebugEntryJson(entry) }}</pre>
                  </details>
                </li>
              </ul>
            </div>

            <details class="debug-json-details">
              <summary class="debug-json-summary">{{ t('views.dashboard.events.debug.history.showJson') }}</summary>
              <pre class="debug-json-pre">{{ debugHistoryJson }}</pre>
            </details>
          </div>
        </details>
      </div>
    </Widget>
  </section>
</template>

<style scoped>
.dashboard-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.calendar-events-card {
  margin-top: 20px;
}

.notification-status,
.notification-system-hint {
  margin-bottom: 16px;
}

.debug-feedback {
  margin-bottom: 12px;
}

.debug-action {
  margin-top: 12px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 700;
  color: #172033;
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
}

.debug-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.debug-action--secondary {
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.16);
}

.debug-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.debug-filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.debug-filter-field {
  display: grid;
  gap: 6px;
}

.debug-filter-field--wide {
  grid-column: 1 / -1;
}

.debug-filter-field span,
.debug-history-item-meta,
.debug-history-empty {
  color: rgba(226, 232, 240, 0.74);
}

.debug-filter-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.3);
}

.debug-history {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}

.debug-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #f8fafc;
}

.debug-history-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.debug-history-item {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.24);
}

.debug-history-item-top,
.debug-history-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
}

.debug-history-item-top strong {
  color: #f8fafc;
}

.debug-history-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.debug-history-status--pending {
  background: rgba(191, 219, 254, 0.18);
  color: #dbeafe;
}

.debug-history-status--success {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.debug-history-status--error {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.debug-json-details {
  margin-top: 4px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.2);
}

.debug-json-summary {
  cursor: pointer;
  padding: 10px 12px;
  color: #f8fafc;
  font-weight: 700;
}

.debug-json-pre {
  margin: 0;
  overflow: auto;
  padding: 0 12px 12px;
  color: #dbeafe;
  font-size: 0.76rem;
  line-height: 1.45;
}

.calendar-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.calendar-title-icon {
  color: #e11d48;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 6px;
}

.current-location {
  display: grid;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(143, 188, 187, 0.16), rgba(37, 99, 235, 0.08));
  border: 1px solid rgba(143, 188, 187, 0.28);
}

.current-location span {
  color: var(--calendar-state-empty);
}

.origin-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.1fr);
  gap: 16px;
}

.origin-map-card,
.origin-route-card {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.origin-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.origin-card-head strong {
  color: #f8fafc;
}

.origin-map-link {
  color: #93c5fd;
  font-size: 0.85rem;
  text-decoration: none;
}

.origin-map-canvas {
  min-height: 220px;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.16);
}

.origin-map-canvas--empty {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.28), rgba(100, 116, 139, 0.18));
}

.origin-map-frame {
  display: block;
  width: 100%;
  min-height: 220px;
  border: 0;
}

.origin-map-meta {
  display: grid;
  gap: 6px;
}

.origin-source {
  color: #93c5fd;
  font-size: 0.82rem;
}

.origin-route-subtitle {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

.origin-live-badge {
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(220, 38, 38, 0.18);
  color: #fecaca;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.origin-route-body,
.origin-route-fallback {
  display: grid;
  gap: 14px;
}

.origin-train-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--calendar-state-empty);
  font-weight: 700;
}

.origin-train-brand--hero {
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(11, 86, 163, 0.16);
}

.origin-train-logo-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08), 0 10px 24px rgba(15, 23, 42, 0.12);
}

.origin-train-logo {
  color: #173a79;
}

.origin-train-brand--hero div {
  display: grid;
  gap: 2px;
}

.origin-train-brand span {
  color: inherit;
}

.origin-route-line {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.origin-route-stop {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
}

.origin-route-stop--current {
  align-items: stretch;
}

.origin-route-stop-shell {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.origin-route-stop-shell--muted {
  background: rgba(148, 163, 184, 0.08);
}

.origin-route-stop-shell--current {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(244, 63, 94, 0.12));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.origin-route-stop-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.origin-route-stop-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.origin-route-stop-label {
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.origin-route-stop strong {
  color: #f8fafc;
  overflow-wrap: anywhere;
}

.origin-route-stop--start strong,
.origin-route-stop--end strong,
.origin-route-stop--start span:last-child,
.origin-route-stop--end span:last-child {
  color: rgba(226, 232, 240, 0.74);
}

.origin-route-dot {
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border-radius: 999px;
  background: #93c5fd;
  box-shadow: 0 0 0 4px rgba(147, 197, 253, 0.16);
}

.origin-route-dot--pulse {
  background: #f43f5e;
  box-shadow: 0 0 0 6px rgba(244, 63, 94, 0.18);
}

.origin-route-dot--outline {
  background: transparent;
  border: 2px solid rgba(148, 163, 184, 0.8);
  box-shadow: none;
}

.origin-route-progress {
  position: relative;
  height: 18px;
  margin-left: 5px;
}

.origin-route-progress-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.8), rgba(148, 163, 184, 0.35));
}

.origin-route-progress-train {
  position: absolute;
  left: -8px;
  top: -4px;
  font-size: 1rem;
}

.origin-route-eta {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.32);
  color: #f8fafc;
  font-weight: 700;
  white-space: nowrap;
}

.origin-route-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.38);
  color: #dbeafe;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.origin-route-chip--accent {
  background: rgba(219, 39, 119, 0.2);
  color: #ffe4e6;
}

.origin-route-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.origin-route-facts span,
.origin-route-fallback span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.38);
  color: #dbeafe;
  font-size: 0.84rem;
}

.origin-mode-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.origin-mode-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.origin-fixed-panel {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}

.origin-fixed-actions,
.favorite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.origin-action,
.origin-chip-action,
.origin-suggestion {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  color: #172033;
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
}

.origin-action--secondary {
  background: rgba(15, 23, 42, 0.08);
}

.origin-chip-action--danger {
  color: #9f1239;
}

.origin-helper-copy {
  margin: 0;
  color: var(--calendar-state-empty);
  font-size: 0.82rem;
}

.origin-suggestion-list,
.favorite-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.origin-suggestion {
  width: 100%;
  text-align: left;
}

.favorite-list-block {
  display: grid;
  gap: 8px;
}

.favorite-item {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.favorite-copy {
  display: grid;
  gap: 4px;
}

.favorite-copy span,
.origin-source {
  font-size: 0.82rem;
}

.sharing-settings {
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.54);
}

.sharing-settings-summary {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
}

.sharing-settings-summary::-webkit-details-marker {
  display: none;
}

.sharing-settings-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  color: #172033;
}

.sharing-settings-header strong {
  font-size: 0.88rem;
  font-weight: 700;
}

.sharing-settings-header span,
.sharing-settings-hint {
  font-size: 0.8rem;
  color: rgba(23, 32, 51, 0.66);
}

.sharing-settings-body {
  display: grid;
  gap: 12px;
  padding: 0 12px 12px;
}

.sharing-field {
  display: grid;
  gap: 6px;
  color: #172033;
  font-size: 0.82rem;
  font-weight: 600;
}

.sharing-field--wide {
  grid-column: 1 / -1;
}

.sharing-field--toggle {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
}

.sharing-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #166534;
}

.sharing-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  color: #172033;
  background: rgba(255, 255, 255, 0.82);
}

.event-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.event-item {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--calendar-event-bg);
  border: 1px solid var(--calendar-event-border);
  min-width: 0;
}

.event-header {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.event-title-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.event-title {
  font-size: 1.06rem;
  line-height: 1.25;
}

.event-item-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #e11d48;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 5px;
}

.event-start,
.event-meta,
.state-copy {
  color: var(--calendar-state-empty);
}

.event-meta,
.state-copy {
  margin: 0;
}

.event-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: var(--calendar-state-empty);
  font-size: 0.82rem;
}

.event-meta-chip--location {
  max-width: min(100%, 30rem);
}

.event-meta-icon {
  opacity: 0.7;
}

.event-meta-text {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.event-meta--muted {
  opacity: 0.9;
}

.state-copy--error {
  color: var(--calendar-state-error);
}

.calendar-debug {
  margin-top: 16px;
  display: block;
  width: 100%;
}

.debug-details {
  width: 100%;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 8px 12px;
  color: var(--calendar-state-empty);
}

.debug-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  font-size: 0.82rem;
  font-weight: 600;
}

.debug-summary::-webkit-details-marker {
  display: none;
}

.debug-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.18);
  color: #f8fafc;
  font-size: 0.75rem;
}

.debug-body {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.8rem;
}

.debug-row {
  color: rgba(226, 232, 240, 0.88);
}

@media (max-width: 900px) {
  .origin-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-view {
    padding: 18px 14px 40px;
  }

  .calendar-debug {
    justify-content: flex-start;
  }

  .debug-filter-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sharing-settings-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .sharing-settings-body {
    padding: 0 10px 10px;
  }

  .event-meta-text {
    white-space: normal;
  }

  .origin-card-head {
    flex-direction: column;
  }

  .origin-map-card,
  .origin-route-card {
    padding: 14px;
  }

  .origin-map-canvas {
    min-height: 180px;
  }

  .origin-route-stop--current {
    grid-template-columns: 18px minmax(0, 1fr);
  }
}
</style>
