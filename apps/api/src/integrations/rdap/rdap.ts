// A domain's public record over RDAP (the successor to whois): the registry's record, merged with
// the registrar's record it links to. Redacted values are dropped; a 404 means not registered.

const BOOTSTRAP = "https://data.iana.org/rdap/dns.json";
const DAY_MS = 86_400_000;

let servers: { at: number; byTld: Map<string, string> } | null = null;

/** The RDAP base URL for an extension, null when it has none, undefined when IANA is unreachable. */
async function serverFor(tld: string): Promise<string | null | undefined> {
  if (!servers || Date.now() - servers.at > DAY_MS) {
    try {
      const res = await fetch(BOOTSTRAP, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return servers?.byTld.get(tld) ?? (servers ? null : undefined);
      const data = (await res.json()) as { services?: [string[], string[]][] };
      const byTld = new Map<string, string>();
      for (const [tlds, urls] of data.services ?? []) {
        const url = urls.find((u) => u.startsWith("https://")) ?? urls[0];
        if (url) for (const t of tlds) byTld.set(t.toLowerCase(), url.endsWith("/") ? url : url + "/");
      }
      servers = { at: Date.now(), byTld };
    } catch {
      if (!servers) return undefined;
    }
  }
  return servers.byTld.get(tld) ?? null;
}

export interface RdapContact {
  name: string | null;
  org: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  /** A web form that forwards a message to the contact, when the registrar offers one. */
  contact_url: string | null;
}

export interface RdapRecord {
  /** The registry's own ID for the domain ("2932270036_DOMAIN_COM-VRSN"). */
  registry_domain_id: string | null;
  registrar: string | null;
  /** The registrar's port-43 whois server ("whois.godaddy.com"). */
  registrar_whois: string | null;
  registrar_iana_id: string | null;
  registrar_url: string | null;
  abuse_email: string | null;
  abuse_phone: string | null;
  /** The owner and the admin and tech contacts as published; null when nothing about one is public. */
  registrant: RdapContact | null;
  admin: RdapContact | null;
  tech: RdapContact | null;
  created_at: string | null;
  updated_at: string | null;
  /** The registry's expiry date. */
  expires_at: string | null;
  /** The registrar's own expiry date ("Registrar Registration Expiration Date"). */
  registrar_expires_at: string | null;
  /** When the record itself was last refreshed ("Last update of whois database"). */
  record_updated_at: string | null;
  /** ICANN's form for reporting wrong whois data, from the record's notices. */
  complaint_url: string | null;
  statuses: string[];
  nameservers: string[];
  /** DNSSEC: true signed, false not signed, null not stated. */
  dnssec: boolean | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

// Placeholders for hidden values (privacy-service names like "Domains By Proxy" are real and stay).
const HIDDEN = /redact|withheld|not disclosed|data protected|mask|gdpr|non-public|please query/i;

/** A published value, or null when it is empty or a redaction placeholder. */
function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/^(tel|mailto):/i, "").trim();
  return s && !HIDDEN.test(s) ? s : null;
}

const countryName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (cc: string) => names.of(cc.toUpperCase()) ?? cc.toUpperCase();
  } catch {
    return (cc: string) => cc.toUpperCase();
  }
})();

/** Every entity in the object, nested ones included (the abuse contact sits inside the registrar). */
function entities(d: Json): Json[] {
  const out: Json[] = [];
  const walk = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const e of list) { out.push(e); walk(e?.entities); }
  };
  walk(d?.entities);
  return out;
}

const withRole = (d: Json, role: string): Json | undefined =>
  entities(d).find((e) => Array.isArray(e?.roles) && e.roles.includes(role));

function vcard(e: Json, name: string): Json[] | undefined {
  const fields: Json[] = Array.isArray(e?.vcardArray?.[1]) ? e.vcardArray[1] : [];
  return fields.find((f) => Array.isArray(f) && f[0] === name);
}

