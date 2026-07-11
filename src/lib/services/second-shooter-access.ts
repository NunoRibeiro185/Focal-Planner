/**
 * Pure crypto utilities for second shooter access control.
 *
 * No database dependency — all functions are synchronous or use
 * Node's built-in `crypto` module. Designed to be fully testable
 * in isolation without mocking.
 *
 * Password hashing: scrypt (Node crypto) with a random salt.
 * Session tokens: HMAC-SHA256 signed payload with expiry embedded.
 */

import { scrypt, randomBytes, createHmac, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ─── Config ───────────────────────────────────────────────────

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): string {
  const secret = process.env.SECOND_SHOOTER_SESSION_SECRET;
  if (secret) return secret;
  // Fail closed in production: a predictable fallback secret would make
  // session tokens forgeable by anyone who reads the source.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SECOND_SHOOTER_SESSION_SECRET is not set");
  }
  return "dev-secret-change-in-production";
}

// ─── Password hashing ─────────────────────────────────────────

/**
 * Hashes a plaintext password using scrypt with a random salt.
 * Returns a string in the format `salt:hash` (both hex-encoded).
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(plain, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored `salt:hash` string.
 * Uses a timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const separatorIndex = stored.indexOf(":");
  if (separatorIndex === -1) return false;

  const salt = stored.slice(0, separatorIndex);
  const hashHex = stored.slice(separatorIndex + 1);

  try {
    const storedBuf = Buffer.from(hashHex, "hex");
    const derivedBuf = (await scryptAsync(plain, salt, SCRYPT_KEYLEN)) as Buffer;
    if (storedBuf.length !== derivedBuf.length) return false;
    return timingSafeEqual(storedBuf, derivedBuf);
  } catch {
    return false;
  }
}

// ─── Session tokens ───────────────────────────────────────────

/**
 * Creates a signed session token containing the booking ID and an expiry.
 * Format (before base64url encoding): `bookingId.expiry.hmac`
 */
export function createSessionToken(bookingId: string): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${bookingId}.${expiry}`;
  const sig = createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/**
 * Verifies a session token and returns the booking ID if valid.
 * Returns null if the token is tampered, expired, or malformed.
 */
export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");

    // payload is everything up to the last dot; sig is after it
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;

    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);

    const expectedSig = createHmac("sha256", getSessionSecret())
      .update(payload)
      .digest("hex");

    // Timing-safe comparison (pad to same length to avoid length leaks)
    const sigBuf = Buffer.from(sig.padEnd(expectedSig.length, " "));
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    // Validate structure: bookingId.expiry
    const dotIndex = payload.indexOf(".");
    if (dotIndex === -1) return null;

    const bookingId = payload.slice(0, dotIndex);
    const expiry = Number(payload.slice(dotIndex + 1));

    if (!bookingId || isNaN(expiry)) return null;
    if (Date.now() > expiry) return null;

    return bookingId;
  } catch {
    return null;
  }
}
