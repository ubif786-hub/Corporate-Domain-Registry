"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eppStatus, mergeRdap, parseRdap, type WhoisContact, type WhoisResponse } from "@cdr/shared";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataLabel } from "@/components/DataLabel";
import { Heading } from "@/components/Heading";
import { DomainSearchForm } from "../DomainSearchForm";
import { formatDate } from "@/data/lookup";

/* The whois field and the record it returns, live (GET /api/whois/, which reads the registry's
   RDAP record and the registrar's record it links to). Three groups, as a registrar's whois page
   shows them: the domain, its owner as far as it is public, and the registrar. Personal details
   the registrar hides (ICANN policy, privacy law) are left out, and the page says so. */

const recordStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
};
const headStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" };
// Each row is a label and its value side by side, one label width for every group so the values
// line up down the record. Where the two do not fit (a phone), the value wraps under its label
// instead of squeezing long codes into broken words.
const dlStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", margin: 0, fontSize: "var(--type-sm)" };
const rowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "var(--space-lg)", rowGap: "var(--space-3xs)" };
const dtStyle: CSSProperties = { flex: "0 0 8.5rem" };
const ddStyle: CSSProperties = { margin: 0, flex: "1 1 14rem", minWidth: 0, overflowWrap: "anywhere" };
const mutedStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };
const statusListStyle: CSSProperties = { display: "flex", flexDirection: "column" };
const groupStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", paddingTop: "var(--space-sm)", borderTop: "var(--rule-weight) solid var(--border-positive-secondary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };

type Phase =
  | { kind: "idle" }
  | { kind: "checking"; domain: string }
  | { kind: "done"; record: WhoisResponse }
  | { kind: "failed"; domain: string; busy: boolean };

/** The registrar's half from the visitor's browser, when the registrar blocked our server (GoDaddy
 *  blocks cloud IPs, but its RDAP allows any origin). Without it the registry's record stands. */
async function withRegistrarHalf(record: WhoisResponse, signal: AbortSignal): Promise<WhoisResponse> {
  const url = record.registrar_record_url;
  if (record.status !== "registered" || !url?.startsWith("https://")) return record;
  try {
    const res = await fetch(url, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]) });
    if (!res.ok) return record;
    return { ...record, ...mergeRdap(record, parseRdap(await res.json())), registrar_record_url: null };
  } catch (e) {
    if (signal.aborted) throw e;
    return record;
  }
}

/** Asks GET /api/whois/. Never throws, except when the caller aborts. */
async function fetchWhois(domain: string, signal: AbortSignal): Promise<Phase> {
  try {
    const res = await fetch(`/api/whois/?domain=${encodeURIComponent(domain)}`, { cache: "no-store", signal });
    if (res.status === 429) return { kind: "failed", domain, busy: true };
    if (!res.ok) return { kind: "failed", domain, busy: false };
    const record = (await res.json()) as WhoisResponse;
    if (record?.status === "error") return { kind: "failed", domain, busy: false };
    return { kind: "done", record: await withRegistrarHalf(record, signal) };
  } catch (e) {
    if (signal.aborted) throw e;
    return { kind: "failed", domain, busy: false };
  }
}

