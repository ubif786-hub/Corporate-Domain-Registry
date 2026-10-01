// Money and dates the way the owners read them: the currency code always shown (USD and CAD share
// the dollar sign), times in the viewer's own time zone.

const moneyFormats = new Map<string, Intl.NumberFormat>();

export function money(cents: number | null | undefined, currency: string): string {
  if (cents === null || cents === undefined) return "";
  const code = currency.toUpperCase();
  let f = moneyFormats.get(code);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 });
    moneyFormats.set(code, f);
  }
  return `${f.format(cents / 100)} ${code}`;
}

const dateTime = new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short", year: "numeric" });
const dayMonth = new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short" });

export const when = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : "");

const stampThisYear = new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const stampOtherYear = new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short", year: "numeric" });
/** "Oct 2, 2:36 a.m." this year, "Oct 2, 2025" before: for narrow time columns. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? stampThisYear.format(d) : stampOtherYear.format(d);
}
export const day = (iso: string | null | undefined) => (iso ? dateOnly.format(new Date(iso)) : "");
export const shortDay = (iso: string) => dayMonth.format(new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")));

/** "4 minutes ago", "yesterday", or the date once it is more than a week old. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return day(iso);
}

export const years = (n: number) => `${n} year${n === 1 ? "" : "s"}`;
export const plural = (n: number, one: string, many = one + "s") => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const COUNTRY = new Intl.DisplayNames(["en"], { type: "region" });
export function country(code: string | null | undefined): string {
  if (!code) return "";
  try { return COUNTRY.of(code.toUpperCase()) ?? code; } catch { return code; }
}

/** The search part of the current URL as an object, for pages that keep their filters there. */
export function readQuery(): URLSearchParams {
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
}
