// Deliberately no `server-only` guard: the maintenance scripts in scripts/
// reuse these helpers outside the Next.js runtime. Importing node:crypto
// already makes this module unusable in a client bundle.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/*
 * Password hashing with scrypt from node:crypto — memory-hard, in the standard
 * library, so no native bcrypt/argon2 dependency is needed. Stored format is
 * `scrypt:<salt-hex>:<hash-hex>`; the scheme prefix leaves room to migrate to a
 * different algorithm later without ambiguity.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  // Constant-time compare so a wrong password can't be narrowed down by timing.
  return timingSafeEqual(derived, expected);
}
