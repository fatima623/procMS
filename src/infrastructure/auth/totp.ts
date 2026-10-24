import { createHmac, randomBytes } from 'node:crypto';

/**
 * Zero-dependency TOTP (RFC 6238 / RFC 4226) + base32 helpers.
 *
 * - 160-bit secrets (20 bytes) encoded as Base32.
 * - SHA-1, 6-digit codes, 30-second step — the Google-Authenticator default
 *   every popular authenticator app understands.
 * - `verify()` accepts a one-step window on either side (±30 s) so clock
 *   skew between the server and the user's phone doesn't cause false
 *   rejections.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(bytes = 20): string {
  return bytes2base32(randomBytes(bytes));
}

export function totpUri(opts: { secretBase32: string; label: string; issuer: string }): string {
  const encodedLabel = encodeURIComponent(opts.label);
  const encodedIssuer = encodeURIComponent(opts.issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${opts.secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/** Compute a TOTP code for the given secret + timestamp (ms since epoch). */
export function totp(secretBase32: string, timestampMs: number = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / 30);
  return hotp(secretBase32, counter);
}

export function verifyTotp(secretBase32: string, candidate: string, timestampMs: number = Date.now()): boolean {
  const normalised = (candidate ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalised)) return false;
  const counter = Math.floor(timestampMs / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    if (constantTimeEqual(hotp(secretBase32, counter + offset), normalised)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

function hotp(secretBase32: string, counter: number): string {
  const key = base322bytes(secretBase32);
  const buf = Buffer.alloc(8);
  // Node Buffer doesn't have a direct writeBigUInt64BE for safety on all
  // runtimes, but counter is small enough to serialise as a 64-bit value.
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function bytes2base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
}

function base322bytes(secret: string): Buffer {
  const upper = secret.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of upper) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid Base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
