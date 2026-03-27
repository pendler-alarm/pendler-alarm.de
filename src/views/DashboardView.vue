<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import SvgIcon from '@/components/SvgIcon.vue';
import Widget from '@/components/Widget.vue';
import ConnectionCard from '@/components/connection/ConnectionCard.vue';
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
import { getApiMetrics } from '@/lib/api-metrics';
import { getCachedConnection, storeConnection } from '@/lib/connection-cache';
import { useGoogleAuthStore } from '@/features/auth/google/store';

const { t, locale } = useI18n();
const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const events = ref<GoogleCalendarEvent[]>([]);
const currentLocation = ref<ResolvedLocation | null>(null);
const currentLocationError = ref('');
const isLoadingEvents = ref(false);
const eventsError = ref('');
const loadingConnectionsById = ref<Record<string, boolean>>({});
const expandedConnections = ref<Set<string>>(new Set());
const apiMetrics = ref(getApiMetrics());
const lastConnectionRefreshAt = ref<string | null>(null);
let loadSequence = 0;
let refreshTimer: number | null = null;

const refreshIntervalMs = 5 * 60_000;

const apiTotal = computed(() => apiMetrics.value.googleCalendar + apiMetrics.value.motis);
const expandedConnectionCount = computed(() => expandedConnections.value.size);

const updateApiMetrics = (): void => {
  apiMetrics.value = getApiMetrics();
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

const refreshConnections = async (eventIds?: string[]): Promise<void> => {
  if (!googleAuthStore.isAuthenticated || !currentLocation.value) {
    return;
  }

  const targetIds = eventIds ?? Array.from(expandedConnections.value);
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

const resetDashboardState = (): void => {
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

    await loadConnections(nextEvents, origin, sequence);
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
  if (typeof window !== 'undefined') {
    refreshTimer = window.setInterval(() => {
      void refreshConnections();
    }, refreshIntervalMs);
  }
});

onBeforeUnmount(() => {
  if (refreshTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
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

      <div v-if="currentLocation?.address || currentLocation?.coordinates" class="current-location">
        <strong>{{ t('views.dashboard.events.currentLocation.title') }}</strong>
        <span v-if="currentLocation?.address">🏠 {{ currentLocation.address }}</span>
        <span v-if="currentLocation?.coordinates">🧭 {{ formatCoordinates(currentLocation.coordinates) }}</span>
      </div>

      <p v-else-if="currentLocationError && !isLoadingEvents" class="state-copy">
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
            @toggle="toggleConnection(event.id)"
          />

          <p v-else-if="event.connectionError" class="event-meta event-meta--muted">
            🚫 {{ event.connectionError }}
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

  .event-meta-text {
    white-space: normal;
  }
}
</style>
