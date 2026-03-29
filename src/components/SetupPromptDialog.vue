<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type LocationState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

const { t } = useI18n();
const deferredPrompt = ref<InstallPromptEvent | null>(null);
const locationState = ref<LocationState>('unknown');
const dismissed = ref(false);
const isStandalone = ref(false);
let permissionStatus: PermissionStatus | null = null;

const copy = computed(() => {
  const de = String(locale.value).startsWith('de');
  return de ? {
    eyebrow: 'App bereitmachen',
    title: 'Installieren und Standort freigeben',
    body: 'Hol dir Pendler Alarm als App und erlaube den Standort fur bessere Verbindungen.',
    installTitle: 'PWA installieren',
    installCopy: 'Schneller Zugriff direkt vom Startbildschirm.',
    installAction: 'Jetzt installieren',
    locationTitle: 'Standort freigeben',
    locationCopy: 'Der aktuelle Startpunkt macht die Route genauer.',
    locationRetry: 'Erneut versuchen',
    locationAction: 'Standort freigeben',
    later: 'Spater',
    done: 'Erledigt',
  } : {
    eyebrow: 'Get set up',
    title: 'Install and allow location',
    body: 'Add Pendler Alarm as an app and allow location for better routes.',
    installTitle: 'Install PWA',
    installCopy: 'Faster access right from your home screen.',
    installAction: 'Install now',
    locationTitle: 'Allow location',
    locationCopy: 'Your current starting point makes route timing more accurate.',
    locationRetry: 'Try again',
    locationAction: 'Allow location',
    later: 'Later',
    done: 'Done',
  };
});

const showDialog = computed(() => {
  const needsInstall = !!deferredPrompt.value && !isStandalone.value;
  const needsLocation = locationState.value === 'prompt' || locationState.value === 'denied';
  return !dismissed.value && (needsInstall || needsLocation);
});

const updateStandalone = (): void => {
  if (typeof window === 'undefined') return;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
};

const syncLocationState = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    locationState.value = 'unsupported';
    return;
  }

  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
    locationState.value = 'prompt';
    return;
  }

  const next = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
  permissionStatus = next;
  permissionStatus.onchange = () => {
    void syncLocationState();
  };
  locationState.value = next.state === 'granted'
    ? 'granted'
    : next.state === 'denied'
      ? 'denied'
      : 'prompt';
};

const requestLocation = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        locationState.value = 'granted';
        resolve();
      },
      () => {
        void syncLocationState();
        resolve();
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
};

const triggerInstall = async (): Promise<void> => {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt.value = null;
  }
};

const onBeforeInstallPrompt = (event: Event): void => {
  event.preventDefault();
  deferredPrompt.value = event as InstallPromptEvent;
};

const onInstalled = (): void => {
  deferredPrompt.value = null;
  updateStandalone();
};

onMounted(async () => {
  updateStandalone();
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled);
  }
  await syncLocationState();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.removeEventListener('appinstalled', onInstalled);
  }
  if (permissionStatus) {
    permissionStatus.onchange = null;
  }
});
</script>

<template>
  <div v-if="showDialog" class="setup-backdrop" role="dialog" aria-modal="true">
    <section class="setup-card">
      <p class="setup-eyebrow">{{ t('components.setupPrompt.eyebrow') }}</p>
      <h2 class="setup-title">{{ t('components.setupPrompt.title') }}</h2>
      <p class="setup-body">{{ t('components.setupPrompt.body') }}</p>

      <div class="setup-grid">
        <article v-if="deferredPrompt && !isStandalone" class="setup-panel">
          <strong>{{ t('components.setupPrompt.installTitle') }}</strong>
          <p>{{ t('components.setupPrompt.installCopy') }}</p>
          <button class="setup-button setup-button--primary" @click="triggerInstall">
            {{ t('components.setupPrompt.installAction') }}
          </button>
        </article>

        <article v-if="locationState === 'prompt' || locationState === 'denied'" class="setup-panel">
          <strong>{{ t('components.setupPrompt.locationTitle') }}</strong>
          <p>{{ t('components.setupPrompt.locationCopy') }}</p>
          <button class="setup-button setup-button--warm" @click="requestLocation">
            {{ locationState === 'denied' ? t('components.setupPrompt.locationRetry') : t('components.setupPrompt.locationAction') }}
          </button>
        </article>
      </div>

      <div class="setup-footer">
        <span v-if="!deferredPrompt && locationState === 'granted'">{{ t('components.setupPrompt.done') }}</span>
        <button class="setup-button" @click="dismissed = true">{{ t('components.setupPrompt.later') }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.setup-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: end center; padding: 24px; background: rgba(10, 16, 26, 0.52); backdrop-filter: blur(14px); }
.setup-card { width: min(100%, 38rem); padding: 22px; border-radius: 28px; color: #172033; background: linear-gradient(160deg, rgba(255,250,245,0.98), rgba(255,255,255,0.9)); box-shadow: 0 26px 60px rgba(15, 23, 42, 0.28); }
.setup-eyebrow { margin: 0 0 10px; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #c2410c; }
.setup-title { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); }
.setup-body { margin: 10px 0 0; color: rgba(23, 32, 51, 0.82); }
.setup-grid { display: grid; gap: 12px; margin-top: 18px; }
.setup-panel { padding: 14px; border-radius: 18px; background: rgba(15, 23, 42, 0.06); }
.setup-panel p { margin: 6px 0 12px; color: rgba(23, 32, 51, 0.78); }
.setup-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 18px; }
.setup-button { border: 1px solid rgba(15,23,42,0.12); border-radius: 999px; padding: 10px 14px; font-weight: 700; background: rgba(255,255,255,0.72); color: #172033; cursor: pointer; }
.setup-button--primary { background: linear-gradient(135deg, #ff5a36, #ff0b0b); color: #fff; border-color: transparent; }
.setup-button--warm { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; border-color: transparent; }
@media (max-width: 720px) { .setup-backdrop { padding: 14px; place-items: end stretch; } .setup-card { width: 100%; padding: 18px; border-radius: 24px; } .setup-footer { flex-direction: column; align-items: stretch; } }
</style>
