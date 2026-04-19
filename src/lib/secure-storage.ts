const DATABASE_NAME = 'pendler-alarm-secure-storage';
const STORE_NAME = 'keys';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type KeyRecord = {
  id: string;
  key: CryptoKey;
};

const openDatabase = async (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>,
): Promise<T | null> => {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    return await handler(store);
  } finally {
    database.close();
  }
};

const getOrCreateKey = async (id: string): Promise<CryptoKey | null> => {
  const existing = await withStore('readonly', async (store) => new Promise<CryptoKey | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as KeyRecord | undefined)?.key ?? null);
    request.onerror = () => reject(request.error);
  }));

  if (existing) {
    return existing;
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

  await withStore('readwrite', async (store) => new Promise<void>((resolve, reject) => {
    const request = store.put({ id, key } satisfies KeyRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }));

  return key;
};

const toBase64 = (bytes: Uint8Array): string => window.btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export const encryptForLocalStorage = async (keyId: string, value: string): Promise<string | null> => {
  const key = await getOrCreateKey(keyId);

  if (!key || typeof crypto === 'undefined') {
    return null;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(value),
  );

  return JSON.stringify({
    iv: toBase64(iv),
    payload: toBase64(new Uint8Array(payload)),
  });
};

export const decryptFromLocalStorage = async (keyId: string, value: string | null): Promise<string | null> => {
  if (!value) {
    return null;
  }

  const key = await getOrCreateKey(keyId);

  if (!key) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { iv?: string; payload?: string };

    if (!parsed.iv || !parsed.payload) {
      return null;
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(parsed.iv)) },
      key,
      toArrayBuffer(fromBase64(parsed.payload)),
    );

    return textDecoder.decode(decrypted);
  } catch {
    return null;
  }
};
