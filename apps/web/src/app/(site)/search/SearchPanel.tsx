"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { tokenNumber } from "@/components/internal/styles";
import { DomainSearchForm } from "../DomainSearchForm";
import { CartPanel } from "../CartPanel";
import { useCart } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import { CONTACT, DEFAULT_TERM, NEW_TLDS, SERVICE_LABELS, TERMS, money, priceForTerm, type Term } from "@/data/site";
import { alternatives, checkDomain, SELLABLE_TLDS, type DomainCheck } from "@/data/shop";

/* The search experience, and the ONLY one on the site: /search, /register, /transfer and /renew
   all render this, the way bltz.com's four search pages are one form with four headings.
   The home hero renders the same field and lands here.
 *
 * THE ANSWER COMES FROM THE REGISTRY (Sep 2026). Every search asks the API (GET /api/domain-check/), which
 * asks Tucows. Only a FREE domain on an extension sold online can go in the cart, as a
 * registration. A taken domain is said to be taken, with the same name under the other
 * extensions offered as one-tap searches; renewals and transfers are arranged by email for now.
 *
 * A SEARCH RUNS ONLY WHEN SOMEBODY SUBMITS ONE (the registrar's agreement, 3.2, forbids lookups
 * nobody asked for): on the form's submit, on an alternative's tap, or on arriving from the home
 * page's search with the domain in the address.
 *
 * The answer is a snapshot. The checkout asks the registry again, uncached, before any card is
 * touched (POST /api/checkout/).
 */

const panelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };
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
// The domain, centred over a rule: the reference's result header exactly.
const resultHeadStyle: CSSProperties = {
  paddingBottom: "var(--space-sm)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
  textAlign: "center",
  overflowWrap: "anywhere",
};
const statusStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
/* The reference's one result row: what it is, for how long, and the button that buys it. */
const offerRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};
const offerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-semibold)"),
  color: "var(--text-positive-primary)",
};
const offerActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" };
const altListStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", margin: 0, padding: 0, listStyle: "none" };
const mutedStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };

type Phase = { kind: "idle" } | { kind: "checking"; domain: string } | { kind: "done"; check: DomainCheck };