/** "Street, City, Region, Postcode, Country" from a vCard adr, the hidden parts left out. */
function address(e: Json): string | null {
  const f = vcard(e, "adr");
  if (!f) return null;
  const parts: unknown[] = Array.isArray(f[3]) ? f[3] : [];
  const flat = (p: unknown): string[] => (Array.isArray(p) ? p.flatMap(flat) : [clean(p)].filter((x): x is string => !!x));
  const lines = [...flat(parts[2]), ...flat(parts[3]), ...flat(parts[4]), ...flat(parts[5])];
  const cc = typeof f[1]?.cc === "string" ? f[1].cc : null;
  const country = cc ? countryName(cc) : flat(parts[6])[0] ?? null;
  if (country) lines.push(country);
  return lines.length ? lines.join(", ") : null;
}

function contact(e: Json | undefined): RdapContact | null {
  if (!e) return null;
  const c: RdapContact = {
    name: clean(vcard(e, "fn")?.[3]),
    org: clean(vcard(e, "org")?.[3]),
    address: address(e),
    email: clean(vcard(e, "email")?.[3]),
    phone: clean(vcard(e, "tel")?.[3]),
    contact_url: httpUrl(vcard(e, "contact-uri")?.[3]),
  };
  return Object.values(c).some(Boolean) ? c : null;
}

