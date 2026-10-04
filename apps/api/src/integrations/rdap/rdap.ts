// The registries' public records over RDAP, the successor to whois (RFC 9082/9083). IANA's
// bootstrap file names the RDAP server of each extension; it is read once a day. A registry that
// answers 404 has no record: the domain is not registered.

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

export interface RdapRecord {
  registrar: string | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  statuses: string[];
  nameservers: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/** The fields the whois page shows, out of an RDAP domain object. */
export function parseRdap(d: Json): RdapRecord {
  const event = (action: string): string | null => {
    const e = (Array.isArray(d?.events) ? d.events : []).find((x: Json) => x?.eventAction === action);
    const t = e ? Date.parse(e.eventDate) : NaN;
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  };
  const registrarEntity = (Array.isArray(d?.entities) ? d.entities : []).find((e: Json) => Array.isArray(e?.roles) && e.roles.includes("registrar"));
  const vcard: Json[] = Array.isArray(registrarEntity?.vcardArray?.[1]) ? registrarEntity.vcardArray[1] : [];
  const fn = vcard.find((f) => Array.isArray(f) && f[0] === "fn");
  return {
    registrar: typeof fn?.[3] === "string" && fn[3].trim() ? fn[3].trim() : null,
    created_at: event("registration"),
    updated_at: event("last changed"),
    expires_at: event("expiration"),
    statuses: (Array.isArray(d?.status) ? d.status : []).filter((s: unknown) => typeof s === "string"),
    nameservers: (Array.isArray(d?.nameservers) ? d.nameservers : [])
      .map((n: Json) => (typeof n?.ldhName === "string" ? n.ldhName.toLowerCase() : ""))
      .filter(Boolean),
  };
}

export type RdapResult =
  | { status: "registered"; record: RdapRecord }
  | { status: "available" | "unsupported" | "error" };

export async function rdapDomain(domain: string): Promise<RdapResult> {
  const base = await serverFor(domain.slice(domain.lastIndexOf(".") + 1));
  if (base === undefined) return { status: "error" };
  if (base === null) return { status: "unsupported" };
  try {
    const res = await fetch(base + "domain/" + encodeURIComponent(domain), {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return { status: "available" };
    if (!res.ok) return { status: "error" };
    return { status: "registered", record: parseRdap(await res.json()) };
  } catch {
    return { status: "error" };
  }
}
