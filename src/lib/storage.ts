type JsonNormalizer<T> = (value: unknown) => T | null;

type BrowserStorage = {
  getString: (key: string) => string | null;
  getNumber: (key: string) => number | null;
  getBoolean: (key: string) => boolean | null;
  getJson: <T>(key: string, normalize: JsonNormalizer<T>) => T | null;
  setString: (key: string, value: string) => void;
  setNumber: (key: string, value: number) => void;
  setBoolean: (key: string, value: boolean) => void;
  setJson: (key: string, value: unknown) => void;
  remove: (key: string) => void;
};

const getStorage = (type: 'localStorage' | 'sessionStorage'): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window[type];
};

const createBrowserStorage = (type: 'localStorage' | 'sessionStorage'): BrowserStorage => {
  const readRaw = (key: string): string | null => {
    try {
      return getStorage(type)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };

  const writeRaw = (key: string, value: string): void => {
    try {
      getStorage(type)?.setItem(key, value);
    } catch {
      // Ignore storage errors.
    }
  };

  const getJson = <T>(key: string, normalize: JsonNormalizer<T>): T | null => {
    const raw = readRaw(key);

    if (!raw) {
      return null;
    }

    try {
      return normalize(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  return {
    getString: (key) => readRaw(key),
    getNumber: (key) => {
      const raw = readRaw(key);
      const value = raw === null ? Number.NaN : Number(raw);

      return Number.isFinite(value) ? value : null;
    },
    getBoolean: (key) => {
      const raw = readRaw(key);

      if (raw === 'true') {
        return true;
      }

      if (raw === 'false') {
        return false;
      }

      return null;
    },
    getJson,
    setString: writeRaw,
    setNumber: (key, value) => writeRaw(key, String(value)),
    setBoolean: (key, value) => writeRaw(key, String(value)),
    setJson: (key, value) => writeRaw(key, JSON.stringify(value)),
    remove: (key) => {
      try {
        getStorage(type)?.removeItem(key);
      } catch {
        // Ignore storage errors.
      }
    },
  };
};

export const localStorageStore = createBrowserStorage('localStorage');
export const sessionStorageStore = createBrowserStorage('sessionStorage');
