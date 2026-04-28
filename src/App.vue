<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';
import SetupPromptDialog from '@/components/SetupPromptDialog.vue';
import { setLocale, type AppLocale } from '@/i18n';
import { getInitialAppVersion } from '@/lib/app-version';
import { fetchReleaseMeta, getDefaultReleaseMeta } from '@/lib/release-meta';
import { serviceWorkerState, syncServiceWorkerVersion } from '@/lib/service-worker';
import {
  startTrainPresencePolling,
  stopTrainPresencePolling,
  trainPresenceState,
} from '@/features/motis/train-presence-store';

const { t, locale } = useI18n();
const version = ref(getInitialAppVersion());
const currentLocale = computed(() => locale.value as AppLocale);
const localeOptions = computed(() => [
  { code: 'de' as const, label: t('app.locale.de') },
  { code: 'en' as const, label: t('app.locale.en') },
]);

const serviceWorkerMessage = computed(() => {
  if (!serviceWorkerState.isSupported) return t('app.serviceWorker.unsupported');
  if (serviceWorkerState.phase === 'error') return t('app.serviceWorker.error');
  if (serviceWorkerState.phase === 'updating') return t('app.serviceWorker.updating');
  if (serviceWorkerState.phase === 'registering') return t('app.serviceWorker.registering');
  return t('app.serviceWorker.active');
});

const connectionMessage = computed(() => (
  serviceWorkerState.isOnline ? t('app.serviceWorker.online') : t('app.serviceWorker.offline')
));

const activeWorkerVersion = computed(() => serviceWorkerState.workerVersion ?? version.value);
const trainPresenceMessage = computed(() => {
  if (trainPresenceState.status === 'loading' || trainPresenceState.status === 'idle') {
    return t('app.trainPresence.loading');
  }

  if (trainPresenceState.status === 'success') {
    return trainPresenceState.isTrainLikely
      ? t('app.trainPresence.likely')
      : t('app.trainPresence.unlikely');
  }

  return t('app.trainPresence.unavailable');
});

const trainPresenceClassName = computed(() => {
  if (trainPresenceState.status === 'success') {
    return trainPresenceState.isTrainLikely
      ? 'train-presence-pill--likely'
      : 'train-presence-pill--unlikely';
  }

  return 'train-presence-pill--unknown';
});

const trainPresenceProvider = computed(() => trainPresenceState.isp
  ? t('app.trainPresence.provider', { value: trainPresenceState.isp })
  : null);
const switchLocale = (nextLocale: AppLocale): void => { setLocale(nextLocale); };

onMounted(async () => {
  startTrainPresencePolling(5 * 60_000);

  try {
    const meta = await fetchReleaseMeta();
    version.value = meta.appVersion;
  } catch {
    version.value = getDefaultReleaseMeta().appVersion;
  }

  await syncServiceWorkerVersion(version.value);
});

onBeforeUnmount(() => {
  stopTrainPresencePolling();
});
</script>

<template>
  <div id="app">
    <div v-if="serviceWorkerState.isSupported" class="service-worker-banner">
      <p class="service-worker-banner__text">
        {{ serviceWorkerMessage }}
        <span class="service-worker-banner__dot" :class="serviceWorkerState.isOnline ? 'is-online' : 'is-offline'" />
        {{ connectionMessage }}
        <span class="train-presence-pill" :class="trainPresenceClassName">{{ trainPresenceMessage }}</span>
        <span v-if="trainPresenceProvider" class="service-worker-banner__version">{{ trainPresenceProvider }}</span>
        <span class="service-worker-banner__version">{{ t('app.footer.version') }} {{ activeWorkerVersion }}</span>
        <RouterLink class="service-worker-banner__link" to="/dashboard">{{ t('app.navigation.dashboard') }}</RouterLink>
        <RouterLink class="service-worker-banner__link" to="/about">{{ t('app.navigation.about') }}</RouterLink>
        <a target="_blank" href="https://github.com/pendler-alarm/pendler-alarm.de"
          class="service-worker-banner__link">{{
            t('app.navigation.github') }}</a>
      </p>
    </div>

    <SetupPromptDialog />

    <main>
      <RouterView />
    </main>

    <div id="footer">
      <div class="footer-bar">
        <p class="text-muted credit" style="color: #fff">
          {{ t('app.footer.version') }}:
          <RouterLink class="release-link" to="/releases">{{ version }}</RouterLink>
        </p>

        <div class="locale-switcher" :aria-label="t('app.footer.language')">
          <span class="locale-label">{{ t('app.footer.language') }}</span>
          <button v-for="localeOption in localeOptions" :key="localeOption.code" type="button" class="locale-button"
            :class="{ 'locale-button--active': currentLocale === localeOption.code }"
            @click="switchLocale(localeOption.code)">
            {{ localeOption.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  font-family: 'Dosis', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--fg-light);
}

.service-worker-banner {
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 10px 20px;
  background: linear-gradient(90deg, rgba(9, 26, 43, 0.96), rgba(16, 60, 86, 0.92));
  border-bottom: 1px solid rgba(125, 211, 252, 0.24);
  backdrop-filter: blur(12px);
}

.service-worker-banner__text {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0;
  color: #e0f2fe;
  font-size: 0.92rem;
  font-weight: 600;
}

.service-worker-banner__dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
}

.service-worker-banner__dot.is-online {
  background: #22c55e;
}

.service-worker-banner__dot.is-offline {
  background: #f97316;
}

.service-worker-banner__version {
  color: rgba(224, 242, 254, 0.8);
}

.service-worker-banner__link {
  color: #f0f9ff;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.service-worker-banner__link:hover {
  color: #bae6fd;
}

.train-presence-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  line-height: 1.1;
}

.train-presence-pill--likely {
  background: rgba(34, 197, 94, 0.2);
  color: #dcfce7;
}

.train-presence-pill--unlikely {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.train-presence-pill--unknown {
  background: rgba(249, 115, 22, 0.2);
  color: #ffedd5;
}

.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px 24px;
}

.release-link {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.locale-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.locale-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
}

.locale-button {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  padding: 6px 10px;
  cursor: pointer;
}

.locale-button--active {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.45);
}

@media (max-width: 720px) {
  .service-worker-banner {
    padding: 10px 14px;
  }

  .footer-bar {
    padding: 0 14px 20px;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
