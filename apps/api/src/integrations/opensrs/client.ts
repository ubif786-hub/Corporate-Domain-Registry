// Tucows / OpenSRS over the XML API.
//
//   test (Horizon)  https://horizon.opensrs.net:55443     fake money, fake registrations
//   live            https://rr-n1-tor.opensrs.net:55443   real money; this server's IP must be on the
//                                                        account's IP Access Rules
//
// Every request is signed: X-Signature = md5(md5(xml + key) + key). The key comes from the settings
// file and is never logged, printed or stored anywhere else.
//
// ALWAYS BRANCH ON response_code. is_success is 1 for "domain taken" too, because the query itself
// succeeded (research/opensrs/lookup-domain.md).

import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { CheckoutRegistrant } from "@cdr/shared";
import { config } from "../../core/config";
import { sleep } from "../../core/time";
import { envelope, decode, type OpsData, type OpsValue } from "./xml";

export interface OpsResult {
  /** true when a readable reply came back; false on a timeout, a refused connection or an
   *  unreadable body (the command MAY still have run: see the fulfilment's "unknown" state) */
  transport: boolean;
  code: number;
  text: string;
  success: boolean;
  attributes: Record<string, OpsData>;
  /** a short transport error, never containing the key */
  error: string;
  http: number;
}

export function endpoint(): string {
  const c = config();
  if (c.opensrsUrl) return c.opensrsUrl;
  return c.opensrsEnv === "live" ? "https://rr-n1-tor.opensrs.net:55443" : "https://horizon.opensrs.net:55443";
}

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

const str = (v: OpsData | undefined): string => (typeof v === "string" ? v : "");
const obj = (v: OpsData | undefined): Record<string, OpsData> =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};
const list = (v: OpsData | undefined): OpsData[] =>
  Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

export async function call(
  action: string,
  attributes: Record<string, OpsValue>,
  object = "DOMAIN",
  timeoutSeconds = 25,
  extra: Record<string, OpsValue> = {},
): Promise<OpsResult> {
  const c = config();
  const xml = envelope(action, object, attributes, extra);
  const signature = md5(md5(xml + c.opensrsApiKey) + c.opensrsApiKey);
  const out: OpsResult = { transport: false, code: 0, text: "", success: false, attributes: {}, error: "", http: 0 };
  let raw: string;
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "text/xml", "X-Username": c.opensrsUsername, "X-Signature": signature },
      body: xml,
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
    out.http = res.status;
    raw = await res.text();
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    out.error = name === "TimeoutError" || name === "AbortError" ? "timeout" : "connection error";
    return out;
  }
  const reply = decode(raw);
  if (!reply || !("response_code" in reply)) {
    out.error = `unreadable reply (HTTP ${out.http})`;
    return out;
  }
  out.transport = true;
  out.code = parseInt(str(reply.response_code), 10) || 0;
  out.text = str(reply.response_text);
  out.success = !!str(reply.is_success) && str(reply.is_success) !== "0";
  out.attributes = obj(reply.attributes);
  return out;
}

export type LookupStatus = "available" | "taken" | "premium" | "error";

/**
 * Is the domain free to register?
 *   available  210, and not a registry premium name
 *   taken      211 or 221 (a waiting registration exists)
 *   premium    a registry premium name: priced by the registry, not sold here (plan D6)
 *   error      anything else, including no reply; the page offers a retry
 * 486 means a registration is being processed for the name somewhere; one retry settles it.
 */
export async function lookup(domain: string, noCache = false): Promise<{ status: LookupStatus; code: number; text: string }> {
  const attrs: Record<string, OpsValue> = { domain };
  if (noCache) attrs.no_cache = 1;
  let r = await call("LOOKUP", attrs, "DOMAIN", 15);
  if (r.code === 486) {
    await sleep(2000);
    r = await call("LOOKUP", attrs, "DOMAIN", 15);
  }
  const reason = str(r.attributes.reason);
  let status: LookupStatus;
  if (!r.transport) status = "error";
  else if (/premium/i.test(reason)) status = "premium";
  else if (r.code === 210) status = "available";
  else if (r.code === 211 || r.code === 221) status = "taken";
  else status = "error";
  return { status, code: r.code, text: r.text || r.error };
}

const TWO_DIGIT_CODES = new Set(["20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98"]);

/** "+14165550123" as OpenSRS wants it, "+1.4165550123". E.164 country codes are prefix-free:
 *  1 and 7 are one digit, the two-digit set above is fixed by the ITU, every other code has three. */
