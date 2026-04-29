import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateDeviceKey, exportKey, importKey } from '../../src/core/crypto';

describe('Encryption roundtrip', () => {
  it('encrypts and decrypts data correctly', async () => {
    const key = await generateDeviceKey();
    const data = new TextEncoder().encode('Hello CareBinder patient data').buffer as ArrayBuffer;
    const { iv, ciphertext } = await encrypt(data, key);
    const decrypted = await decrypt(iv, ciphertext, key);
    const text = new TextDecoder().decode(decrypted);
    expect(text).toBe('Hello CareBinder patient data');
  });

  it('produces different ciphertext for same data', async () => {
    const key = await generateDeviceKey();
    const data = new TextEncoder().encode('test').buffer as ArrayBuffer;
    const r1 = await encrypt(data, key);
    const r2 = await encrypt(data, key);
    expect(r1.iv).not.toEqual(r2.iv);
  });

  it('can export and import keys', async () => {
    const key1 = await generateDeviceKey();
    const raw = await exportKey(key1);
    const key2 = await importKey(raw);
    const data = new TextEncoder().encode('roundtrip').buffer as ArrayBuffer;
    const { iv, ciphertext } = await encrypt(data, key1);
    const dec = await decrypt(iv, ciphertext, key2);
    expect(new TextDecoder().decode(dec)).toBe('roundtrip');
  });

  it('fails to decrypt with wrong key', async () => {
    const key1 = await generateDeviceKey();
    const key2 = await generateDeviceKey();
    const data = new TextEncoder().encode('secret').buffer as ArrayBuffer;
    const { iv, ciphertext } = await encrypt(data, key1);
    await expect(decrypt(iv, ciphertext, key2)).rejects.toThrow();
  });
});
