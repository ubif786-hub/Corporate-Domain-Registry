// The domain field's helpers. The lookups themselves are live, through the API: the search asks
// GET /api/domain-check/, the whois GET /api/whois/, the renewal page GET /api/renew-check/.

/** Lower-cases, trims, strips a scheme or path, so "HTTPS://Example.com/" looks up "example.com". */
export function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

export function isPlausibleDomain(domain: string): boolean {
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{2,63})+$/.test(domain);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