export function opsPhone(e164: string): string {
  const digits = e164.replace(/^\++/, "");
  if (!/^\d+$/.test(digits)) return e164;
  const len = digits[0] === "1" || digits[0] === "7" ? 1 : TWO_DIGIT_CODES.has(digits.slice(0, 2)) ? 2 : 3;
  return "+" + digits.slice(0, len) + "." + digits.slice(len);
}

/** The order's registrant as an OpenSRS contact. One contact is owner, admin and billing; the
 *  reseller's own tech contact is used (custom_tech_contact 0). */
export function opsContact(r: CheckoutRegistrant): Record<string, OpsValue> {
  const name = `${r.first_name} ${r.last_name}`.trim();
  const contact: Record<string, OpsValue> = {
    first_name: r.first_name,
    last_name: r.last_name,
    // OpenSRS asks for an organisation on every contact; a personal registration uses the name.
    org_name: r.org_name !== "" ? r.org_name : name,
    email: r.email,
    phone: opsPhone(r.phone),
    address1: r.address1,
    city: r.city,
    country: r.country,
    postal_code: r.postal_code,
  };
  if (r.address2 !== "") contact.address2 = r.address2;
  if (r.state !== "") contact.state = r.state;
  return contact;
}

/**
 * SW_REGISTER one domain, handle=process. The caller decides what a missing reply means; this
 * never retries, because a register that timed out may still have gone through (plan 8.2: never
 * retry sw_register after a timeout without checking first).
 */
export async function register(domain: string, period: number, registrant: CheckoutRegistrant, registrantIp: string): Promise<OpsResult & { regUsername: string }> {
  const c = config();
  const contact = opsContact(registrant);
  const attrs: Record<string, OpsValue> = {
    domain,
    reg_type: "new",
    period: Math.trunc(period),
    handle: "process",
    // A profile per domain. 3 to 20 letters and digits; 10 to 20 characters for the password.
    reg_username: "cdr" + randomBytes(8).toString("hex").slice(0, 14),
    reg_password: randomBytes(8).toString("hex"),
    auto_renew: 0,
    f_lock_domain: 1,
    f_whois_privacy: 0,
    custom_tech_contact: 0,
    contact_set: { owner: contact, admin: contact, billing: contact },
  };
  // CIRA's Canadian presence class (research/opensrs/tld.md, .CA).
  if (domain.endsWith(".ca")) attrs.registrant_extra_info = { legal_type: registrant.ca_legal_type ?? "" };
  if (c.opensrsNameservers.length >= 2) {
    attrs.custom_nameservers = 1;
    attrs.nameserver_list = c.opensrsNameservers.map((name, i) => ({ name, sortorder: i + 1 }));
  } else {
    // The account's default nameservers (Tucows panel, Account Settings).
    attrs.custom_nameservers = 0;
  }
  // Who is registering, for the registry's records: a top-level parameter, not an attribute.
  const extra: Record<string, OpsValue> = {};
  if (registrantIp && isIP(registrantIp)) extra.registrant_ip = registrantIp;
  const r = await call("SW_REGISTER", attrs, "DOMAIN", 60, extra);
  return { ...r, regUsername: String(attrs.reg_username) };
}

/**
 * SW_REGISTER reg_type=transfer: moves a domain held elsewhere into this account, with the code
 * from its current registrar (research/opensrs/sw_register-domain-or-trust_service-.md). A
 * transfer is always one year; extra years are a RENEW once it completes. The domain keeps its
 * nameservers, so the customer's website and email keep working. Never retried here, like register().
 */
export async function transfer(domain: string, authCode: string, registrant: CheckoutRegistrant, registrantIp: string): Promise<OpsResult> {
  const contact = opsContact(registrant);
  const attrs: Record<string, OpsValue> = {
    domain,
    reg_type: "transfer",
    auth_info: authCode,
    period: 1,
    handle: "process",
    reg_username: "cdr" + randomBytes(8).toString("hex").slice(0, 14),
    reg_password: randomBytes(8).toString("hex"),
    auto_renew: 0,
    f_lock_domain: 1,
    f_whois_privacy: 0,
    custom_tech_contact: 0,
    custom_nameservers: 0,
    custom_transfer_nameservers: 0,
    link_domains: 0,
    contact_set: { owner: contact, admin: contact, billing: contact },
  };
  // The .ca keeps the legal type it already has at CIRA (changing it needs change_contact).
  const extra: Record<string, OpsValue> = {};
  if (registrantIp && isIP(registrantIp)) extra.registrant_ip = registrantIp;
  return call("SW_REGISTER", attrs, "DOMAIN", 60, extra);
}

