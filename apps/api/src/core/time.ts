// Timestamps in the order records keep the format the PHP version wrote ("2026-10-01T12:00:00+00:00"),
// so records from either version read the same on the admin page and in the CSV.

export function isoNow(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** "2026-10-01 12:00:00", for log lines. */
export function logStamp(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** "20261001", the first half of an order id. */
export function dayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

/** Seconds since the epoch for an ISO date, or null. */
export function toUnix(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
