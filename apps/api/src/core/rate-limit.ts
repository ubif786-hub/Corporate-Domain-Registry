// A small per-visitor rate limit, in memory (one API process serves the site).
// OpenSRS agreement 3.2: lookups may be rate-limited and bulk use may be charged, so one visitor
// gets 30 searches a minute. Checkout and the admin sign-in have their own buckets.

import { createHash } from "node:crypto";

const hits = new Map<string, number[]>();

export function rateLimited(bucket: string, ip: string | null, max: number, windowSeconds: number): boolean {
  if (!ip) return false;
  const key = bucket + ":" + createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => t > now - windowSeconds * 1000);
  const limited = recent.length >= max;
  if (!limited) recent.push(now);
  hits.set(key, recent);
  return limited;
}

// Forget visitors nobody has seen for a day.
setInterval(() => {
  const cutoff = Date.now() - 86_400_000;
  for (const [k, v] of hits) if (!v.length || v[v.length - 1] < cutoff) hits.delete(k);
}, 3_600_000).unref();