export type TransferState = "pending_owner" | "pending_admin" | "pending_registry" | "completed" | "cancelled" | "undef";

/** The latest transfer this account started for the domain (CHECK_TRANSFER with check_status=1,
 *  research/opensrs/check_transfer.md), with when it last changed, or null when Tucows could not be
 *  asked. Asking also makes Tucows finish a transfer the registry has approved within minutes. */
export async function transferStatus(domain: string): Promise<{ state: TransferState; at: number | null; reason: string } | null> {
  const r = await call("CHECK_TRANSFER", { domain, check_status: 1 }, "DOMAIN", 20);
  if (!r.transport || r.code !== 200) return null;
  const s = str(r.attributes.status).toLowerCase();
  const state: TransferState = ["pending_owner", "pending_admin", "pending_registry", "completed", "cancelled"].includes(s) ? (s as TransferState) : "undef";
  const at = parseInt(str(r.attributes.unixtime), 10);
  return { state, at: Number.isFinite(at) ? at : null, reason: str(r.attributes.reason) };
}

/** The state of an OpenSRS order: completed, pending, declined, cancelled, waiting... or null. */
export async function orderStatus(orderId: string): Promise<string | null> {
  const r = await call("GET_ORDER_INFO", { order_id: orderId }, "DOMAIN", 20);
  if (!r.transport || r.code !== 200) return null;
  const status = str(obj(r.attributes.field_hash).status);
  return status ? status.toLowerCase() : null;
}

export interface TucowsOrder { id: string; status: string; type: string; date: string }

/** Orders on this reseller account for a domain, newest first. Null when Tucows could not be asked. */
export async function ordersFor(domain: string): Promise<TucowsOrder[] | null> {
  const r = await call("GET_ORDERS_BY_DOMAIN", { domain, type: "new" }, "DOMAIN", 20);
  if (!r.transport || r.code !== 200) return null;
  const out: TucowsOrder[] = [];
  for (const o of list(r.attributes.orders)) {
    const rec = obj(o);
    if (!str(rec.id)) continue;
    out.push({ id: str(rec.id), status: str(rec.status).toLowerCase(), type: str(rec.type), date: str(rec.order_date) });
  }
  return out.sort((a, b) => Number(b.id) - Number(a.id));
}

/** "2027-03-12 06:48:18" (Tucows' expiry dates, UTC) -> ISO, or null. */
function tucowsExpiry(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))).toISOString();
}

/**
 * Is the domain in this reseller account, and when does it expire? GET DOMAIN (type all_info)
 * answers only for the account's own domains, while active or in the grace period after expiry
 * (research/opensrs/get-domain.md). Any other refusal means it is not ours to renew.
 */
export async function domainExpiry(domain: string): Promise<{ status: "ours"; expires_at: string } | { status: "not_ours" } | { status: "error" }> {
  const r = await call("GET", { domain, type: "all_info" }, "DOMAIN", 20);
  if (!r.transport || r.code === 400 || r.code >= 500) return { status: "error" };
  if (r.code !== 200) return { status: "not_ours" };
  const expires = tucowsExpiry(str(r.attributes.expiredate));
  return expires ? { status: "ours", expires_at: expires } : { status: "error" };
}

/**
 * RENEW one domain, handle=process. currentexpirationyear must match the registry, so a renewal
 * that already went through makes a repeat fail instead of adding a second term
 * (research/opensrs/renew.md). Never retried here: the caller checks the expiry first.
 */
export async function renew(domain: string, currentExpiryYear: number, period: number): Promise<OpsResult & { expires_at: string | null }> {
  const r = await call("RENEW", {
    domain,
    currentexpirationyear: currentExpiryYear,
    period: Math.trunc(period),
    handle: "process",
    auto_renew: 0,
  }, "DOMAIN", 60);
  return { ...r, expires_at: tucowsExpiry(str(r.attributes["registration expiration date"])) };
}

/** The reseller balance in USD, or null. Used by the admin page's header line. */
export async function balance(): Promise<number | null> {
  const r = await call("GET_BALANCE", {}, "BALANCE", 15);
  const b = str(r.attributes.balance);
  if (!r.transport || r.code !== 200 || b === "") return null;
  const n = Number(b);
  return Number.isFinite(n) ? n : null;
}