export function SearchPanel({ domain }: { domain: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(domain ? { kind: "checking", domain } : { kind: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  const fetchCheck = useCallback((d: string) => {
    inFlight.current?.abort();
    const ctl = new AbortController();
    inFlight.current = ctl;
    checkDomain(d, ctl.signal)
      .then((check) => { if (!ctl.signal.aborted) setPhase({ kind: "done", check }); })
      .catch(() => { /* aborted by a newer search */ });
  }, []);

  function run(d: string) {
    setPhase({ kind: "checking", domain: d });
    fetchCheck(d);
  }

  // The panel is keyed on the address's domain (DomainFromUrl), so this runs once per search. The
  // phase already starts as "checking" when there is a domain.
  useEffect(() => {
    if (domain) fetchCheck(domain);
    return () => inFlight.current?.abort();
  }, [domain, fetchCheck]);

  function onSearch(d: string) {
    // The same domain again does not change the address, so it is checked here; a new one
    // changes the address (relative, so /transfer stays /transfer) and the panel re-mounts.
    if (d === domain) run(d);
    else router.replace(`?domain=${encodeURIComponent(d)}`, { scroll: false });
  }

  const shown = phase.kind === "checking" ? phase.domain : phase.kind === "done" ? phase.check.domain : domain;

  return (
    <div style={panelStyle}>
      <DomainSearchForm initial={shown} size="lg" onSearch={onSearch} />
      {/* Results two thirds, cart rail one third. */}
      <Row cols={{ mobile: 1, tablet: 1, desktop: 3 }} gap="lg" alignItems="start">
        <Column span={{ mobile: 1, tablet: 1, desktop: 2 }}>
          <div style={columnStyle}>
            <div role="status" aria-live="polite">
              {phase.kind === "checking" ? (
                <div style={resultStyle} data-ds-result="checking">
                  <p style={statusStyle}>Checking {phase.domain} with the registry…</p>
                </div>
              ) : phase.kind === "done" ? (
                <Result check={phase.check} onSearch={onSearch} />
              ) : null}
            </div>
            <TldLists />
          </div>
        </Column>
        <Column span={1}>
          <CartPanel />
        </Column>
      </Row>
    </div>
  );
}

function Result({ check, onSearch }: { check: DomainCheck; onSearch: (d: string) => void }) {
  const { domain, status } = check;
  return (
    <div style={resultStyle} data-ds-result={status}>
      <div style={resultHeadStyle}>
        <Heading level={2} size={4}>{domain}</Heading>
      </div>
      {status === "available" ? <Offer domain={domain} /> : <Refusal check={check} onSearch={onSearch} />}
    </div>
  );
}

function Offer({ domain }: { domain: string }) {
  const cart = useCart();
  const { region } = useRegion();
  // Five years, the reference's own default selection.
  const [term, setTerm] = useState<Term>(DEFAULT_TERM);
  const inCart = cart.items.some((i) => i.id === `register:${domain}`);

  return (
    <>
      <p style={statusStyle}>Good news: this domain is available.</p>
      <div style={offerRowStyle}>
        <span style={offerLabelStyle}>{SERVICE_LABELS.register}</span>
        <div style={offerActionsStyle}>
          <Select
            id={`term-${domain.replace(/[^a-z0-9-]/gi, "-")}`}
            aria-label={`Duration for ${domain}`}
            size="md"
            value={String(term)}
            options={TERMS.map((t) => ({ value: String(t), label: termOption(t, region.currency) }))}
            onChange={(e) => setTerm(Number(e.target.value) as Term)}
          />
          {inCart ? (
            /* A BADGE, NOT A DISABLED BUTTON: a disabled button reads as "you cannot add this",
               the opposite of what happened. The rail beside it carries View Cart. */
            <Badge tone="success" emphasis="solid" icon textCase="title">Added To Cart</Badge>
          ) : (
            <Button variant="primary" onClick={() => cart.add({ domain, service: "register", term, amount: priceForTerm(term) })}>
              Add To Cart
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Refusal({ check, onSearch }: { check: DomainCheck; onSearch: (d: string) => void }) {
  const { domain, status } = check;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  const email = <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>;
  const alts = status === "taken" || status === "premium" || status === "unsupported" ? alternatives(domain) : [];

  let message: React.ReactNode;
  if (status === "taken") message = <>This domain is already registered. If it is yours and you want to renew or transfer it, email us at {email}.</>;
  else if (status === "premium") message = <>This is a premium domain priced by its registry, so it cannot be ordered online. Email us at {email} for a quote.</>;
  else if (status === "unsupported") message = <>.{tld} domains are not sold online yet. Email us at {email} to order one.</>;
  else if (status === "invalid") message = <>This does not look like a domain name. Enter it with its extension, like myawesomedomain.com.</>;
  else if (status === "busy") message = <>Too many searches in a row. Wait a minute, then try again.</>;
  else if (status === "closed") message = <>Online ordering opens soon. To register this domain now, email us at {email}.</>;
  else message = <>We could not reach the registry just now. Please try again in a moment.</>;

  return (
    <>
      <p style={statusStyle}>{message}</p>
      {status === "error" || status === "busy" ? (
        <div>
          <Button variant="secondary" onClick={() => onSearch(domain)}>Try again</Button>
        </div>
      ) : null}
      {alts.length ? (
        <>
          <p style={mutedStyle}>Try the same name with another extension:</p>
          <ul style={altListStyle}>
            {alts.map((d) => (
              <li key={d}>
                <Button variant="secondary" size="sm" onClick={() => onSearch(d)}>{d}</Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/** "5 Years - $265.00", the reference's own option label, in the visitor's currency. */
function termOption(term: Term, currency: string): string {
  const amount = inRegionCurrency(priceForTerm(term), currency);
  return `${term} ${term === 1 ? "Year" : "Years"} - ${money(amount, currency)}`;
}

/* THE TWO EXTENSION CARDS, the reference's shape (bltz.com, screenshots 18 Sep 2026): two
 * bordered panels side by side, each a heading over a rule with the list written as a SENTENCE
 * rather than a row of chips, because chips read as a filter control and these are a statement
 * about what the business sells. The first card lists what the shop sells online; the second,
 * what the team can arrange on request. */
function TldLists() {
  return (
    <Row cols={{ mobile: 1, tablet: 1, desktop: 2 }} gap="lg" alignItems="stretch">
      <Column>
        <div style={tldCardStyle}>
          <div style={tldHeadStyle}>
            <Heading level={2} size={6}>Popular extensions</Heading>
          </div>
          <p style={tldBodyStyle}>
            Register {listSentence(SELLABLE_TLDS.map((t) => `.${t}`))} online, for one to ten years.
          </p>
        </div>
      </Column>
      <Column>
        <div style={tldCardStyle}>
          <div style={tldHeadStyle}>
            <Heading level={2} size={6}>New extensions</Heading>
          </div>
          <p style={tldBodyStyle}>
            Newer extensions such as {listSentence(NEW_TLDS)} are available on request. Email us at{" "}
            <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a> to order one.
          </p>
        </div>
      </Column>
    </Row>
  );
}

/** "a, b and c": an Oxford-free list, because this reads as a sentence and not as data. */
function listSentence(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// A bordered card on the panel's own ground, the reference's shape: heading, a rule under it, then
// the sentence. Stretch so two cards of unequal text length still square off at the foot.
const tldCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  height: "100%",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
};
const tldHeadStyle: CSSProperties = {
  paddingBottom: "var(--space-xs)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
};
const tldBodyStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
