import { translate } from '@/i18n';
import { decryptFromLocalStorage, encryptForLocalStorage } from '@/lib/secure-storage';
import { localStorageStore } from '@/lib/storage';

const NEXTBIKE_API_URL = 'https://api.nextbike.net/api';
const NEXTBIKE_API_KEY_URL = 'https://webview.nextbike.net/getAPIKey.json';
const NEXTBIKE_CREDENTIALS_KEY = 'pendler-alarm.nextbike.credentials';
const NEXTBIKE_CRYPTO_KEY = 'pendler-alarm.nextbike';

type NextbikeApiKeyResponse = {
  apiKey?: string;
};

type NextbikeLoginResponse = {
  user?: {
    mobile?: string;
    screen_name?: string;
    loginkey?: string;
  };
  error?: {
    message?: string;
  };
};

export type NextbikeCredentials = {
  mobile: string;
  pin: string;
};

export type NextbikeAccount = {
  mobile: string;
  screenName: string | null;
  loginkey: string;
};

const normalizeCredentials = (credentials: NextbikeCredentials): NextbikeCredentials => ({
  mobile: credentials.mobile.trim(),
  pin: credentials.pin.trim(),
});

const fetchNextbikeApiKey = async (): Promise<string> => {
  const response = await fetch(NEXTBIKE_API_KEY_URL);
  const payload = await response.json() as NextbikeApiKeyResponse;
  const apiKey = payload.apiKey?.trim();

  if (!response.ok || !apiKey) {
    throw new Error(translate('views.dashboard.events.sharing.nextbike.loginUnavailable'));
  }

  return apiKey;
};

export const loginToNextbike = async (credentials: NextbikeCredentials): Promise<NextbikeAccount> => {
  const normalized = normalizeCredentials(credentials);

  if (!normalized.mobile || !normalized.pin) {
    throw new Error(translate('views.dashboard.events.sharing.nextbike.credentialsMissing'));
  }

  const apiKey = await fetchNextbikeApiKey();
  const formData = new FormData();
  formData.set('apikey', apiKey);
  formData.set('mobile', normalized.mobile);
  formData.set('pin', normalized.pin);
  formData.set('show_errors', '1');

  const response = await fetch(`${NEXTBIKE_API_URL}/login.json`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json() as NextbikeLoginResponse;
  const account = payload.user;

  if (!response.ok || !account?.mobile || !account.loginkey) {
    throw new Error(payload.error?.message || translate('views.dashboard.events.sharing.nextbike.loginFailed'));
  }

  return {
    mobile: account.mobile,
    screenName: account.screen_name?.trim() || null,
    loginkey: account.loginkey,
  };
};

export const storeNextbikeCredentials = async (credentials: NextbikeCredentials): Promise<boolean> => {
  const encrypted = await encryptForLocalStorage(
    NEXTBIKE_CRYPTO_KEY,
    JSON.stringify(normalizeCredentials(credentials)),
  );

  if (!encrypted) {
    return false;
  }

  localStorageStore.setString(NEXTBIKE_CREDENTIALS_KEY, encrypted);
  return true;
};

export const restoreNextbikeCredentials = async (): Promise<NextbikeCredentials | null> => {
  const decrypted = await decryptFromLocalStorage(
    NEXTBIKE_CRYPTO_KEY,
    localStorageStore.getString(NEXTBIKE_CREDENTIALS_KEY),
  );

  if (!decrypted) {
    return null;
  }

  try {
    const parsed = JSON.parse(decrypted) as Partial<NextbikeCredentials>;

    if (!parsed.mobile || !parsed.pin) {
      return null;
    }

    return normalizeCredentials({
      mobile: parsed.mobile,
      pin: parsed.pin,
    });
  } catch {
    return null;
  }
};

export const clearNextbikeCredentials = (): void => {
  localStorageStore.remove(NEXTBIKE_CREDENTIALS_KEY);
};
