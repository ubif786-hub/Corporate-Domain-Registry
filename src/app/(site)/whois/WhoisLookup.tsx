"use client";

import { CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DataLabel } from "@/components/DataLabel";
import { Heading } from "@/components/Heading";
import { DomainSearchForm } from "../DomainSearchForm";
import { formatDate, lookup, type DomainRecord, isExpired } from "@/data/lookup";
import { SOURCE_ROWS } from "@/data/domains";
import { FIXTURE_DOMAINS } from "@/data/whois-fixtures";

/* The whois field and the record it returns. Same sample lookup as the search page; the record
   layout (registrar, dates, status codes, nameservers, checked-at) is the one the live RDAP
   answer will fill. */

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
const ddStyle: CSSProperties = { margin: 0 };
const mutedStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };
const missStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-sm)" };
// A link-shaped button, not an <a>: it re-runs the lookup in place rather than navigating, so the
// reader keeps their scroll position and the field keeps focus behaviour.
const tryStyle: CSSProperties = {
  appearance: "none", background: "none", border: "none", padding: 0, margin: 0,
  font: "inherit", color: "var(--text-positive-link)", textDecoration: "underline", cursor: "pointer",
};
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };

/* THE DOMAINS OFFERED WHEN A LOOKUP MISSES.
 *
 * These are the CURATED FIXTURES, not the first rows of the client's export. The export is 1000
 * expired 2016 and 2017 registrations belonging to other people, so "20minutesfromhome.info"
 * both demos badly and teaches nothing; the fixtures were written to demonstrate one state each
 * (healthy, available, near expiry, lapsed, redemption, .ca, privacy, transfer lock). Three is
 * enough inline: a healthy record, an available one, and one that is expiring. */
const DEMO_DOMAINS = FIXTURE_DOMAINS.slice(0, 3);

export function WhoisLookup({ initial }: { initial: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<DomainRecord | null>(initial ? lookup(initial) : null);
  // One path for every way a lookup starts: the field, and the example links in the miss state.
  const run = (d: string) => {
    setRecord(lookup(d));
    router.replace(`/whois?domain=${encodeURIComponent(d)}`, { scroll: false });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-heading)" }}>
      <DomainSearchForm
        initial={initial}
        size="lg"
        onSearch={run}
      />
      {record ? <Record record={record} onTry={run} /> : null}
    </div>
  );
}

function Record({ record, onTry }: { record: DomainRecord; onTry: (d: string) => void }) {
  const row = (label: string, value: string) => (
    <>
      <dt><DataLabel tone="secondary">{label}</DataLabel></dt>
      <dd style={ddStyle}>{value}</dd>
    </>
  );
  return (
    <div style={recordStyle} role="status" aria-live="polite" data-ds-whois={record.availability}>
      <div style={headStyle}>
        <Heading level={2} size={5}>{record.domain}</Heading>
        {/* Expired outranks registered. A lapsed registration still carries a registrar and
            nameservers, so without this it renders exactly like a live one, which is the single
            most misleading thing this page could do. */}
        {record.availability === "registered" && isExpired(record) ? <Badge tone="warning" emphasis="solid">Expired</Badge>
          : record.availability === "registered" ? <Badge tone="info" emphasis="solid">Registered</Badge>
          : record.availability === "available" ? <Badge tone="success" emphasis="solid">No record</Badge>
          // NOT IN THE SNAPSHOT is not the same fact as UNABLE TO VERIFY, and reading them as one
          // is what made the client report this page as broken.
          : record.notInSnapshot ? <Badge tone="neutral" emphasis="solid">Not in the sample</Badge>
          : <Badge tone="warning" emphasis="solid">Unable to verify</Badge>}
      </div>
      {record.availability === "registered" ? (
        <dl style={dlStyle}>
          {row("Registrar", record.registrar ?? "")}
          {row("Registered", formatDate(record.createdAt))}
          {row("Expires", formatDate(record.expiresAt))}
          {row("Status", record.statuses.join(", "))}
          {row("Nameservers", record.nameservers.join(", "))}
        </dl>
      ) : record.availability === "available" ? (
        <p style={bodyStyle}>No registration record exists for this domain. It is free to register.</p>
      ) : record.notInSnapshot ? (
        <div style={missStyle}>
          <p style={bodyStyle}>
            This domain is not in the sample snapshot, so there is nothing to show. It says nothing
            about whether the domain is registered: the live registry connection is not built yet,
            and until it is, only the {SOURCE_ROWS.toLocaleString("en-US")} records in the snapshot
            can be looked up.
          </p>
          <p style={bodyStyle}>
            Try one of these to see a real record:{" "}
            {DEMO_DOMAINS.map((d, i) => (
              <span key={d}>
                {i > 0 ? ", " : ""}
                <button type="button" style={tryStyle} onClick={() => onTry(d)}>{d}</button>
              </span>
            ))}
            .
          </p>
        </div>
      ) : (
        <p style={bodyStyle}>We could not reach the registry just now. Try again in a moment.</p>
      )}
      <p style={mutedStyle}>Checked {formatDate(record.checkedAt)}. Sample data until the registry connection is live.</p>
    </div>
  );
}
