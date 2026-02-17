/**
 * Key-rotation wrapper for AES-256-GCM encryption.
 *
 * Format: "v1$<base64-ciphertext>"
 *
 * - encryptVersioned(plaintext) always uses the CURRENT key (ENCRYPTION_KEY env).
 * - decryptVersioned(ciphertext) inspects the version prefix and loads the right key.
 *
 * To rotate keys:
 *  1. Set ENCRYPTION_KEY_v1 = old ENCRYPTION_KEY value
 *  2. Set ENCRYPTION_KEY = new 32-byte hex key
 *  3. Existing tokens still decrypt via v1 key; new tokens use the current key.
 *  4. Optionally run a background job to re-encrypt all tokens with the new key.
 */

import crypto from 'crypto';
import { encrypt, decrypt } from './crypto.util';
import { env } from '../config/env';

const CURRENT_VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt with version prefix: "v1$<base64-ciphertext>"
 */
export function encryptVersioned(plaintext: string): string {
  const ciphertext = encrypt(plaintext);
  return `${CURRENT_VERSION}$${ciphertext}`;
}

/**
 * Decrypt a versioned or unversioned ciphertext.
 * Falls back to ENCRYPTION_KEY for legacy unversioned blobs.
 */
export function decryptVersioned(versionedCiphertext: string): string {
  const dollarIdx = versionedCiphertext.indexOf('$');

  // No version prefix — legacy format: use ENCRYPTION_KEY directly
  if (dollarIdx === -1) {
    return decrypt(versionedCiphertext);
  }

  const version = versionedCiphertext.slice(0, dollarIdx);
  const ciphertext = versionedCiphertext.slice(dollarIdx + 1);

  // Try versioned key env var (e.g., ENCRYPTION_KEY_v1)
  const versionedKey = (env as unknown as Record<string, string | undefined>)[`ENCRYPTION_KEY_${version}`];
  if (versionedKey) {
    return decryptWithRawKey(ciphertext, versionedKey);
  }

  // Fall back to primary ENCRYPTION_KEY (handles current version)
  return decrypt(ciphertext);
}

/**
 * Decrypt using a specific raw hex key (for key rotation support).
 */
function decryptWithRawKey(encryptedBase64: string, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  const packed = Buffer.from(encryptedBase64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}
