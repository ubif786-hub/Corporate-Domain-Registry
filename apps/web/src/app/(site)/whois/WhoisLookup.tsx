"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WhoisResponse } from "@cdr/shared";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataLabel } from "@/components/DataLabel";
import { Heading } from "@/components/Heading";
import { DomainSearchForm } from "../DomainSearchForm";
import { formatDate } from "@/data/lookup";

/* The whois field and the record it returns, live from the domain's registry (GET /api/whois/,
   which reads the registry's RDAP record). Registrant contact details are redacted by the
   registries, so the record is the registrar, the dates, the status codes and the nameservers. */

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
const dlStyle: CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "var(--space-lg)", rowGap: "var(--space-2xs)", margin: 0, fontSize: "var(--type-sm)" };
const ddStyle: CSSProperties = { margin: 0, overflowWrap: "anywhere" };
const mutedStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };

type Phase =
  | { kind: "idle" }
  | { kind: "checking"; domain: string }
  | { kind: "done"; record: WhoisResponse }
  | { kind: "failed"; domain: string; busy: boolean };

/** Asks GET /api/whois/. Never throws, except when the caller aborts. */
async function fetchWhois(domain: string, signal: AbortSignal): Promise<Phase> {
  try {
    const res = await fetch(`/api/whois/?domain=${encodeURIComponent(domain)}`, { cache: "no-store", signal });
    if (res.status === 429) return { kind: "failed", domain, busy: true };
    if (!res.ok) return { kind: "failed", domain, busy: false };
    const record = (await res.json()) as WhoisResponse;
    return record?.status === "error" ? { kind: "failed", domain, busy: false } : { kind: "done", record };
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
  const row = (label: string, value: string) => value ? (
    <>
      <dt><DataLabel tone="secondary">{label}</DataLabel></dt>
      <dd style={ddStyle}>{value}</dd>
    </>
  ) : null;
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
        <dl style={dlStyle}>
          {row("Registrar", record.registrar ?? "")}
          {row("Registered", formatDate(record.created_at))}
          {row("Expires", formatDate(record.expires_at))}
          {row("Updated", formatDate(record.updated_at))}
          {row("Status", record.statuses.join(", "))}
          {row("Nameservers", record.nameservers.join(", "))}
        </dl>
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
      <p style={mutedStyle}>From the registry&apos;s public record, checked {formatDate(record.checked_at)}.</p>
    </div>
  );
}
