import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { translate } from '@/i18n';
import { sessionStorageStore } from '@/lib/storage';
import { GOOGLE_CALENDAR_SCOPE, GOOGLE_IDENTITY_SCRIPT_SRC } from '@/utils/constants/api';

type GoogleAuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

type PersistedSession = {
  accessToken: string;
  expiresAt: number;
};

const STORAGE_KEY = 'google-calendar-auth';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: {
    prompt?: '' | 'consent' | 'select_account';
    hint?: string;
  }) => void;
};

type GoogleOauth2Api = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }) => GoogleTokenClient;
  revoke: (
    accessToken: string,
    callback?: (response?: { successful?: boolean; error?: string; error_description?: string }) => void,
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOauth2Api;
      };
    };
  }
}

const isBrowser = (): boolean => typeof window !== 'undefined';

let scriptLoadingPromise: Promise<void> | null = null;

const readPersistedSession = (): PersistedSession | null => {
  if (!isBrowser()) {
    return null;
  }

  const parsed = sessionStorageStore.getJson(STORAGE_KEY, (value) => (
    value && typeof value === 'object' ? value as Partial<PersistedSession> : null
  ));

  if (!parsed) {
    return null;
  }

  if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number') {
    return null;
  }

  if (parsed.expiresAt <= Date.now()) {
    sessionStorageStore.remove(STORAGE_KEY);
    return null;
  }

  return {
    accessToken: parsed.accessToken,
    expiresAt: parsed.expiresAt,
  };
};

const persistSession = (session: PersistedSession | null): void => {
  if (!isBrowser()) {
    return;
  }

  if (!session) {
    sessionStorageStore.remove(STORAGE_KEY);
    return;
  }

  sessionStorageStore.setJson(STORAGE_KEY, session);
};

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts.oauth2) {
    return;
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
      );

      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error(translate('auth.google.error.scriptLoad'))),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true';
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => reject(new Error(translate('auth.google.error.scriptLoad'))),
        { once: true },
      );
      document.head.appendChild(script);
    }).finally(() => {
      if (!window.google?.accounts.oauth2) {
        scriptLoadingPromise = null;
      }
    });
  }

  await scriptLoadingPromise;
};

export const useGoogleAuthStore = defineStore('google-auth', () => {
  const persistedSession = readPersistedSession();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const status = ref<GoogleAuthStatus>(persistedSession ? 'authenticated' : 'idle');
  const errorMessage = ref('');
  const accessToken = ref(persistedSession?.accessToken ?? '');
  const expiresAt = ref<number | null>(persistedSession?.expiresAt ?? null);
  const isConfigured = computed(() => clientId.length > 0);
  const isAuthenticated = computed(
    () => accessToken.value.length > 0 && !!expiresAt.value && expiresAt.value > Date.now(),
  );

  let googleClient: GoogleTokenClient | null = null;
  let initialized = false;

  const clearSession = (): void => {
    accessToken.value = '';
    expiresAt.value = null;
    persistSession(null);
  };

  const initialize = async (): Promise<void> => {
    if (!isConfigured.value) {
      status.value = 'error';
      errorMessage.value = translate('auth.google.error.missingClientId');
      return;
    }

    if (initialized) {
      return;
    }

    status.value = isAuthenticated.value ? 'authenticated' : 'loading';
    errorMessage.value = '';

    try {
      await loadGoogleIdentityScript();

      const googleOauth2Api = window.google?.accounts.oauth2;

      if (!googleOauth2Api) {
        throw new Error(translate('auth.google.error.oauthApiUnavailable'));
      }

      googleClient = googleOauth2Api.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_CALENDAR_SCOPE,
        callback: (response) => {
          if (response.error) {
            status.value = 'error';
            errorMessage.value = response.error_description || response.error;
            return;
          }

          if (!response.access_token) {
            status.value = 'error';
            errorMessage.value = translate('auth.google.error.noAccessToken');
            return;
          }

          const nextExpiresAt = Date.now() + Math.max(response.expires_in ?? 0, 1) * 1000;

          accessToken.value = response.access_token;
          expiresAt.value = nextExpiresAt;
          status.value = 'authenticated';
          errorMessage.value = '';
          persistSession({
            accessToken: response.access_token,
            expiresAt: nextExpiresAt,
          });
        },
      });

      initialized = true;
      status.value = isAuthenticated.value ? 'authenticated' : 'idle';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof Error ? error.message : translate('auth.google.error.initFailed');
    }
  };

  const signIn = async (): Promise<void> => {
    await initialize();

    if (!googleClient) {
      return;
    }

    status.value = 'loading';
    errorMessage.value = '';
    googleClient.requestAccessToken({ prompt: accessToken.value ? '' : 'consent' });
  };

  const signOut = async (): Promise<void> => {
    const token = accessToken.value;

    clearSession();
    errorMessage.value = '';
    status.value = 'idle';

    const googleOauth2Api = window.google?.accounts.oauth2;

    if (token && googleOauth2Api) {
      await new Promise<void>((resolve) => {
        googleOauth2Api.revoke(token, () => resolve());
      });
    }
  };

  if (!isAuthenticated.value && persistedSession) {
    clearSession();
    status.value = 'idle';
  }

  return {
    accessToken,
    errorMessage,
    initialize,
    isAuthenticated,
    isConfigured,
    signIn,
    signOut,
    status,
  };
});
