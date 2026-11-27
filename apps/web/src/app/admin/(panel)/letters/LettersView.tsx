"use client";

import { Fragment, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ChartColumn, Download } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { Switch } from "@/components/Switch";
import { Textarea } from "@/components/Textarea";
import { TextField } from "@/components/TextField";
import { api, ApiError, useApi } from "../../lib/api";
import { day, plural } from "../../lib/format";
import type { MailingCounts, MailingPreview, Mailings, MailingSummary, ReminderSettings } from "../../lib/types";
import { Empty, ErrorNotice, PageHead, Panel, SkelRows } from "../../ui/bits";

/* Letters: the list supplier's WHOIS lists turned into Torpedo's ten files (POST /api/admin/letters).
   Choosing the files shows the counts; creating the mailing takes the reference numbers for good. */

const six = (n: number) => String(n).padStart(6, "0");
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const count = (n: number) => n.toLocaleString("en-US");

const asError = (e: unknown) =>
  e instanceof ApiError
    ? e.status === 413 ? new ApiError(413, "too_large", "The list is too large to upload. Split it into smaller files.") : e
    : new ApiError(0, "error", "That did not work. Try again.");

const zipLink = (id: number) => `/api/admin/letters/${id}/files.zip`;

function FileCounts({ counts }: { counts: MailingCounts }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="sr-only">Letters and envelopes in each file</caption>
        <thead>
          <tr>
            <th scope="col">File for Torpedo</th>
            <th scope="col" className="num">Letters</th>
            <th scope="col" className="num">Envelopes</th>
          </tr>
        </thead>
        <tbody>
          {(["CA", "US"] as const).flatMap((c) =>
            counts[c].map((n, i) => (
              <tr key={c + i}>
                <td>
                  {c === "CA" ? "Canada" : "U.S."} batch {i + 1}
                  <span className="adm-cell-sub">{plural(i + 1, "letter")} per envelope</span>
                </td>
                <td className="num">{count(n)}</td>
                <td className="num">{count(n / (i + 1))}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function LeftOut({ counts }: { counts: MailingCounts }) {
  const rows = Object.entries(counts.dropped).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p className="quiet">Every row gets a letter.</p>;
  return (
    <dl className="adm-dl">
      {rows.map(([why, n]) => (
        <Fragment key={why}>
          <dt>{why}</dt>
          <dd className="tnum">{count(n)}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Preview({ p }: { p: MailingPreview }) {
  const letters = p.last_ref - p.first_ref + 1;
  return (
    <>
      <div className="adm-figures" style={{ borderTop: "var(--rule-weight) solid var(--border-positive-secondary)" }}>
        <div className="adm-figure">
          <span className="adm-figure-label">Rows read</span>
          <span className="adm-figure-value">{count(p.counts.rows)}</span>
        </div>
        <div className="adm-figure">
          <span className="adm-figure-label">Letters</span>
          <span className="adm-figure-value">{count(letters)}</span>
          <span className="adm-figure-note">{letters ? `Numbers ${six(p.first_ref)} to ${six(p.last_ref)}` : "Nothing to send"}</span>
        </div>
        <div className="adm-figure">
          <span className="adm-figure-label">Canada</span>
          <span className="adm-figure-value">{count(sum(p.counts.CA))}</span>
          <span className="adm-figure-note">{plural(p.counts.CA.reduce((n, l, i) => n + l / (i + 1), 0), "envelope")}</span>
        </div>
        <div className="adm-figure">
          <span className="adm-figure-label">U.S.</span>
          <span className="adm-figure-value">{count(sum(p.counts.US))}</span>
          <span className="adm-figure-note">{plural(p.counts.US.reduce((n, l, i) => n + l / (i + 1), 0), "envelope")}</span>
        </div>
      </div>
      <div className="adm-split" style={{ padding: "var(--space-lg)", borderTop: "var(--rule-weight) solid var(--border-positive-secondary)" }}>
        <FileCounts counts={p.counts} />
        <div>
          <h3 className="adm-filter-label">Left out</h3>
          <LeftOut counts={p.counts} />
        </div>
      </div>
    </>
  );
}

function History({ list }: { list: Mailings }) {
  if (!list.mailings.length) {
    return <Empty title="No mailings yet">The first mailing starts at reference number {six(list.next_ref)}.</Empty>;
  }
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="sr-only">Mailings, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Mailing</th>
            <th scope="col">Made</th>
            <th scope="col" className="num">Letters</th>
            <th scope="col">Reference numbers</th>
            <th scope="col"><span className="sr-only">Files</span></th>
          </tr>
        </thead>
        <tbody>
          {list.mailings.map((m) => (
            <tr key={m.id}>
              <td className="strong nowrap">Mailing {m.id}</td>
              <td className="nowrap">
                {day(m.created_at)}
                <span className="adm-cell-sub">by {m.created_by}</span>
              </td>
              <td className="num">
                {count(m.last_ref - m.first_ref + 1)}
                <span className="adm-cell-sub">Canada {count(sum(m.counts.CA))}, U.S. {count(sum(m.counts.US))}</span>
              </td>
              <td className="mono nowrap">{six(m.first_ref)} to {six(m.last_ref)}</td>
              <td className="nowrap">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
                  <Link className="adm-chip" href={`/admin/letters/view/?id=${m.id}`}>
                    <ChartColumn size={16} aria-hidden="true" /> Results
                  </Link>
                  <a className="adm-chip" href={zipLink(m.id)} download>
                    <Download size={16} aria-hidden="true" /> Download files
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* The reminder emails for checkouts nobody paid for (GET/POST /api/admin/reminders). They only go
   to customers who ticked "email me a reminder" at checkout. */
function ReminderForm({ start }: { start: ReminderSettings }) {
  const [on, setOn] = useState(start.on);
  const [days, setDays] = useState(start.days.join(", "));
  const [subject, setSubject] = useState(start.subject);
  const [text, setText] = useState(start.body);
  const [busy, setBusy] = useState<"" | "saving" | "testing">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function send(path: string, kind: "saving" | "testing") {
    setBusy(kind); setErrors({}); setResult(null);
    try {
      const r = await api<{ sent_to?: string }>(path, { method: "POST", body: { on, days, subject, body: text } });
      setResult({ tone: "success", text: r.sent_to ? `A sample went to ${r.sent_to}.` : on ? "Saved. Reminders are on." : "Saved. Reminders are off." });
    } catch (err) {
      const e = err as ApiError;
      if (e.field) setErrors({ [e.field]: e.message }); else setResult({ tone: "danger", text: e.message });
    } finally {
      setBusy("");
    }
  }

  const save = (e: FormEvent) => { e.preventDefault(); void send("/reminders", "saving"); };

  return (
    <form className="adm-panel-body adm-form" onSubmit={save} noValidate style={{ maxWidth: "44rem" }}>
      <Switch id="rem-on" label="Send reminder emails" checked={on} onChange={setOn}
        helper="Only to customers who ticked “Email me a reminder” at checkout and didn’t pay. Each email ends with a link to stop them." />
      <TextField id="rem-days" name="days" label="Days after the checkout" value={days} onChange={(e) => setDays(e.currentTarget.value)}
        helper="One reminder for each number, for example 2, 7 sends one after 2 days and one after 7." error={errors.days} />
      <TextField id="rem-subject" name="subject" label="Subject" value={subject} onChange={(e) => setSubject(e.currentTarget.value)} error={errors.subject} />
      <Textarea id="rem-body" name="body" label="Message" rows={7} value={text} onChange={(e) => setText(e.currentTarget.value)} error={errors.body}
        helper="{first_name} becomes the customer's first name and {domains} the domains in the order. A link to each domain and the stop link are added below your message." />
      {result ? <p className="adm-notice" data-tone={result.tone} role={result.tone === "danger" ? "alert" : "status"}>{result.text}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
        <Button type="submit" variant="primary" disabled={busy !== ""}>{busy === "saving" ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="secondary" disabled={busy !== ""} onClick={() => send("/reminders/test", "testing")}>
          {busy === "testing" ? "Sending…" : "Send me a sample"}
        </Button>
      </div>
    </form>
  );
}

function Reminders() {
  const { data, error, loading, reload } = useApi<{ settings: ReminderSettings }>("/reminders");
  return (
    <Panel title="Reminder emails">
      <ErrorNotice error={error} onRetry={reload} />
      {data ? <ReminderForm start={data.settings} /> : loading ? <SkelRows rows={4} label="Loading the reminder emails" /> : null}
    </Panel>
  );
}

export function LettersView() {
  const list = useApi<Mailings>("/letters");
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [preview, setPreview] = useState<MailingPreview | null>(null);
  const [made, setMade] = useState<MailingSummary | null>(null);
  const [busy, setBusy] = useState<"" | "reading" | "creating">("");
  const [error, setError] = useState<ApiError | null>(null);
  const [inputKey, setInputKey] = useState(0);

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])];
    setFiles([]);
    setPreview(null);
    setMade(null);
    setError(null);
    if (!picked.length) return;
    setBusy("reading");
    try {
      const read = await Promise.all(picked.map(async (f) => ({ name: f.name, text: await f.text() })));
      setPreview(await api<MailingPreview>("/letters", { method: "POST", body: { files: read } }));
      setFiles(read);
    } catch (err) {
      setError(asError(err));
    } finally {
      setBusy("");
    }
  }

  async function create() {
    setBusy("creating");
    setError(null);
    try {
      const r = await api<{ mailing: MailingSummary }>("/letters", { method: "POST", body: { files, save: true } });
      setMade(r.mailing);
      setPreview(null);
      setFiles([]);
      setInputKey((k) => k + 1);
      list.reload();
    } catch (err) {
      setError(asError(err));
    } finally {
      setBusy("");
    }
  }

  const letters = preview ? preview.last_ref - preview.first_ref + 1 : 0;

  return (
    <>
      <PageHead
        title="Letters"
        intro="Turn the list from your supplier into the ten files Torpedo prints from. Upload the list, check the counts, then create the files. Reference numbers carry on from the last mailing."
      />

      <Panel title="New mailing">
        <div className="adm-panel-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div>
            <label htmlFor="letters-files" className="adm-filter-label">List files (CSV)</label>
            <input key={inputKey} id="letters-files" type="file" accept=".csv,text/csv" multiple className="adm-input" onChange={choose} disabled={busy !== ""} aria-describedby="letters-files-help" />
            <p id="letters-files-help" className="adm-cell-sub">
              The Canada and U.S. lists, together or one at a time. Each owner goes into the Canada or U.S. files by their address.
            </p>
          </div>
          {busy === "reading" ? <p className="quiet" role="status">Reading the list…</p> : null}
          <ErrorNotice error={error} />
          {made ? (
            <div className="adm-notice" data-tone="success" role="status" style={{ flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm) var(--space-md)" }}>
              <p>
                Mailing {made.id} is ready: {plural(made.last_ref - made.first_ref + 1, "letter")}, numbers {six(made.first_ref)} to {six(made.last_ref)}.
              </p>
              <a className="adm-chip" href={zipLink(made.id)} download>
                <Download size={16} aria-hidden="true" /> Download the files for Torpedo
              </a>
            </div>
          ) : null}
        </div>
        {preview ? (
          <>
            <Preview p={preview} />
            <div className="adm-panel-body" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm) var(--space-md)", borderTop: "var(--rule-weight) solid var(--border-positive-secondary)" }}>
              <Button variant="primary" onClick={create} disabled={busy !== "" || letters < 1}>
                {busy === "creating" ? "Creating…" : "Create the files"}
              </Button>
              <span className="quiet">{letters ? `This uses reference numbers ${six(preview.first_ref)} to ${six(preview.last_ref)}.` : "No row in this list gets a letter."}</span>
            </div>
          </>
        ) : null}
      </Panel>

      <Panel title="Mailings">
        <ErrorNotice error={list.error} onRetry={list.reload} />
        {list.data ? <History list={list.data} /> : list.loading ? <SkelRows rows={3} label="Loading mailings" /> : null}
      </Panel>

      <Reminders />
    </>
  );
}
