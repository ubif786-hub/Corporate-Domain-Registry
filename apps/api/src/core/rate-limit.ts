// A small per-visitor rate limit, in memory (one API process serves the site).
// OpenSRS agreement 3.2: lookups may be rate-limited and bulk use may be charged, so one visitor
// gets 30 searches a minute. Checkout and the admin sign-in have their own buckets.

import { createHash } from "node:crypto";

const hits = new Map<string, number[]>();

const keyOf = (bucket: string, who: string) => bucket + ":" + createHash("sha256").update(who).digest("hex").slice(0, 16);

function recentHits(key: string, windowSeconds: number): number[] {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => t > now - windowSeconds * 1000);
  hits.set(key, recent);
  return recent;
}

/** Counts this request and answers true once `max` were seen in the window (the request is then
 *  not counted). */
export function rateLimited(bucket: string, ip: string | null, max: number, windowSeconds: number): boolean {
  if (!ip) return false;
  const recent = recentHits(keyOf(bucket, ip), windowSeconds);
  const limited = recent.length >= max;
  if (!limited) recent.push(Date.now());
  return limited;
}

/** For limits on failures only (the admin sign-in per email): ask first, count a failure after. */
export function overLimit(bucket: string, who: string, max: number, windowSeconds: number): boolean {
  return recentHits(keyOf(bucket, who), windowSeconds).length >= max;
}

export function countFailure(bucket: string, who: string, windowSeconds: number): void {
  recentHits(keyOf(bucket, who), windowSeconds).push(Date.now());
}

// Forget visitors nobody has seen for a day.
setInterval(() => {
  const cutoff = Date.now() - 86_400_000;
  for (const [k, v] of hits) if (!v.length || v[v.length - 1] < cutoff) hits.delete(k);
}, 3_600_000).unref();
