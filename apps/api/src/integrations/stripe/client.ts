// Stripe over its REST API with fetch: form-encoded requests, a pinned API version, idempotency
// keys on every write. No SDK, so the calls stay exactly the ones the tests prove against a
// stand-in (STRIPE_API points there locally).

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../core/config";

type FormValue = string | number | boolean | null | undefined | FormValue[] | { [k: string]: FormValue };

/** PHP's http_build_query: { a: { b: [1] } } -> "a%5Bb%5D%5B0%5D=1". Stripe reads nested keys
 *  this way. Null and undefined are left out. */
export function formEncode(value: Record<string, FormValue>): string {
  const pairs: string[] = [];
  const walk = (v: FormValue, key: string) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${key}[${i}]`)); return; }
    if (typeof v === "object") { for (const [k, x] of Object.entries(v)) walk(x, `${key}[${k}]`); return; }
    const s = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(s));
  };
  for (const [k, v] of Object.entries(value)) walk(v, k);
  return pairs.join("&");
}

export interface StripeReply {
  status: number;
  // Stripe objects are read field by field where they are used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

export async function stripe(method: "GET" | "POST", path: string, params: Record<string, FormValue> = {}, idempotencyKey?: string): Promise<StripeReply> {
  const c = config();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${c.stripeSecretKey}`,
    "Stripe-Version": "2024-06-20",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = formEncode(params);
  }
  try {
    const res = await fetch(c.stripeApi + path, { method, headers, body, signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, body: parsed };
  } catch (e) {
    console.error(`[stripe] ${method} ${path.split("/").slice(0, 2).join("/")} failed:`, e instanceof Error ? e.name : e);
    return { status: 0, body: null };
  }
}

/** Verifies a Stripe-Signature header: HMAC-SHA256 of "timestamp.payload" with the endpoint's
 *  signing secret, compared in constant time, and refused if older than five minutes so a
 *  captured delivery cannot be replayed. */
export function signatureOk(payload: Buffer, header: string | undefined, secret: string, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  let t: string | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    if (k === "v1") sigs.push(v);
  }
  if (!t || !/^\d+$/.test(t) || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(t + ".").update(payload).digest("hex"));
  return sigs.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
