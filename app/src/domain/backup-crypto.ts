// Backup protegido por senha: PBKDF2-SHA256 + AES-GCM, tudo local (WebCrypto).
// O formato do envelope é o mesmo do app antigo, para os arquivos já exportados abrirem aqui.

export const MIN_PBKDF2_ITERATIONS = 100_000;
export const DEFAULT_PBKDF2_ITERATIONS = 310_000; // mesmo valor do app antigo

export interface EncryptedBackup {
  app: 'treino-personalizado';
  backupVersion: 2;
  encrypted: true;
  appVersion: string;
  exportedAt: string | undefined;
  algorithm: 'AES-GCM';
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number };
  salt: string;
  iv: string;
  ciphertext: string;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

export function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), char => char.charCodeAt(0));
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('Criptografia indisponível');
  return globalThis.crypto.subtle;
}

async function keyFromPassword(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(backup: { exportedAt?: string }, password: string, appVersion: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromPassword(password, salt, iterations);
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(backup)));
  return {
    app: 'treino-personalizado', backupVersion: 2, encrypted: true, appVersion, exportedAt: backup.exportedAt,
    algorithm: 'AES-GCM', kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations },
    salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackup {
  return typeof value === 'object' && value !== null && (value as { encrypted?: unknown }).encrypted === true;
}

/** Abre um backup protegido. Senha errada ou arquivo alterado: rejeita (AES-GCM autentica). */
export async function decryptBackup(wrapper: EncryptedBackup, password: string): Promise<unknown> {
  const { kdf } = wrapper;
  if (wrapper.algorithm !== 'AES-GCM' || kdf?.name !== 'PBKDF2' || kdf.hash !== 'SHA-256'
    || !Number.isInteger(kdf.iterations) || kdf.iterations < MIN_PBKDF2_ITERATIONS) {
    throw new Error('Formato de criptografia inválido');
  }
  const key = await keyFromPassword(password, base64ToBytes(wrapper.salt), kdf.iterations);
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: base64ToBytes(wrapper.iv) }, key, base64ToBytes(wrapper.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
