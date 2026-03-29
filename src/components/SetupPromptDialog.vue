<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type LocationState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

type NotificationState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

const { t } = useI18n();
const deferredPrompt = ref<InstallPromptEvent | null>(null);
const locationState = ref<LocationState>('unknown');
const dismissed = ref(false);
const isStandalone = ref(false);
let permissionStatus: PermissionStatus | null = null;
const notificationState = ref<NotificationState>('unknown');


const showDialog = computed(() => {
  const needsInstall = !!deferredPrompt.value && !isStandalone.value;
  const needsNotification = isStandalone.value
    && notificationState.value !== 'granted'
    && notificationState.value !== 'unsupported';
  return !dismissed.value && (needsInstall || needsNotification);
});

const updateStandalone = (): void => {
  if (typeof window === 'undefined') return;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  // eslint-disable-next-line local-i18n/no-hardcoded-text
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

const syncNotificationState = (): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    notificationState.value = 'unsupported';
    return;
  }

  if (Notification.permission === 'granted') {
    notificationState.value = 'granted';
  } else if (Notification.permission === 'denied') {
    notificationState.value = 'denied';
  } else {
    notificationState.value = 'prompt';
  }
};

const requestNotificationPermission = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    notificationState.value = 'unsupported';
    return;
  }

  const result = await Notification.requestPermission();
  notificationState.value = result === 'granted'
    ? 'granted'
    : result === 'denied'
      ? 'denied'
      : 'prompt';
};


const triggerInstall = async (): Promise<void> => {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt.value = null;
    if (locationState.value !== 'granted' && locationState.value !== 'unsupported') {
      await requestLocation();
    }

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
  syncNotificationState();
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

        <article v-if="notificationState !== 'unsupported'" class="setup-panel">
          <strong>{{ t('components.setupPrompt.notificationTitle') }}</strong>
          <p>
            {{
              notificationState === 'granted'
                ? t('components.setupPrompt.notificationGranted')
                : t('components.setupPrompt.notificationCopy')
            }}
          </p>
          <button
            v-if="notificationState !== 'granted'"
            class="setup-button setup-button--warm"
            @click="requestNotificationPermission"
          >
            {{
              notificationState === 'denied'
                ? t('components.setupPrompt.notificationRetry')
                : t('components.setupPrompt.notificationAction')
            }}
          </button>
        </article>

      </div>

      <div class="setup-footer">
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
.setup-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.setup-label { font-weight: 600; color: rgba(23, 32, 51, 0.86); }
.setup-select { border: 1px solid rgba(15,23,42,0.18); border-radius: 999px; padding: 6px 12px; background: #fff; font-weight: 600; color: #172033; }
.setup-select:disabled { opacity: 0.6; cursor: not-allowed; }
.setup-helper { margin: 0; font-size: 0.9rem; color: rgba(23, 32, 51, 0.7); }
.setup-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 18px; }
.setup-button { border: 1px solid rgba(15,23,42,0.12); border-radius: 999px; padding: 10px 14px; font-weight: 700; background: rgba(255,255,255,0.72); color: #172033; cursor: pointer; }
.setup-button--primary { background: linear-gradient(135deg, #ff5a36, #ff0b0b); color: #fff; border-color: transparent; }
.setup-button--warm { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; border-color: transparent; }
@media (max-width: 720px) { .setup-backdrop { padding: 14px; place-items: end stretch; } .setup-card { width: 100%; padding: 18px; border-radius: 24px; } .setup-footer { flex-direction: column; align-items: stretch; } }
</style>
