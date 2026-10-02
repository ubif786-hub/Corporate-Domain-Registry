"use client";

import { CSSProperties, FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CalloutCard } from "@/components/CalloutCard";
import { Checkbox } from "@/components/Checkbox";
import { Column } from "@/components/Column";
import { FormGroup } from "@/components/FormGroup";
import { Row } from "@/components/Row";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { AGREEMENT } from "@/data/legal/agreement";
import catalog from "@cdr/shared/catalog.json";
import type { CartItem } from "../CartProvider";

/* The registrant form, then Stripe (PROJECT.md decision 12 D3). OpenSRS will not register a domain
 * without a named registrant, so these details are collected HERE, before payment, rather than
 * left to Stripe's page, which asks only for what a card needs.
 *
 * ONE CONTACT, NOT FOUR. OpenSRS takes owner, admin, billing and tech contacts; the owner is copied
 * to admin and billing and CDR's own tech contact is used, so the visitor fills one set.
 *
 * THE BROWSER SENDS NO PRICES. The API (POST /api/checkout/) prices each line from catalog.json and
 * charges that, so a tampered cart can change nothing but which domains are ordered. It also asks
 * the registry once more; a domain that went while it sat in the cart comes back as a line error,
 * shown here with a button that takes it out of the cart.
 */

type Fields = Record<string, string>;

const stackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };
const noteStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-tertiary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };
const lineProblemStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-xs)", marginTop: "var(--space-xs)" };

const NAMES = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export function CheckoutForm({
  items,
  total,
  currency,
  onRemove,
}: {
  items: CartItem[];
  /** The order total, formatted in the charge currency. */
  total: string;
  currency: string;
  onRemove: (id: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [agree, setAgree] = useState(false);
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Fields>({});
  const [lineErrors, setLineErrors] = useState<Fields>({});
  const [problem, setProblem] = useState<string | null>(null);

  // Canada and the United States first (the two markets on /contact), then everyone by name.
  const countries = useMemo(() => {
    const name = (c: string) => NAMES?.of(c) ?? c;
    const rest = catalog.countries.filter((c) => c !== "CA" && c !== "US").sort((a, b) => name(a).localeCompare(name(b)));
    return ["CA", "US", ...rest].map((c) => ({ value: c, label: name(c) }));
  }, []);

  const stateRequired = country === "CA" || country === "US";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const value = (k: string) => String(form.get(k) ?? "");
    const registrant: Fields = {};
    for (const k of ["first_name", "last_name", "org_name", "email", "phone", "address1", "address2", "city", "state", "postal_code", "country"]) registrant[k] = value(k);
    const body = {
      items: items.map((i) => ({ domain: i.domain, term: i.term })),
      registrant,
      agree,
    };
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/checkout/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        window.location.assign(data.url);
        return;
      }
      setErrors(data.fields ?? {});
      setLineErrors(data.lines ?? {});
      setProblem(data.message ?? "Payment could not be started. Nothing was charged; try again in a moment.");
    } catch {
      setProblem("The payment service could not be reached. Nothing was charged; check your connection and try again.");
    }
    setBusy(false);
    formRef.current?.scrollIntoView({ block: "start" });
  }

  const lineProblems = items
    .map((item, i) => (lineErrors[String(i)] ? { item, message: lineErrors[String(i)] } : null))
    .filter((x): x is { item: CartItem; message: string } => Boolean(x));

  return (
    <form ref={formRef} onSubmit={submit} style={stackStyle} aria-busy={busy}>
      {problem ? (
        <CalloutCard
          tone="danger"
          title={problem}
          body={
            lineProblems.length ? (
              <>
                {lineProblems.map(({ item, message }) => (
                  <span key={item.id} style={lineProblemStyle}>
                    <span><strong>{item.domain}</strong>: {message}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onRemove(item.id);
                        setLineErrors({});
                        setProblem(null);
                      }}
                    >
                      Remove from cart
                    </Button>
                  </span>
                ))}
              </>
            ) : undefined
          }
        />
      ) : null}

      <FormGroup
        legend="Registrant"
        description="The person or organisation the domain is registered to. The registry requires these details, and the registrant will be emailed once to confirm them."
      >
        <Row cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
          <Column span={1}><TextField id="co-first" name="first_name" label="First name" autoComplete="given-name" required error={errors.first_name} /></Column>
          <Column span={1}><TextField id="co-last" name="last_name" label="Last name" autoComplete="family-name" required error={errors.last_name} /></Column>
        </Row>
        <TextField id="co-org" name="org_name" label="Organisation" autoComplete="organization" helper="Leave blank for a personal registration." error={errors.org_name} />
        <Row cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
          <Column span={1}><TextField id="co-email" name="email" type="email" label="Email" autoComplete="email" required error={errors.email} /></Column>
          <Column span={1}><TextField id="co-phone" name="phone" type="tel" label="Phone" autoComplete="tel" helper="With the country code, for example +1 416 555 0123." required error={errors.phone} /></Column>
        </Row>
      </FormGroup>

      <FormGroup legend="Address">
        <Select
          id="co-country"
          name="country"
          label="Country"
          autoComplete="country"
          placeholder="Choose a country"
          options={countries}
          required
          value={country}
          onChange={(e) => setCountry(e.currentTarget.value)}
          error={errors.country}
        />
        <TextField id="co-address1" name="address1" label="Street address" autoComplete="address-line1" required error={errors.address1} />
        <TextField id="co-address2" name="address2" label="Apartment, suite or unit" autoComplete="address-line2" error={errors.address2} />
        <Row cols={{ mobile: 1, tablet: 3, desktop: 3 }} gap="md">
          <Column span={1}><TextField id="co-city" name="city" label="City" autoComplete="address-level2" required error={errors.city} /></Column>
          <Column span={1}>
            <TextField
              id="co-state"
              name="state"
              label={country === "CA" ? "Province" : "State or region"}
              autoComplete="address-level1"
              required={stateRequired}
              helper={stateRequired ? (country === "CA" ? "Two letters, for example ON." : "Two letters, for example DE.") : undefined}
              error={errors.state}
            />
          </Column>
          <Column span={1}><TextField id="co-postal" name="postal_code" label="Postal code" autoComplete="postal-code" required error={errors.postal_code} /></Column>
        </Row>
      </FormGroup>

      <Checkbox
        id="co-agree"
        checked={agree}
        onChange={setAgree}
        required
        error={errors.agree}
        label={
          <>
            I accept the <Link href={AGREEMENT.href} style={linkStyle}>{AGREEMENT.title}</Link> on behalf of the registrant.
          </>
        }
      />

      <div>
        <Button type="submit" variant="primary" aria-disabled={busy || !agree || undefined}>
          {busy ? "Checking your domains…" : `Continue to payment, ${total} ${currency}`}
        </Button>
      </div>

      <p style={noteStyle}>
        You pay on Stripe&rsquo;s secure page, in {currency}; this site never sees your card. Your card is
        only charged once your domains are registered, and only for the ones that register. Have a promo
        code? Enter it on the payment page.
      </p>
    </form>
  );
}
