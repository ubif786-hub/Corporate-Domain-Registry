"use client";

import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { TRANSFER_STEPS, transferGuide, type TransferCodeResponse } from "@cdr/shared";
import { Button } from "@/components/Button";
import { CalloutCard } from "@/components/CalloutCard";
import { Heading } from "@/components/Heading";
import { TextField } from "@/components/TextField";
import { formatDate } from "@/data/lookup";
import { CONTACT } from "@/data/site";

// Where the customer sends a domain's transfer code. It only shows what the API returns.

const stackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)", maxWidth: "var(--measure-prose)" };
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };
const stepsStyle: CSSProperties = { ...bodyStyle, paddingLeft: "var(--space-lg)", listStyle: "decimal" };
const stepStyle: CSSProperties = { marginBottom: "var(--space-xs)", paddingLeft: "var(--space-2xs)" };
const guideStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-sm)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)", textDecoration: "underline" };
const formStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-md)" };
const domainStyle: CSSProperties = { fontFamily: "var(--font-code)", overflowWrap: "anywhere" };

const ORDER_ID = /^\d{8}-[a-f0-9]{10}$/;
const TOKEN = /^[a-f0-9]{32}$/;

interface CodeLink { order: string; line: number; t: string }

export function TransferCodeView() {
  const [link, setLink] = useState<CodeLink | null | undefined>(undefined);
  const [view, setView] = useState<TransferCodeResponse | null>(null);
  const [lost, setLost] = useState(false);
  const [down, setDown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const order = p.get("order") ?? "";
    const line = p.get("line") ?? "";
    const t = p.get("t") ?? "";
    // The URL is only readable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLink(ORDER_ID.test(order) && /^\d{1,3}$/.test(line) && TOKEN.test(t) ? { order, line: Number(line), t } : null);
  }, []);

  useEffect(() => {
    if (!link) return;
    let live = true;
    fetch(`/api/transfer-code/?order=${link.order}&line=${link.line}&t=${link.t}`, { cache: "no-store" })
      .then(async (res) => {
        if (!live) return;
        if (res.ok) setView(await res.json());
        else if (res.status === 404) setLost(true);
        else setDown(true);
      })
      .catch(() => { if (live) setDown(true); });
    return () => { live = false; };
  }, [link]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!link || busy) return;
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    if (!code) { setError("Enter the transfer code."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transfer-code/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: link.order, line: link.line, t: link.t, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setView(data);
      else setError(data.message ?? "The code could not be sent. Try again in a moment.");
    } catch {
      setError("We could not be reached. Check your connection and try again.");
    }
    setBusy(false);
  }

  const contact = <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>;

  if (link === undefined) return null;
  if (link === null || lost) {
    return (
      <div style={stackStyle}>
        <p style={bodyStyle}>This link is not valid. Use the link in the email we sent you after your order.</p>
        <p style={bodyStyle}>Questions go to {contact}.</p>
      </div>
    );
  }
  if (!view) {
    return (
      <p style={bodyStyle} role="status" aria-live="polite">
        {down ? <>This page could not be loaded. Try again in a few minutes, or write to {contact}.</> : "Loading…"}
      </p>
    );
  }

  const domain = <span style={domainStyle}>{view.domain}</span>;
  const heading = <Heading level={2} size={4}>{view.domain}</Heading>;

  if (view.status === "received") {
    return (
      <div style={stackStyle} role="status" aria-live="polite">
        {heading}
        <p style={bodyStyle}>
          We have the code for {domain} and the move has started. Your current company may email you to confirm the
          transfer or to offer you a discount to stay: don&rsquo;t cancel the transfer. The move usually finishes within a
          week, and we email you as soon as it is done.
        </p>
        <p style={bodyStyle}>Your website and email keep working while the domain moves.</p>
      </div>
    );
  }
  if (view.status === "transferred") {
    return (
      <div style={stackStyle}>
        {heading}
        <p style={bodyStyle}>{domain} has moved to Corporate Domain Registry. Nothing more is needed from you.</p>
      </div>
    );
  }
  if (view.status === "closed") {
    return (
      <div style={stackStyle}>
        {heading}
        <p style={bodyStyle}>This transfer is closed. If it did not go through, it has been refunded; the email we sent you has the details.</p>
        <p style={bodyStyle}>Questions go to {contact}.</p>
      </div>
    );
  }

  const guide = transferGuide(view.registrar);
  const left = view.attempts_left ?? 0;
  return (
    <div style={stackStyle}>
      {heading}
      <p style={bodyStyle}>
        To move {domain} to Corporate Domain Registry, we need its transfer code from {view.registrar ?? "the company it is with now"}.
        The code is also called an authorization code, auth code or EPP code.
      </p>

      {view.last_error ? (
        <CalloutCard
          tone="warning"
          title="The last code did not work"
          body={
            <>
              The reply we got: &ldquo;{view.last_error}&rdquo;. Check that the transfer lock is off, get a new code and send it below.
              {" "}You can send {left} more {left === 1 ? "code" : "codes"}.
            </>
          }
        />
      ) : null}

      <div style={guideStyle}>
        <Heading level={3} size={5}>{guide ? `How to get the code at ${guide.name}` : "How to get the code"}</Heading>
        <ol style={stepsStyle}>
          {(guide?.steps ?? TRANSFER_STEPS).map((s) => <li key={s} style={stepStyle}>{s}</li>)}
        </ol>
        {guide ? (
          <p style={bodyStyle}>
            <a href={guide.url} target="_blank" rel="noreferrer" style={linkStyle}>{guide.name}&rsquo;s own instructions</a>
          </p>
        ) : null}
      </div>

      <form onSubmit={submit} style={formStyle} aria-busy={busy} noValidate>
        <TextField
          id="tc-code"
          name="code"
          label="Transfer code"
          helper="Paste it exactly as your current company gave it."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          error={error ?? undefined}
        />
        <div>
          <Button type="submit" variant="primary" aria-disabled={busy || undefined}>
            {busy ? "Sending…" : "Send the code"}
          </Button>
        </div>
      </form>

      <p style={bodyStyle}>
        Your website and email keep working while the domain moves, and the years you paid for are added on top of the
        current expiry.
        {view.refund_after ? <> If we don&rsquo;t receive a working code by {formatDate(view.refund_after)}, we refund it in full.</> : null}
      </p>
      <p style={bodyStyle}>Questions go to {contact}.</p>
    </div>
  );
}
