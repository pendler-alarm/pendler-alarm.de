import { reactive, readonly } from 'vue';
import { getInitialAppVersion, storeAppVersion } from '@/lib/app-version';

type ServiceWorkerPhase = 'unsupported' | 'registering' | 'ready' | 'updating' | 'error';

type ServiceWorkerState = {
  isSupported: boolean;
  isOnline: boolean;
  isActive: boolean;
  phase: ServiceWorkerPhase;
  error: string | null;
  appVersion: string;
  workerVersion: string | null;
};

const SERVICE_WORKER_URL = '/service-worker.js';
const RELOAD_FLAG_KEY = 'pendler-alarm.service-worker-reload';

const state = reactive<ServiceWorkerState>({
  isSupported: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isActive: false,
  phase: 'unsupported',
  error: null,
  appVersion: getInitialAppVersion(),
  workerVersion: null,
});

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let listenersBound = false;

const bindWindowListeners = (): void => {
  if (typeof window === 'undefined' || listenersBound) {
    return;
  }

  const updateOnlineStatus = (): void => {
    state.isOnline = navigator.onLine;
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  listenersBound = true;
};

const applyWorkerVersion = (version: string | null | undefined): void => {
  state.workerVersion = version?.trim() ? version : null;
};

const maybeReloadForWorkerVersion = (version: string | null | undefined): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedVersion = version?.trim();

  if (!normalizedVersion || normalizedVersion === state.appVersion) {
    window.sessionStorage.removeItem(RELOAD_FLAG_KEY);
    return;
  }

  const lastReloadedVersion = window.sessionStorage.getItem(RELOAD_FLAG_KEY);

  if (lastReloadedVersion === normalizedVersion) {
    return;
  }

  window.sessionStorage.setItem(RELOAD_FLAG_KEY, normalizedVersion);
  window.location.reload();
};

const postVersionToWorker = (worker: ServiceWorker | null | undefined): void => {
  if (!worker) {
    return;
  }

  worker.postMessage({
    type: 'SET_APP_VERSION',
    payload: {
      version: state.appVersion,
    },
  });
};

const syncRegistrationState = (registration: ServiceWorkerRegistration): void => {
  const activeWorker = registration.active ?? navigator.serviceWorker.controller ?? null;
  state.isActive = Boolean(activeWorker);
  state.phase = activeWorker ? 'ready' : state.phase;
  postVersionToWorker(registration.installing);
  postVersionToWorker(registration.waiting);
  postVersionToWorker(activeWorker);
};

const buildServiceWorkerUrl = (version: string): string => {
  const searchParams = new URLSearchParams({ appVersion: version });
  return `${SERVICE_WORKER_URL}?${searchParams.toString()}`;
};

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    state.isSupported = false;
    state.phase = 'unsupported';
    state.isActive = false;
    return null;
  }

  bindWindowListeners();
  state.isSupported = true;
  state.phase = 'registering';
  state.error = null;

  try {
    const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl(state.appVersion));

    registration.addEventListener('updatefound', () => {
      state.phase = 'updating';
      const installingWorker = registration.installing;

      if (!installingWorker) {
        return;
      }

      postVersionToWorker(installingWorker);

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'activated') {
          syncRegistrationState(registration);
        }
      });
    });

    syncRegistrationState(registration);
    await registration.update();
    return registration;
  } catch (error) {
    state.phase = 'error';
    state.isActive = false;
    state.error = error instanceof Error ? error.message : 'Unknown service worker error';
    console.error('Service worker registration failed.', error);
    return null;
  }
};

const ensureRegistered = (): Promise<ServiceWorkerRegistration | null> => {
  registrationPromise ??= registerServiceWorker();
  return registrationPromise;
};

const refreshRegistration = async (): Promise<void> => {
  const registration = await ensureRegistered();

  if (!registration) {
    return;
  }

  syncRegistrationState(registration);
};

const updateVersion = async (version: string): Promise<void> => {
  const normalizedVersion = version.trim();

  if (!normalizedVersion) {
    return;
  }

  state.appVersion = normalizedVersion;
  storeAppVersion(normalizedVersion);

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await ensureRegistered();

  if (!registration) {
    return;
  }

  const nextScriptUrl = new URL(buildServiceWorkerUrl(normalizedVersion), window.location.origin).toString();
  const currentScriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? null;

  postVersionToWorker(registration.installing);
  postVersionToWorker(registration.waiting);
  postVersionToWorker(registration.active);

  if (currentScriptUrl !== nextScriptUrl) {
    state.phase = 'updating';
    registrationPromise = navigator.serviceWorker.register(buildServiceWorkerUrl(normalizedVersion));
    await refreshRegistration();
    return;
  }

  await registration.update();
  await refreshRegistration();
};

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    state.isActive = true;
    state.phase = 'ready';
    maybeReloadForWorkerVersion(state.workerVersion);
  });

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'SERVICE_WORKER_STATUS') {
      const { version, isActive } = event.data.payload ?? {};
      applyWorkerVersion(version);
      state.isActive = Boolean(isActive);
      state.phase = state.isActive ? 'ready' : state.phase;
      return;
    }

    if (event.data?.type === 'SERVICE_WORKER_REFRESH_REQUIRED') {
      const { version } = event.data.payload ?? {};
      maybeReloadForWorkerVersion(version);
    }
  });
}

export const serviceWorkerState = readonly(state);

export const initServiceWorker = async (): Promise<void> => {
  await ensureRegistered();
};

export const syncServiceWorkerVersion = async (version: string): Promise<void> => {
  await updateVersion(version);
};
