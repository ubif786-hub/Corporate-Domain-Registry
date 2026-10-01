"use client";

// The small parts every admin page is built from. They wear the site's dress: hairline panels on
// the secondary ground, the display face for titles, the mono register for heads and codes.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Search as SearchIcon, WarningAlt } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import type { ApiError } from "../lib/api";
import { lineWording, statusWording } from "../lib/words";

export function PageHead({ title, intro, actions, back }: { title: ReactNode; intro?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div>
      {back ? (
        <Link href={back.href} className="adm-back">
          <ArrowLeft size={16} aria-hidden="true" /> {back.label}
        </Link>
      ) : null}
      <div className="adm-page-head">
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          {intro ? <p>{intro}</p> : null}
        </div>
        {actions ? <div className="adm-page-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className="adm-panel" aria-labelledby={title ? headingId : undefined} id={id}>
      {title ? (
        <div className="adm-panel-head">
          <h2 id={headingId}>{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const w = statusWording(status);
  return <Badge tone={w.tone} textCase="sentence">{w.label}</Badge>;
}

export function LineBadge({ state }: { state: string }) {
  const w = lineWording(state);
  return <Badge tone={w.tone} textCase="sentence" icon={false}>{w.label}</Badge>;
}

export function TestTag() {
  return <Badge tone="neutral" textCase="caps" icon={false}>Test</Badge>;
}

export function Skel({ width = "100%", size }: { width?: string; size?: "lg" }) {
  return <span className="adm-skel" data-size={size} style={{ width }} aria-hidden="true" />;
}

export function SkelRows({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="adm-skel-rows" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr) minmax(0, 1fr)", gap: "var(--space-lg)" }}>
          <Skel width={`${70 + ((i * 13) % 30)}%`} />
          <Skel width={`${50 + ((i * 29) % 45)}%`} />
          <Skel width="70%" />
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }: { error: ApiError | Error | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="adm-notice" data-tone="danger" role="alert">
      <WarningAlt size={16} aria-hidden="true" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs) var(--space-md)", alignItems: "center" }}>
        <p>{error.message}</p>
        {onRetry ? <Button variant="secondary" size="xs" onClick={onRetry}>Try again</Button> : null}
      </div>
    </div>
  );
}

export function Pager({ page, pages, total, noun, onPage }: { page: number; pages: number; total: number; noun: [string, string]; onPage: (p: number) => void }) {
  if (total === 0) return null;
  return (
    <div className="adm-pager">
      <span className="tnum">
        {total.toLocaleString("en-US")} {total === 1 ? noun[0] : noun[1]}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </span>
      {pages > 1 ? (
        <div className="adm-pager-btns">
          <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Newer</Button>
          <Button variant="secondary" size="sm" icon={<ChevronRight size={16} />} iconPosition="right" disabled={page >= pages} onClick={() => onPage(page + 1)}>Older</Button>
        </div>
      ) : null}
    </div>
  );
}

/** A search box that waits for the person to stop typing before it asks. */
export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const [text, setText] = useState(value);
  const [last, setLast] = useState(value);
  if (value !== last) { setLast(value); setText(value); }
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="adm-search">
      <label className="adm-filter-label" htmlFor="adm-q">{label}</label>
      <div style={{ position: "relative" }}>
        <SearchIcon size={16} aria-hidden="true" />
        <input id="adm-q" className="adm-input" type="search" value={text} placeholder={placeholder} autoComplete="off" spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onChange(text.trim()); }} />
      </div>
    </div>
  );
}

/** Filters that live in the address bar, so a filtered list can be bookmarked or shared. The
 *  third value is false until the address has been read (after mount, in a static export), so a
 *  page does not fetch once unfiltered and again filtered. */
export function useQueryState(keys: readonly string[]): [Record<string, string>, (patch: Record<string, string | null>) => void, boolean] {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<Record<string, string> | null>(null);
  const latest = useRef<Record<string, string>>({});
  const keyList = keys.join(",");

  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const next = Object.fromEntries(keyList.split(",").map((k) => [k, q.get(k) ?? ""]));
      latest.current = next;
      setState(next);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [keyList]);

  const update = useCallback((patch: Record<string, string | null>) => {
    const next = { ...latest.current };
    for (const [k, v] of Object.entries(patch)) next[k] = v ?? "";
    latest.current = next;
    setState(next);
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const search = q.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [router, pathname]);

  return [state ?? Object.fromEntries(keys.map((k) => [k, ""])), update, state !== null];
}

export function qs(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== 0) q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}
