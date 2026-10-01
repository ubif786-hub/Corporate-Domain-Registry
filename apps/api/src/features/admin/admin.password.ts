// Password hashing with scrypt (node:crypto, no dependency).
//
// Parameters from the OWASP password storage list: N=2^15, r=8, p=3. That is 32 MB and roughly
// 100 ms per hash on the droplet, which is slow for a guesser and invisible to a person signing
// in. The parameters are stored with each hash, so raising them later only affects new hashes.

import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 32768;
const R = 8;
const P = 3;
const KEY_LENGTH = 32;

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 };
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, key] = stored.split("$");
  if (kind !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64url");
  const got = await scrypt(password, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return got.length === want.length && timingSafeEqual(got, want);
}

/** A hash nobody's password matches, verified against when the email is unknown, so a wrong
 *  email takes as long as a wrong password and the timing cannot tell which emails exist. */
let decoy: Promise<string> | null = null;
export async function burnDecoy(password: string): Promise<void> {
  decoy ??= hashPassword(randomBytes(24).toString("hex"));
  await verifyPassword(password, await decoy);
}

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 200;

/** Plain-English reason the password cannot be used, or null. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (new Set(password).size < 5) return "Use more different characters.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) return "Do not use your email address in the password.";
  if (/^(password|corporate|domain|registry|admin|qwerty|12345)/i.test(password)) return "Choose something less guessable.";
  return null;
}