function httpUrl(v: unknown): string | null {
  const s = clean(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
}

/** The registrar's website: its "about" link, or the vCard url. RDAP server addresses are not websites. */
function website(e: Json | undefined): string | null {
  if (!e) return null;
  const about = (Array.isArray(e.links) ? e.links : []).find((l: Json) => l?.rel === "about")?.href;
  for (const u of [about, vcard(e, "url")?.[3]]) {
    const s = clean(u);
    if (s && /^https?:\/\//i.test(s) && !/rdap/i.test(s)) return s;
  }
  return null;
}

/** The fields the whois page shows, out of one RDAP domain object. */
export function parseRdap(d: Json): RdapRecord {
  const event = (...actions: string[]): string | null => {
    const e = (Array.isArray(d?.events) ? d.events : []).find((x: Json) => actions.includes(x?.eventAction));
    const t = e ? Date.parse(e.eventDate) : NaN;
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  };
  const registrar = withRole(d, "registrar");
  const abuse = contact(withRole(d, "abuse"));
  const iana = (Array.isArray(registrar?.publicIds) ? registrar.publicIds : []).find((p: Json) => /iana/i.test(p?.type ?? ""));
  const signed = d?.secureDNS?.delegationSigned;
  return {
    registry_domain_id: clean(d?.handle),
    registrar: clean(vcard(registrar, "fn")?.[3]) ?? clean(vcard(registrar, "org")?.[3]),
    registrar_whois: clean(d?.port43),
    registrar_iana_id: clean(String(iana?.identifier ?? "")),
    registrar_url: website(registrar),
    abuse_email: abuse?.email ?? null,
    abuse_phone: abuse?.phone ?? null,
    registrant: contact(withRole(d, "registrant")),
    admin: contact(withRole(d, "administrative")),
    tech: contact(withRole(d, "technical")),
    created_at: event("registration"),
    updated_at: event("last changed"),
    expires_at: event("expiration", "registrar expiration"),
    registrar_expires_at: event("registrar expiration"),
    record_updated_at: event("last update of RDAP database"),
    complaint_url: httpUrl((Array.isArray(d?.notices) ? d.notices : []).find((n: Json) => /inaccura/i.test(n?.title ?? ""))?.links?.[0]?.href),
    statuses: (Array.isArray(d?.status) ? d.status : []).filter((s: unknown) => typeof s === "string"),
    nameservers: (Array.isArray(d?.nameservers) ? d.nameservers : [])
      .map((n: Json) => (typeof n?.ldhName === "string" ? n.ldhName.toLowerCase() : ""))
      .filter(Boolean),
    dnssec: typeof signed === "boolean" ? signed : null,
  };
}

/** Registry wins on dates, status and registrar name; the registrar on contacts and its own details. */
export function mergeRdap(registry: RdapRecord, registrar: RdapRecord | null): RdapRecord {
  if (!registrar) return registry;
  return {
    registry_domain_id: registry.registry_domain_id ?? registrar.registry_domain_id,
    registrar: registry.registrar ?? registrar.registrar,
    registrar_whois: registrar.registrar_whois ?? registry.registrar_whois,
    registrar_iana_id: registry.registrar_iana_id ?? registrar.registrar_iana_id,
    registrar_url: registrar.registrar_url ?? registry.registrar_url,
    abuse_email: registrar.abuse_email ?? registry.abuse_email,
    abuse_phone: registrar.abuse_phone ?? registry.abuse_phone,
    registrant: registrar.registrant ?? registry.registrant,
    admin: registrar.admin ?? registry.admin,
    tech: registrar.tech ?? registry.tech,
    created_at: registry.created_at ?? registrar.created_at,
    updated_at: registry.updated_at ?? registrar.updated_at,
    expires_at: registry.expires_at ?? registrar.expires_at,
    registrar_expires_at: registrar.registrar_expires_at ?? registry.registrar_expires_at,
    record_updated_at: registrar.record_updated_at ?? registry.record_updated_at,
    complaint_url: registrar.complaint_url ?? registry.complaint_url,
    statuses: registry.statuses.length ? registry.statuses : registrar.statuses,
    nameservers: registry.nameservers.length ? registry.nameservers : registrar.nameservers,
    dnssec: registry.dnssec ?? registrar.dnssec,
  };
}

/** The registrar's record URL from the registry's "related" link: https, a public host name. */
export function registrarLink(d: Json): string | null {
  for (const l of Array.isArray(d?.links) ? d.links : []) {
    if (l?.rel !== "related" || typeof l.href !== "string") continue;
    try {
      const u = new URL(l.href);
      const host = u.hostname;
      // Public https hosts only: this server fetches it.
      if (u.protocol !== "https:" || !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host === "localhost") continue;
      if (/\/domain\//i.test(u.pathname)) return u.toString();
    } catch { /* not a URL */ }
  }
  return null;
}

async function getJson(url: string, ms: number): Promise<{ status: number; body?: Json }> {
  const res = await fetch(url, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.timeout(ms) });
  return res.ok ? { status: res.status, body: await res.json() } : { status: res.status };
}

export type RdapResult =
  | { status: "registered"; record: RdapRecord }
  | { status: "available" | "unsupported" | "error" };

// Complete answers cached 10 min (registrars rate-limit). ponytail: in-process, 1000 entries max.
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; result: RdapResult }>();

// Registrar servers that never answer (GoDaddy blocks cloud IPs) are skipped for 30 min.
const SKIP_MS = 30 * 60_000;
const skipUntil = new Map<string, number>();

export async function rdapDomain(domain: string): Promise<RdapResult> {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  const { result, complete } = await lookup(domain);
  if (complete) {
    cache.delete(domain);
    cache.set(domain, { at: Date.now(), result });
    if (cache.size > 1000) cache.delete(cache.keys().next().value as string);
  }
  return result;
}

async function lookup(domain: string): Promise<{ result: RdapResult; complete: boolean }> {
  const done = (result: RdapResult, complete = true) => ({ result, complete });
  const base = await serverFor(domain.slice(domain.lastIndexOf(".") + 1));
  if (base === undefined) return done({ status: "error" }, false);
  if (base === null) return done({ status: "unsupported" });
  let registry: Json;
  try {
    const r = await getJson(base + "domain/" + encodeURIComponent(domain), 10_000);
    if (r.status === 404) return done({ status: "available" });
    if (!r.body) return done({ status: "error" }, false);
    registry = r.body;
  } catch {
    return done({ status: "error" }, false);
  }
  let registrar: RdapRecord | null = null;
  const link = registrarLink(registry);
  const host = link ? new URL(link).hostname : "";
  if (link && (skipUntil.get(host) ?? 0) <= Date.now()) {
    try {
      const r = await getJson(link, 6_000);
      if (r.body) registrar = parseRdap(r.body);
    } catch {
      skipUntil.set(host, Date.now() + SKIP_MS); // no answer: the registry's record alone for a while
    }
  }
  return done({ status: "registered", record: mergeRdap(parseRdap(registry), registrar) }, !link || registrar !== null);
}
