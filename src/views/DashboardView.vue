<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Message from '@/components/Message.vue';
import SvgIcon from '@/components/SvgIcon.vue';
import Widget from '@/components/Widget.vue';
import ConnectionCard from '@/components/connection/ConnectionCard.vue';
import SharingOptionCard from '@/components/connection/SharingOptionCard.vue';
import GoogleAuthCard from '@/features/auth/google/GoogleAuthCard.vue';
import {
  fetchEventConnection,
  fetchUpcomingCalendarEvents,
  type GoogleCalendarEvent,
} from '@/features/auth/google/calendar-api';
import {
  formatCoordinates,
  getCurrentResolvedLocation,
  type ResolvedLocation,
} from '@/features/motis/location-service';
import {
  findSharingSuggestion,
  getDefaultSharingPreferences,
  type SharingPreferences,
  type SharingProviderId,
} from '@/features/sharing/sharing-service';
import { getApiMetrics } from '@/lib/api-metrics';
import { getCachedConnection, storeConnection } from '@/lib/connection-cache';
import { useGoogleAuthStore } from '@/features/auth/google/store';

type NotificationUiState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

const refreshIntervalMs = 5 * 60_000;
const REMINDER_LEAD_KEY = 'pendler-alarm.reminder-lead-minutes';
const SHARING_PREFERENCES_KEY = 'pendler-alarm.sharing-preferences';
const DEFAULT_LEAD_MINUTES = 30;
const defaultSharingPreferences = getDefaultSharingPreferences();

const loadStoredSharingPreferences = (): SharingPreferences => {
  if (typeof window === 'undefined') {
    return defaultSharingPreferences;
  }

  try {
    const raw = window.localStorage.getItem(SHARING_PREFERENCES_KEY);
    if (!raw) {
      return defaultSharingPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<SharingPreferences> | null;
    if (!parsed || typeof parsed !== 'object') {
      return defaultSharingPreferences;
    }

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
  } catch {
    return defaultSharingPreferences;
  }
};

const getReminderLeadTimeMs = (): number => {
  if (typeof window === 'undefined') {
    return DEFAULT_LEAD_MINUTES * 60_000;
  }
  const raw = window.localStorage.getItem(REMINDER_LEAD_KEY);
  const minutes = Number(raw);
  const normalized = Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_LEAD_MINUTES;
  return normalized * 60_000;
};

const { t, locale } = useI18n();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const initialSharingPreferences = loadStoredSharingPreferences();
const events = ref<GoogleCalendarEvent[]>([]);
const currentLocation = ref<ResolvedLocation | null>(null);
const currentLocationError = ref('');
const notificationState = ref<NotificationUiState>('unknown');
const isStandalone = ref(false);
const isLoadingEvents = ref(false);
const eventsError = ref('');
const loadingConnectionsById = ref<Record<string, boolean>>({});
const expandedConnections = ref<Set<string>>(new Set());
const apiMetrics = ref(getApiMetrics());
const lastConnectionRefreshAt = ref<string | null>(null);
const debugNotificationFeedback = ref<{
  variant: 'success' | 'error' | 'warning';
  message: string;
} | null>(null);
const currentDebugNotificationTag = ref<string | null>(null);
const sharingProviderId = ref<SharingProviderId>(initialSharingPreferences.providerId);
const sharingShortTripDistanceKm = ref<number>(initialSharingPreferences.shortTripDistanceKm);
const sharingStationSearchRadiusMeters = ref<number>(initialSharingPreferences.stationSearchRadiusMeters);
const sharingCustomProviderLabel = ref<string>(initialSharingPreferences.customProviderLabel);
const sharingCustomGbfsUrl = ref<string>(initialSharingPreferences.customGbfsUrl);
let loadSequence = 0;
let refreshTimer: number | null = null;
const reminderTimers = new Map<string, number>();
const sentReminderKeys = new Set<string>();
const notificationIconUrl = new URL('../assets/svg/logo.svg', import.meta.url).href;

const apiTotal = computed(() => apiMetrics.value.googleCalendar + apiMetrics.value.motis);
const expandedConnectionCount = computed(() => expandedConnections.value.size);
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

const persistSharingPreferences = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SHARING_PREFERENCES_KEY, JSON.stringify(sharingPreferences.value));
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

const updateEvent = (eventId: string, patch: Partial<GoogleCalendarEvent>): void => {
  events.value = events.value.map((event) => (
    event.id === eventId
      ? { ...event, ...patch }
      : event
  ));
};

