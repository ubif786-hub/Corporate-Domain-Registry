// A domain's public record over RDAP (the successor to whois): the registry's record, merged with
// the registrar's record it links to. Redacted values are dropped; a 404 means not registered.

import { mergeRdap, parseRdap, registrarLink, type RdapRecord } from "@cdr/shared";
import { tryConfig } from "../../core/config";

const DAY_MS = 86_400_000;

let servers: { at: number; byTld: Map<string, string> } | null = null;

/** The RDAP base URL for an extension, null when it has none, undefined when IANA is unreachable. */
async function serverFor(tld: string): Promise<string | null | undefined> {
  if (!servers || Date.now() - servers.at > DAY_MS) {
    try {
      const res = await fetch(tryConfig()?.rdapBootstrap ?? "https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(10_000) });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function getJson(url: string, ms: number): Promise<{ status: number; body?: Json }> {
  const res = await fetch(url, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.timeout(ms) });
  return res.ok ? { status: res.status, body: await res.json() } : { status: res.status };
}

export type RdapResult =
  | { status: "registered"; record: RdapRecord & { registrar_record_url: string | null } }
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
  // Without the registrar's half, the page asks for it from the visitor's browser instead.
  const record = { ...mergeRdap(parseRdap(registry), registrar), registrar_record_url: link && !registrar ? link : null };
  return done({ status: "registered", record }, !link || registrar !== null);
}
