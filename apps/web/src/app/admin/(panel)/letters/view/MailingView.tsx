"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useApi } from "../../../lib/api";
import { day, money, when } from "../../../lib/format";
import type { Funnel, LetterRow, LetterStatus, MailingReport } from "../../../lib/types";
import { Empty, ErrorNotice, PageHead, Panel, SkelRows, useQueryState } from "../../../ui/bits";

/* One mailing's results (GET /api/admin/letters/:id/report): the figures for Canada and the U.S.
   side by side, then every letter with how far its reader got, filterable and downloadable. */

const PAGE = 50;
const six = (n: number) => String(n).padStart(6, "0");
const count = (n: number) => n.toLocaleString("en-US");
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 1000) / 10}%` : "");

type Tone = "neutral" | "info" | "success" | "warning" | "error" | "accent";
const STATUS: Record<LetterStatus, { label: string; tone: Tone }> = {
  sent: { label: "Not scanned", tone: "neutral" },
  scanned: { label: "Scanned only", tone: "info" },
  checkout: { label: "Started checkout", tone: "warning" },
  paid: { label: "Paid, in progress", tone: "accent" },
  done: { label: "Done", tone: "success" },
  refunded: { label: "Refunded or cancelled", tone: "error" },
};
const DONE = { moved: "Moved to us", renewed: "Renewed", registered: "Registered" };
const ORDER: LetterStatus[] = ["sent", "scanned", "checkout", "paid", "done", "refunded"];

const label = (l: LetterRow) => (l.done_as ? DONE[l.done_as] : STATUS[l.status].label);

function revenue(f: Funnel) {
  const parts = [f.revenue.cad ? money(f.revenue.cad, "cad") : "", f.revenue.usd ? money(f.revenue.usd, "usd") : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "None yet";
}

function Figures({ r }: { r: MailingReport }) {
  const { CA, US } = r.countries;
  const share = (n: number, of: number, what: string) => (of ? `${pct(n, of)} of ${what}` : undefined);
  const rows: { name: string; note?: string; cell: (f: Funnel) => [string, string?] }[] = [
    { name: "Letters sent", cell: (f) => [count(f.letters)] },
    { name: "QR code scanned", cell: (f) => [count(f.scanned), share(f.scanned, f.letters, "letters")] },
    { name: "Started checkout", cell: (f) => [count(f.checkout), share(f.checkout, f.scanned, "scans")] },
    { name: "Paid", cell: (f) => [count(f.paid), share(f.paid, f.letters, "letters")] },
    { name: "Moved to us", cell: (f) => [count(f.moved)] },
    { name: "Renewed", cell: (f) => [count(f.renewed)] },
    { name: "Refunded or cancelled", cell: (f) => [count(f.refunded)] },
    { name: "Money taken", note: "After refunds, without GST/HST", cell: (f) => [revenue(f)] },
  ];
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="sr-only">Results for Canada and the U.S.</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Figure</span></th>
            <th scope="col" className="num">Canada</th>
            <th scope="col" className="num">U.S.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="strong">
                {row.name}
                {row.note ? <span className="adm-cell-sub">{row.note}</span> : null}
              </td>
              {[CA, US].map((f, i) => {
                const [v, rate] = row.cell(f);
                return (
                  <td key={i} className="num">
                    {v}
                    {rate ? <span className="adm-cell-sub">{rate}</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Letters({ rows }: { rows: LetterRow[] }) {
  if (!rows.length) return <Empty title="No letters here">Choose another filter above.</Empty>;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="sr-only">Letters in this mailing</caption>
        <thead>
          <tr>
            <th scope="col">Letter</th>
            <th scope="col">Domain</th>
            <th scope="col">Sent to</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">QR scans</th>
            <th scope="col">Checkout details</th>
            <th scope="col">Order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.ref}>
              <td className="nowrap">
                <span className="mono strong">{six(l.ref)}</span>
                <span className="adm-cell-sub">{l.country === "CA" ? "Canada" : "U.S."}, {l.envelope}</span>
              </td>
              <td className="nowrap">
                <span className="mono">{l.domain}</span>
                <span className="adm-cell-sub">Expires {day(l.expires + "T12:00:00Z")}</span>
              </td>
              <td>
                {l.name || l.company}
                {l.name && l.company ? <span className="adm-cell-sub">{l.company}</span> : null}
                <span className="adm-cell-sub">{l.city}, {l.state}</span>
              </td>
              <td className="nowrap"><Badge tone={STATUS[l.status].tone} textCase="sentence" icon={false}>{label(l)}</Badge></td>
              <td className="num">
                {l.scans ? count(l.scans) : "None"}
                {l.last_scan ? <span className="adm-cell-sub" title={when(l.last_scan)}>Last {day(l.last_scan)}</span> : null}
              </td>
              <td style={{ minWidth: "12rem" }}>
                {l.contact ? (
                  <>
                    {l.contact.name}
                    <span className="adm-cell-sub">{l.contact.email}</span>
                    <span className="adm-cell-sub">{l.contact.phone}</span>
                    <span className="adm-cell-sub">{l.contact.reminders ? "Reminders: yes" : "Reminders: no"}</span>
                  </>
                ) : <span className="quiet">None</span>}
              </td>
              <td className="nowrap">
                {l.order_id ? <Link href={`/admin/orders/view/?id=${l.order_id}`} className="row-link mono">{l.order_id}</Link> : <span className="quiet">None</span>}
                {l.revenue_cents && l.currency ? <span className="adm-cell-sub">{money(l.revenue_cents, l.currency)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MailingView() {
  const [f, set, ready] = useQueryState(["id", "status", "country", "page"]);
  const id = Number(f.id);
  const { data, error, loading, reload } = useApi<MailingReport>(ready && id > 0 ? `/letters/${id}/report` : null);
  const status = ORDER.includes(f.status as LetterStatus) ? (f.status as LetterStatus) : "";
  const country = f.country === "CA" || f.country === "US" ? f.country : "";
  const inCountry = (data?.letters ?? []).filter((l) => !country || l.country === country);
  const shown = inCountry.filter((l) => !status || l.status === status);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(f.page) || 1));
  const csv = `/api/admin/letters/${id}/report.csv?${new URLSearchParams({ ...(status ? { status } : {}), ...(country ? { country } : {}) })}`;

  if (ready && !(id > 0)) return <PageHead title="Mailing not found" back={{ href: "/admin/letters/", label: "Letters" }} />;

  return (
    <>
      <PageHead
        title={`Mailing ${id || ""} results`}
        back={{ href: "/admin/letters/", label: "Letters" }}
        intro={data
          ? `${count(data.letters.length)} letters, numbers ${six(data.mailing.first_ref)} to ${six(data.mailing.last_ref)}, made ${day(data.mailing.created_at)}. How far each reader got, from the QR code to a finished transfer.`
          : "How far each reader got, from the QR code to a finished transfer."}
        actions={
          <a className="adm-chip" href={csv} download>
            <Download size={16} aria-hidden="true" /> Download these letters (CSV)
          </a>
        }
      />
      <ErrorNotice error={error} onRetry={reload} />

      <Panel title="Canada and the U.S.">
        {data ? <Figures r={data} /> : loading ? <SkelRows rows={6} label="Loading the figures" /> : null}
      </Panel>

      <Panel title="Letters">
        <div className="adm-toolbar">
          <div className="adm-segments" role="group" aria-label="Status">
            <button type="button" className="adm-segment" aria-pressed={!status} onClick={() => set({ status: null, page: null })}>
              All <span className="mono">{count(inCountry.length)}</span>
            </button>
            {ORDER.map((s) => (
              <button key={s} type="button" className="adm-segment" aria-pressed={status === s} onClick={() => set({ status: s, page: null })}>
                {STATUS[s].label} <span className="mono">{count(inCountry.filter((l) => l.status === s).length)}</span>
              </button>
            ))}
          </div>
          <div className="adm-segments" role="group" aria-label="Country">
            {([["", "Both"], ["CA", "Canada"], ["US", "U.S."]] as const).map(([c, name]) => (
              <button key={name} type="button" className="adm-segment" aria-pressed={country === c} onClick={() => set({ country: c || null, page: null })}>
                {name}
              </button>
            ))}
          </div>
        </div>
        {data ? <Letters rows={shown.slice((page - 1) * PAGE, page * PAGE)} /> : loading ? <SkelRows rows={5} label="Loading the letters" /> : null}
        {data && pages > 1 ? (
          <div className="adm-pager">
            <span className="tnum">{count(shown.length)} letters, page {page} of {pages}</span>
            <div className="adm-pager-btns">
              <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
              <Button variant="secondary" size="sm" icon={<ChevronRight size={16} />} iconPosition="right" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</Button>
            </div>
          </div>
        ) : null}
      </Panel>
    </>
  );
}
