const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
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

let scriptLoadingPromise: Promise<void> | null = null;

export const hasGrantedScope = (scopeList: string, expectedScope: string): boolean =>
  scopeList
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean)
    .includes(expectedScope);

export const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts.oauth2) {
    return;
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Google Identity script failed to load.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Identity script failed to load.'));
      document.head.appendChild(script);
    }).finally(() => {
      if (!window.google?.accounts.oauth2) {
        scriptLoadingPromise = null;
      }
    });
  }

  await scriptLoadingPromise;
};

export const createGoogleCalendarAuthClient = async (
  clientId: string,
  onToken: (response: GoogleTokenResponse) => void,
): Promise<GoogleTokenClient> => {
  await loadGoogleIdentityScript();

  const googleOauth2Api = window.google?.accounts.oauth2;

  if (!googleOauth2Api) {
    throw new Error('Google OAuth API is not available.');
  }

  return googleOauth2Api.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_CALENDAR_SCOPE,
    callback: onToken,
  });
};

export const revokeGoogleCalendarAccess = async (accessToken: string): Promise<void> => {
  const googleOauth2Api = window.google?.accounts.oauth2;

  if (!googleOauth2Api || !accessToken) {
    return;
  }

  await new Promise<void>((resolve) => {
    googleOauth2Api.revoke(accessToken, () => resolve());
  });
};