const applyCachedConnection = (event: GoogleCalendarEvent): void => {
  const cached = getCachedConnection(event.id);
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
      sharingSuggestion: suggestion,
      sharingError: error,
    });
  }));
};

const refreshConnections = async (eventIds?: string[]): Promise<void> => {
  if (!googleAuthStore.isAuthenticated || !currentLocation.value) {
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

    const { connection, connectionError } = await fetchEventConnection(currentLocation.value, event);

    if (sequence !== loadSequence) {
      return;
    }

    const fetchedAt = new Date().toISOString();
    updateEvent(event.id, {
      connection,
      connectionError,
      connectionFetchedAt: connection ? fetchedAt : event.connectionFetchedAt,
    });

    if (connection) {
      storeConnection(event.id, connection, fetchedAt);
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
    const { connection, connectionError } = await fetchEventConnection(origin, event);

    if (sequence !== loadSequence) {
      return;
    }

    const fetchedAt = new Date().toISOString();
    updateEvent(event.id, {
      connection,
      connectionError,
      connectionFetchedAt: connection ? fetchedAt : event.connectionFetchedAt,
    });

    if (connection) {
      storeConnection(event.id, connection, fetchedAt);
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
      sharingSuggestion: suggestion,
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
  expandedConnections.value = new Set();
  lastConnectionRefreshAt.value = null;
};

const loadEvents = async (): Promise<void> => {
  if (!googleAuthStore.isAuthenticated || !googleAuthStore.accessToken) {
    resetDashboardState();
    return;
  }

  const sequence = ++loadSequence;
  isLoadingEvents.value = true;
  eventsError.value = '';
  loadingConnectionsById.value = {};

  try {
    const eventsPromise = fetchUpcomingCalendarEvents(googleAuthStore.accessToken);
    const currentLocationPromise = loadCurrentLocation();
    const nextEvents = await eventsPromise;

    if (sequence !== loadSequence) {
      return;
    }

    events.value = nextEvents;
    isLoadingEvents.value = false;
    updateApiMetrics();

    expandedConnections.value = new Set(
      Array.from(expandedConnections.value).filter((id) => nextEvents.some((event) => event.id === id)),
    );

    const origin = await currentLocationPromise;

    if (sequence !== loadSequence) {
      return;
    }

    await Promise.all([
      loadConnections(nextEvents, origin, sequence),
      loadSharingSuggestions(nextEvents, origin, sequence),
    ]);
  } catch (error) {
    if (sequence !== loadSequence) {
      return;
    }

    events.value = [];
    eventsError.value = error instanceof Error ? error.message : t('views.dashboard.events.errorFallback');
    isLoadingEvents.value = false;
  }
};

const isConnectionExpanded = (eventId: string): boolean => expandedConnections.value.has(eventId);

const toggleConnection = (eventId: string): void => {
  const next = new Set(expandedConnections.value);

  if (next.has(eventId)) {
    next.delete(eventId);
  } else {
    next.add(eventId);
    void refreshConnections([eventId]);
  }

  expandedConnections.value = next;
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

  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', syncNotificationState);
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }

  clearReminderTimers();
});

watch(
  () => googleAuthStore.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      loadSequence += 1;
      router.replace({ name: 'home' });
      resetDashboardState();
      return;
    }

    void loadEvents();
  },
  { immediate: true },
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
</script>

