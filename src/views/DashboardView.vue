<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Widget from '@/components/Widget.vue';
import GoogleAuthCard from '@/features/auth/google/GoogleAuthCard.vue';
import { fetchUpcomingCalendarEvents, type GoogleCalendarEvent } from '@/features/auth/google/calendar-api';
import { useGoogleAuthStore } from '@/features/auth/google/store';

const router = useRouter();
const googleAuthStore = useGoogleAuthStore();
const events = ref<GoogleCalendarEvent[]>([]);
const isLoadingEvents = ref(false);
const eventsError = ref('');

const loadEvents = async (): Promise<void> => {
  if (!googleAuthStore.isAuthenticated || !googleAuthStore.accessToken) {
    events.value = [];
    eventsError.value = '';
    return;
  }

  isLoadingEvents.value = true;
  eventsError.value = '';

  try {
    events.value = await fetchUpcomingCalendarEvents(googleAuthStore.accessToken);
  } catch (error) {
    events.value = [];
    eventsError.value = error instanceof Error ? error.message : 'Kalendertermine konnten nicht geladen werden.';
  } finally {
    isLoadingEvents.value = false;
  }
};

watch(
  () => googleAuthStore.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      router.replace({ name: 'home' });
      events.value = [];
      return;
    }

    void loadEvents();
  },
  { immediate: true },
);

onMounted(async () => {
  if (googleAuthStore.isAuthenticated) {
    await loadEvents();
  }
});
</script>

<template>
  <section class="dashboard-view">
    <Widget>
      <template #sub-title>Dashboard</template>
      <template #title>Kalender verbunden</template>
      <template #description>
        Du bist angemeldet und kannst jetzt auf den geschutzten Dashboard-Bereich wechseln.
      </template>
    </Widget>

    <GoogleAuthCard mode="status" />

    <Widget class="calendar-events-card" :show-actions="false" :compact="true" title-tag="h2">
      <template #sub-title>Google Calendar</template>
      <template #title>Deine nachsten 3 Termine</template>
      <template #description>
        Die Liste wird aus deinem primaren Google Kalender geladen.
      </template>

      <p v-if="isLoadingEvents" class="state-copy">
        Termine werden geladen...
      </p>

      <p v-else-if="eventsError" class="state-copy state-copy--error">
        {{ eventsError }}
      </p>

      <p v-else-if="events.length === 0" class="state-copy">
        Keine anstehenden Termine gefunden.
      </p>

      <ul v-else class="event-list">
        <li v-for="event in events" :key="event.id" class="event-item">
          <strong>{{ event.summary }}</strong>
          <span>{{ event.startLabel }}</span>
        </li>
      </ul>
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

.event-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.event-item {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.event-item span,
.state-copy {
  color: rgba(226, 232, 240, 0.72);
}

.state-copy {
  margin: 0;
}

.state-copy--error {
  color: #fecaca;
}

@media (max-width: 720px) {
  .dashboard-view {
    padding: 18px 14px 40px;
  }
}
</style>
