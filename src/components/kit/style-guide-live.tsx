"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { Stat, type StatProps } from "@/components/Stat";

/* ============================================================
   The style guide's LIVE readouts (v6.36.0, the CD reference-surface boards):
   the values the sheet prints in brackets on the boards ("[tokens.css]") because
   the sheet itself cannot know them. Each reads the document at mount and keeps
   the server render empty, so nothing is claimed before it is measured and
   nothing mismatches at hydration. Sync unit: no HQ imports.
   ============================================================ */

/** One spacing-scale row: the token name, the step drawn at its true size, the value tokens.css
    declares (passed from the build-time parse) and the pixels the step measures on this document
    (a probe the row itself lays out, read at mount and again when the spacing dial moves). */
export function SpaceRow({ token, declared }: { token: string; declared: string }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [px, setPx] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      if (probe.current) setPx(Math.round(probe.current.getBoundingClientRect().width * 10) / 10);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-spacing"] });
    return () => mo.disconnect();
  }, [token]);
  return (
    <div data-mw-sg-space="">
      <span data-mw-sg-nm="">{token}</span>
      <span><span ref={probe} data-mw-sg-bar="" style={{ width: `var(${token})` }} aria-hidden="true" /></span>
      <span data-mw-sg-t="" title={declared}>{declared}</span>
      <span data-mw-sg-t="">{px == null ? "" : `${px} px`}</span>
    </div>
  );
}

/** One dial's value as a word, read off <html> ("kit" when the neutral dial is unset). */
export function DialWord({ attr, fallback, suffix = "" }: { attr: string; fallback: string; suffix?: string }) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setValue(el.getAttribute(attr) || fallback);
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: [attr] });
    return () => mo.disconnect();
  }, [attr, fallback]);
  return <span>{value == null ? "" : value + suffix}</span>;
}

/** A Stat with a mono sub-line under its label ("0 brand-local", "2 display-reserved"): the
    record head's figure with its qualifier, the boards' stat cell. */
export function StatWithSub({ sub, ...stat }: StatProps & { sub?: ReactNode }) {
  return (
    <span style={statColStyle}>
      <Stat {...stat} />
      {sub != null ? <span style={subStyle}>{sub}</span> : null}
    </span>
  );
}

const statColStyle: CSSProperties = { display: "inline-flex", flexDirection: "column", gap: "var(--space-3xs)", maxWidth: "21rem" };
const subStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  lineHeight: "var(--leading-snug)",
};
