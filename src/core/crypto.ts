const ALGO = 'AES-GCM';
const KEY_LEN = 256;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;

export async function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGO, length: KEY_LEN },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: ALGO, length: KEY_LEN },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(data: ArrayBuffer, key: CryptoKey): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv: iv as unknown as BufferSource }, key, data);
  return { iv, ciphertext };
}

export async function decrypt(iv: Uint8Array, ciphertext: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: ALGO, iv: iv as unknown as BufferSource }, key, ciphertext);
}

export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

export async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: ALGO, length: KEY_LEN }, true, ['encrypt', 'decrypt']);
}

let _cachedKey: CryptoKey | null = null;

export async function getDeviceKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;
  const stored = localStorage.getItem('cb_dk');
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    _cachedKey = await importKey(raw.buffer as ArrayBuffer);
    return _cachedKey;
  }
  const key = await generateDeviceKey();
  const raw = await exportKey(key);
  localStorage.setItem('cb_dk', btoa(String.fromCharCode(...new Uint8Array(raw))));
  _cachedKey = key;
  return key;
}

export function clearCachedKey() {
  _cachedKey = null;
  localStorage.removeItem('cb_dk');
}

export async function encryptBlob(data: ArrayBuffer): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const key = await getDeviceKey();
  return encrypt(data, key);
}

export async function decryptBlob(iv: Uint8Array, ciphertext: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await getDeviceKey();
  return decrypt(iv, ciphertext, key);
}