export function WhoisLookup({ initial }: { initial: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initial ? { kind: "checking", domain: initial } : { kind: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  const start = useCallback((d: string) => {
    inFlight.current?.abort();
    const ctl = new AbortController();
    inFlight.current = ctl;
    fetchWhois(d, ctl.signal).then((p) => { if (!ctl.signal.aborted) setPhase(p); }).catch(() => { /* a newer lookup */ });
  }, []);

  function look(d: string) {
    setPhase({ kind: "checking", domain: d });
    start(d);
  }

  // Keyed on the address's domain (DomainFromUrl), so this runs once per lookup from a link. The
  // phase already starts as "checking" when there is a domain.
  useEffect(() => {
    if (initial) start(initial);
    return () => inFlight.current?.abort();
  }, [initial, start]);

  const run = (d: string) => {
    look(d);
    router.replace(`/whois?domain=${encodeURIComponent(d)}`, { scroll: false });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-heading)" }}>
      <DomainSearchForm initial={initial} size="lg" onSearch={run} />
      <div role="status" aria-live="polite">
        {phase.kind === "checking" ? (
          <div style={recordStyle}><p style={bodyStyle}>Looking up {phase.domain} at its registry…</p></div>
        ) : phase.kind === "failed" ? (
          <div style={recordStyle}>
            <p style={bodyStyle}>
              {phase.busy ? "Too many lookups in a row. Wait a minute, then try again." : `We could not reach the registry for ${phase.domain} just now.`}
            </p>
            <div><Button variant="secondary" onClick={() => look(phase.domain)}>Try again</Button></div>
          </div>
        ) : phase.kind === "done" ? (
          <Record record={phase.record} />
        ) : null}
      </div>
    </div>
  );
}

function Record({ record }: { record: WhoisResponse }) {
  const row = (label: string, value: React.ReactNode) => value ? (
    <div key={label} style={rowStyle}>
      <dt style={dtStyle}><DataLabel tone="secondary">{label}</DataLabel></dt>
      <dd style={ddStyle}>{value}</dd>
    </div>
  ) : null;
  const group = (title: string, rows: React.ReactNode[]) => rows.some(Boolean) ? (
    <section style={groupStyle}>
      <Heading level={3} size={6}>{title}</Heading>
      <dl style={dlStyle}>{rows}</dl>
    </section>
  ) : null;
  const owner = record.registrant;
  const link = (href: string, text: string) => <a href={href} style={linkStyle} rel="noopener noreferrer" target="_blank">{text}</a>;
  const contactRows = (c: WhoisContact | null) => [
    row("Name", c?.name ?? ""),
    row("Organisation", c?.org ?? ""),
    row("Address", c?.address ?? ""),
    row("Email", c?.email ? link(`mailto:${c.email}`, c.email) : ""),
    row("Phone", c?.phone ?? ""),
    row("Contact form", c?.contact_url ? link(c.contact_url, "Send a message through the registrar") : ""),
  ];
  // The registrar's expiry is shown when it is a different day from the registry's.
  const registrarExpiry = record.registrar_expires_at && formatDate(record.registrar_expires_at) !== formatDate(record.expires_at) ? formatDate(record.registrar_expires_at) : "";
  const expired = record.expires_at !== null && Date.parse(record.expires_at) < Date.parse(record.checked_at);
  return (
    <div style={recordStyle} data-ds-whois={record.status}>
      <div style={headStyle}>
        <Heading level={2} size={5}>{record.domain}</Heading>
        {record.status === "registered" && expired ? <Badge tone="warning" emphasis="solid">Expired</Badge>
          : record.status === "registered" ? <Badge tone="info" emphasis="solid">Registered</Badge>
          : record.status === "available" ? <Badge tone="success" emphasis="solid">No record</Badge>
          : record.status === "unsupported" ? <Badge tone="neutral" emphasis="solid">No public record</Badge>
          : <Badge tone="warning" emphasis="solid">Not a domain</Badge>}
      </div>
      {record.status === "registered" ? (
        <>
          {group("Domain", [
            row("Registry ID", record.registry_domain_id ?? ""),
            row("Registered", formatDate(record.created_at)),
            row("Expires", formatDate(record.expires_at)),
            row("Registrar expiry", registrarExpiry),
            row("Updated", formatDate(record.updated_at)),
            row("Status", record.statuses.length ? (
              <span style={statusListStyle}>
                {record.statuses.map((st) => {
                  const code = eppStatus(st);
                  return <span key={st}>{code ? link(`https://icann.org/epp#${code}`, code) : st}</span>;
                })}
              </span>
            ) : ""),
            row("Nameservers", record.nameservers.join(", ")),
            row("DNSSEC", record.dnssec === null ? "" : record.dnssec ? "Signed" : "Not signed"),
          ])}
          {group("Owner", contactRows(owner))}
          {!owner?.email ? (
            <p style={mutedStyle}>
              The owner&apos;s personal details are kept private by their registrar, as privacy rules require.
              {owner?.contact_url ? " Use the contact form to send them a message." : " To reach the owner, contact the registrar."}
            </p>
          ) : null}
          {group("Admin contact", contactRows(record.admin))}
          {group("Tech contact", contactRows(record.tech))}
          {group("Registrar", [
            row("Name", record.registrar ?? ""),
            row("IANA ID", record.registrar_iana_id ?? ""),
            row("Whois server", record.registrar_whois ?? ""),
            row("Website", record.registrar_url ? link(record.registrar_url, record.registrar_url.replace(/^https?:\/\//, "").replace(/\/$/, "")) : ""),
            row("Abuse email", record.abuse_email ? link(`mailto:${record.abuse_email}`, record.abuse_email) : ""),
            row("Abuse phone", record.abuse_phone ?? ""),
          ])}
        </>
      ) : record.status === "available" ? (
        <p style={bodyStyle}>
          The registry has no record of this domain, so it is not registered.{" "}
          <Link href={`/search?domain=${encodeURIComponent(record.domain)}`} style={linkStyle}>Search it to register it</Link>.
        </p>
      ) : record.status === "unsupported" ? (
        <p style={bodyStyle}>The registry for .{record.domain.slice(record.domain.lastIndexOf(".") + 1)} does not publish a public lookup service, so there is no record to show.</p>
      ) : (
        <p style={bodyStyle}>This does not look like a domain name. Enter it with its extension, like myawesomedomain.com.</p>
      )}
      {record.status === "registered" && record.complaint_url ? (
        <p style={mutedStyle}>Something in this record wrong? Report it to ICANN: {link(record.complaint_url, "whois inaccuracy complaint form")}.</p>
      ) : null}
      <p style={mutedStyle}>
        From the public records of the registry and the registrar, checked {formatDate(record.checked_at)}
        {record.record_updated_at ? `; the registrar's record was last updated ${formatDate(record.record_updated_at)}` : ""}.
      </p>
    </div>
  );
}
