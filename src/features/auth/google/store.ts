import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  GOOGLE_CALENDAR_SCOPE,
  createGoogleCalendarAuthClient,
  hasGrantedScope,
  revokeGoogleCalendarAccess,
} from './google-auth';


type GoogleAuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

type PersistedSession = {
  accessToken: string;
  expiresAt: number;
  grantedScope: string;
};

const STORAGE_KEY = 'google-calendar-auth';

const isBrowser = (): boolean => typeof window !== 'undefined';

const readPersistedSession = (): PersistedSession | null => {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedSession>;

    if (
      typeof parsed.accessToken !== 'string'
      || typeof parsed.expiresAt !== 'number'
      || typeof parsed.grantedScope !== 'string'
    ) {
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      grantedScope: parsed.grantedScope,
    };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: PersistedSession | null): void => {
  if (!isBrowser()) {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const useGoogleAuthStore = defineStore('google-auth', () => {
  const persistedSession = readPersistedSession();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const status = ref<GoogleAuthStatus>(persistedSession ? 'authenticated' : 'idle');
  const errorMessage = ref('');
  const accessToken = ref(persistedSession?.accessToken ?? '');
  const expiresAt = ref<number | null>(persistedSession?.expiresAt ?? null);
  const grantedScope = ref(persistedSession?.grantedScope ?? '');
  const isConfigured = computed(() => clientId.length > 0);
  const isAuthenticated = computed(
    () =>
      accessToken.value.length > 0
      && !!expiresAt.value
      && expiresAt.value > Date.now()
      && hasGrantedScope(grantedScope.value, GOOGLE_CALENDAR_SCOPE),
  );

  let googleClient: Awaited<ReturnType<typeof createGoogleCalendarAuthClient>> | null = null;
  let initialized = false;

  const clearSession = (): void => {
    accessToken.value = '';
    expiresAt.value = null;
    grantedScope.value = '';
    persistSession(null);
  };

  const initialize = async (): Promise<void> => {
    if (!isConfigured.value) {
      status.value = 'error';
      errorMessage.value = 'VITE_GOOGLE_CLIENT_ID fehlt in der .env.';
      return;
    }

    if (initialized) {
      return;
    }

    status.value = isAuthenticated.value ? 'authenticated' : 'loading';
    errorMessage.value = '';

    try {
      googleClient = await createGoogleCalendarAuthClient(clientId, (response) => {
        if (response.error) {
          status.value = 'error';
          errorMessage.value = response.error_description || response.error;
          return;
        }

        if (!response.access_token) {
          status.value = 'error';
          errorMessage.value = 'Google OAuth hat keinen Access Token geliefert.';
          return;
        }

        const nextExpiresAt = Date.now() + Math.max(response.expires_in ?? 0, 1) * 1000;
        const nextGrantedScope = response.scope ?? GOOGLE_CALENDAR_SCOPE;

        accessToken.value = response.access_token;
        expiresAt.value = nextExpiresAt;
        grantedScope.value = nextGrantedScope;
        status.value = 'authenticated';
        errorMessage.value = '';
        persistSession({
          accessToken: response.access_token,
          expiresAt: nextExpiresAt,
          grantedScope: nextGrantedScope,
        });
      });
      initialized = true;
      status.value = isAuthenticated.value ? 'authenticated' : 'idle';
    } catch (error) {
      status.value = 'error';
      errorMessage.value =
        error instanceof Error ? error.message : 'Google Login konnte nicht initialisiert werden.';
    }
  };

  const signIn = async (): Promise<void> => {
    await initialize();

    if (!googleClient) {
      return;
    }

    status.value = 'loading';
    errorMessage.value = '';
    googleClient.requestAccessToken({ prompt: 'consent' });
  };

  const signOut = async (): Promise<void> => {
    const token = accessToken.value;

    clearSession();
    errorMessage.value = '';
    status.value = 'idle';

    if (token) {
      await revokeGoogleCalendarAccess(token);
    }
  };

  if (!isAuthenticated.value && persistedSession) {
    clearSession();
    status.value = 'idle';
  }

  return {
    accessToken,
    errorMessage,
    grantedScope,
    initialize,
    isAuthenticated,
    isConfigured,
    signIn,
    signOut,
    status,
  };
});