<template>
  <section class="dashboard-view">
    <Widget>
      <template #sub-title>{{ t('views.dashboard.hero.subTitle') }}</template>
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

      <Message
        v-if="notificationState !== 'unsupported'"
        class="notification-status"
        :variant="notificationStatusVariant"
      >
        <strong>{{ t('views.dashboard.events.notification.title') }}</strong>
        {{ notificationStatusMessage }}
      </Message>

      <Message
        v-if="notificationState === 'granted'"
        class="notification-system-hint"
        variant="warning"
      >
        {{ t('views.dashboard.events.notification.systemHint') }}
      </Message>

      <div v-if="currentLocation?.address || currentLocation?.coordinates" class="current-location">
        <strong>{{ t('views.dashboard.events.currentLocation.title') }}</strong>
        <span v-if="currentLocation?.address">🏠 {{ currentLocation.address }}</span>
        <span v-if="currentLocation?.coordinates">🧭 {{ formatCoordinates(currentLocation.coordinates) }}</span>
      </div>

      <details class="sharing-settings">
        <summary class="sharing-settings-summary">
          <div class="sharing-settings-header">
            <strong>{{ t('views.dashboard.events.sharing.settingsTitle') }}</strong>
            <span>
              {{ t('views.dashboard.events.sharing.settingsSummary', { provider: currentSharingProviderLabel, distanceKm: sharingShortTripDistanceKm, radiusMeters: sharingStationSearchRadiusMeters }) }}
            </span>
          </div>
          <span class="sharing-settings-hint">{{ t('views.dashboard.events.sharing.settingsDescription') }}</span>
        </summary>
        <div class="sharing-settings-body">
        <label class="sharing-field">
          <span>{{ t('views.dashboard.events.sharing.providerLabel') }}</span>
          <select v-model="sharingProviderId" class="sharing-input">
            <option
              v-for="provider in sharingProviderOptions"
              :key="provider.value"
              :value="provider.value"
            >
              {{ provider.label }}
            </option>
          </select>
        </label>
        <label class="sharing-field">
          <span>{{ t('views.dashboard.events.sharing.distanceLabel') }}</span>
          <input
            v-model.number="sharingShortTripDistanceKm"
            class="sharing-input"
            type="number"
            min="0.5"
            max="25"
            step="0.5"
          >
        </label>
        <label class="sharing-field">
          <span>{{ t('views.dashboard.events.sharing.radiusLabel') }}</span>
          <input
            v-model.number="sharingStationSearchRadiusMeters"
            class="sharing-input"
            type="number"
            min="200"
            max="5000"
            step="100"
          >
        </label>
        <label v-if="isCustomSharingProvider" class="sharing-field">
          <span>{{ t('views.dashboard.events.sharing.customProviderLabel') }}</span>
          <input v-model.trim="sharingCustomProviderLabel" class="sharing-input" type="text">
        </label>
        <label v-if="isCustomSharingProvider" class="sharing-field sharing-field--wide">
          <span>{{ t('views.dashboard.events.sharing.customFeedLabel') }}</span>
          <input
            v-model.trim="sharingCustomGbfsUrl"
            class="sharing-input"
            type="url"
            :placeholder="t('views.dashboard.events.sharing.customFeedPlaceholder')"
          >
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
          <ConnectionCard
            v-else-if="event.connection"
            :connection="event.connection"
            :event-id="event.id"
            :event-start-iso="event.startIso"
            :last-updated-iso="event.connectionFetchedAt"
            :expanded="isConnectionExpanded(event.id)"
            :sharing-suggestion="event.sharingSuggestion"
            @toggle="toggleConnection(event.id)"
          />

          <p v-else-if="event.connectionError" class="event-meta event-meta--muted">
            🚫 {{ event.connectionError }}
          </p>

          <SharingOptionCard
            v-if="event.sharingSuggestion && !event.connection"
            :suggestion="event.sharingSuggestion"
            :compact="true"
          />

          <p v-if="event.sharingError" class="event-meta event-meta--muted">
            🚲 {{ event.sharingError }}
          </p>
        </li>
      </ul>

      <div class="calendar-debug">
        <details class="debug-details">
          <summary class="debug-summary">
            <span class="debug-label">{{ t('views.dashboard.events.debug.summary') }}</span>
            <span class="debug-bubble">{{ apiTotal }}</span>
          </summary>
          <div class="debug-body">
            <Message
              v-if="debugNotificationFeedback"
              class="debug-feedback"
              :variant="debugNotificationFeedback.variant"
            >
              {{ debugNotificationFeedback.message }}
            </Message>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.googleCalendar') }}: {{ apiMetrics.googleCalendar }}
            </div>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.motis') }}: {{ apiMetrics.motis }}
            </div>
            <div v-if="lastConnectionRefreshAt" class="debug-row">
              {{ t('views.dashboard.events.debug.lastRefresh') }}: {{ formatTimestamp(lastConnectionRefreshAt) }}
            </div>
            <div class="debug-row">
              {{ t('views.dashboard.events.debug.openConnections', { count: expandedConnectionCount }) }}
            </div>
            <button
              class="debug-action"
              :disabled="events.length === 0"
              @click="triggerDebugNotification"
            >
              {{ t('views.dashboard.events.debug.triggerFirstEventNotification') }}
            </button>
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
  gap: 6px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(143, 188, 187, 0.14);
  border: 1px solid rgba(143, 188, 187, 0.28);
}

.current-location span {
  color: var(--calendar-state-empty);
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
  display: flex;
  justify-content: flex-end;
}

.debug-details {
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

@media (max-width: 720px) {
  .dashboard-view {
    padding: 18px 14px 40px;
  }

  .calendar-debug {
    justify-content: flex-start;
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
}
</style>
