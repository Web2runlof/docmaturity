/**
 * Exportaciones cifradas opcionales con Web Crypto API.
 * AES-GCM (256 bits) con IV aleatorio de 96 bits por archivo y clave derivada con PBKDF2-SHA-256
 * y salt aleatorio de 128 bits. No se implementan algoritmos propios ni se guardan contraseñas.
 * La protección de un archivo exportado no implica que IndexedDB esté cifrado.
 */
import { encryptedPackageSchema, type EncryptedPackage } from '@/schemas/packages';

export const PBKDF2_ITERATIONS = 310_000;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plain: string, password: string, payloadFormat: string): Promise<EncryptedPackage> {
  if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.');
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, new TextEncoder().encode(plain));
  return {
    format: 'docmaturity.encrypted',
    version: 1,
    payloadFormat,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: toB64(salt) },
    cipher: { name: 'AES-GCM', iv: toB64(iv), tagLength: 128 },
    ciphertext: toB64(ct),
  };
}

export class WrongPasswordError extends Error {
  constructor() {
    super('No fue posible descifrar el archivo: la contraseña es incorrecta o el contenido fue alterado.');
  }
}

export async function decryptPackage(pkg: unknown, password: string): Promise<string> {
  const p = encryptedPackageSchema.parse(pkg);
  const key = await deriveKey(password, fromB64(p.kdf.salt), p.kdf.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(p.cipher.iv), tagLength: 128 }, key, fromB64(p.ciphertext));
    return new TextDecoder().decode(plain);
  } catch {
    throw new WrongPasswordError();
  }
}

export const isEncryptedPackage = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && (v as { format?: unknown }).format === 'docmaturity.encrypted';
