"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RenewCheckResponse } from "@cdr/shared";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Column } from "@/components/Column";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { Select } from "@/components/Select";
import { tokenNumber } from "@/components/internal/styles";
import { DomainSearchForm } from "../DomainSearchForm";
import { CartPanel } from "../CartPanel";
import { useCart } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import { formatDate } from "@/data/lookup";
import { CONTACT, SERVICE_LABELS, TERMS, money, priceForTerm, type Term } from "@/data/site";
import { SHOP_OPEN } from "@/data/shop";

/* The renewal page: a domain registered through CDR (in CDR's Tucows account) is looked up
   (GET /api/renew-check/), its expiry shown, and a renewal goes in the cart like a registration.
   Checkout asks Tucows again before the card is touched, and the card is only charged once the
   renewal went through. Not in the menu: the client sends the link to past buyers. */

const columnStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };
const resultStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
};
const resultHeadStyle: CSSProperties = {
  paddingBottom: "var(--space-sm)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
  textAlign: "center",
  overflowWrap: "anywhere",
};
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };
const offerRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)" };
const offerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-semibold)"),
  color: "var(--text-positive-primary)",
};
const offerActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };

type Phase =
  | { kind: "idle" }
  | { kind: "checking"; domain: string }
  | { kind: "done"; check: RenewCheckResponse; expired: boolean }
  | { kind: "failed"; domain: string; busy: boolean };

async function fetchRenewal(domain: string, signal: AbortSignal): Promise<Phase> {
  try {
    const res = await fetch(`/api/renew-check/?domain=${encodeURIComponent(domain)}`, { cache: "no-store", signal });
    if (res.status === 429) return { kind: "failed", domain, busy: true };
    if (!res.ok) return { kind: "failed", domain, busy: false };
    const check = (await res.json()) as RenewCheckResponse;
    if (check?.status === "error") return { kind: "failed", domain, busy: false };
    return { kind: "done", check, expired: !!check.expires_at && Date.parse(check.expires_at) < Date.now() };
  } catch (e) {
    if (signal.aborted) throw e;
    return { kind: "failed", domain, busy: false };
  }
}

export function RenewPanel({ domain }: { domain: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(domain ? { kind: "checking", domain } : { kind: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  const start = useCallback((d: string) => {
    inFlight.current?.abort();
    const ctl = new AbortController();
    inFlight.current = ctl;
    fetchRenewal(d, ctl.signal).then((p) => { if (!ctl.signal.aborted) setPhase(p); }).catch(() => { /* a newer search */ });
  }, []);

  function look(d: string) {
    setPhase({ kind: "checking", domain: d });
    start(d);
  }

  // Keyed on the address's domain (DomainFromUrl), so this runs once per search; the phase already
  // starts as "checking" when there is a domain.
  useEffect(() => {
    if (domain && SHOP_OPEN) start(domain);
    return () => inFlight.current?.abort();
  }, [domain, start]);

  function onSearch(d: string) {
    if (d === domain) look(d);
    else router.replace(`?domain=${encodeURIComponent(d)}`, { scroll: false });
  }

  const email = <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>;

  return (
    <div style={columnStyle}>
      <DomainSearchForm initial={domain} size="lg" onSearch={onSearch} />
      <Row cols={{ mobile: 1, tablet: 1, desktop: 3 }} gap="lg" alignItems="start">
        <Column span={{ mobile: 1, tablet: 1, desktop: 2 }}>
          <div role="status" aria-live="polite">
            {!SHOP_OPEN && domain ? (
              <div style={resultStyle}><p style={bodyStyle}>Online renewals open soon. To renew {domain} now, email us at {email}.</p></div>
            ) : phase.kind === "checking" ? (
              <div style={resultStyle}><p style={bodyStyle}>Checking {phase.domain} with the registry…</p></div>
            ) : phase.kind === "failed" ? (
              <div style={resultStyle}>
                <p style={bodyStyle}>{phase.busy ? "Too many searches in a row. Wait a minute, then try again." : "We could not reach the registry just now."}</p>
                <div><Button variant="secondary" onClick={() => look(phase.domain)}>Try again</Button></div>
              </div>
            ) : phase.kind === "done" ? (
              <div style={resultStyle} data-ds-renew={phase.check.status}>
                <div style={resultHeadStyle}><Heading level={2} size={4}>{phase.check.domain}</Heading></div>
                {phase.check.status === "renewable" ? (
                  <Renewal check={phase.check} expired={phase.expired} />
                ) : phase.check.status === "not_ours" ? (
                  <p style={bodyStyle}>
                    We can only renew domains registered with us. If you registered this domain somewhere else and
                    want to move it to us, email us at {email}.
                  </p>
                ) : (
                  <p style={bodyStyle}>This does not look like a domain name. Enter it with its extension, like myawesomedomain.com.</p>
                )}
              </div>
            ) : null}
          </div>
        </Column>
        <Column span={1}>
          <CartPanel />
        </Column>
      </Row>
    </div>
  );
}

function Renewal({ check, expired }: { check: RenewCheckResponse; expired: boolean }) {
  const cart = useCart();
  const { region } = useRegion();
  const max = check.max_term ?? 0;
  const [term, setTerm] = useState<Term>(1);
  const domain = check.domain;
  const inCart = cart.items.some((i) => i.id === `renew:${domain}`);
  const expires = check.expires_at ?? null;

  if (max < 1) {
    return <p style={bodyStyle}>This domain runs until {formatDate(expires)}, already as far ahead as the registry allows. There is nothing to renew yet.</p>;
  }
  return (
    <>
      <p style={bodyStyle}>
        {expired
          ? <>This domain expired on {formatDate(expires)}. Renew it now, before the registry releases it.</>
          : <>This domain is registered with us and runs until {formatDate(expires)}. A renewal adds years from that date.</>}
      </p>
      <div style={offerRowStyle}>
        <span style={offerLabelStyle}>{SERVICE_LABELS.renew}</span>
        <div style={offerActionsStyle}>
          <Select
            id={`renew-term-${domain.replace(/[^a-z0-9-]/gi, "-")}`}
            aria-label={`Renewal period for ${domain}`}
            size="md"
            value={String(term)}
            options={TERMS.filter((t) => t <= max).map((t) => ({
              value: String(t),
              label: `${t} ${t === 1 ? "Year" : "Years"} - ${money(inRegionCurrency(priceForTerm(t), region.currency), region.currency)}`,
            }))}
            onChange={(e) => setTerm(Number(e.target.value) as Term)}
          />
          {inCart ? (
            <Badge tone="success" emphasis="solid" icon textCase="title">Added To Cart</Badge>
          ) : (
            <Button variant="primary" onClick={() => cart.add({ domain, service: "renew", term, amount: priceForTerm(term), maxTerm: max })}>
              Add To Cart
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
