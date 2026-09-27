import { CSSProperties, Fragment, ReactNode } from "react";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { LEGAL_DOCS, type Block, type Inline, type LegalDoc } from "@/data/legal";

/* Renders one CDR legal document: its effective date, its preamble, and its numbered sections.
 *
 * Two rendering rules that are not styling decisions.
 *
 * THE PREAMBLE IS NEVER IN A PANEL. It carries scope and acceptance ("by accessing the website
 * you accept this disclaimer"), and a term a reader has to click to discover is a term they can
 * fairly say they never saw. It renders above the accordion, always open.
 *
 * THE PRINTED SECTION NUMBER IS RENDERED, not derived from the array index. "Section 17" has to
 * keep meaning section 17 after someone reorders the file, and an index would silently renumber
 * a document that other documents cite by number.
 */

const dateStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
};

const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };

const noteStyle: CSSProperties = {
  margin: 0,
  padding: "var(--space-md)",
  borderInlineStart: "var(--rule-weight-strong) solid var(--border-positive-secondary)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

const linkRowsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "var(--space-sm)",
  margin: 0,
};

function renderInline(content: Inline[]): ReactNode {
  return content.map((run, i) => {
    if (typeof run === "string") return <Fragment key={i}>{run}</Fragment>;
    const external = run.external;
    return (
      <a
        key={i}
        href={run.href}
        style={linkStyle}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {run.text}
      </a>
    );
  });
}

export function LegalBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <Prose size="md">
      {blocks.map((b, i) => {
        if (b.kind === "p") return <p key={i}>{renderInline(b.content)}</p>;
        if (b.kind === "note") return <aside key={i} style={noteStyle}>{renderInline(b.content)}</aside>;
        if (b.kind === "list") {
          const items = b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>);
          return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        // A reference table. Rendered as a description list rather than a <table>: it is two
        // columns of name and address, which is what a dl is, and a dl reflows on a phone where
        // a table of long URLs does not.
        return (
          <Fragment key={i}>
            {b.caption ? <p>{b.caption}</p> : null}
            <dl style={linkRowsStyle}>
              {b.rows.map((r) => (
                <div key={r.href}>
                  <dt>{r.label}</dt>
                  <dd style={{ margin: 0 }}>
                    <a href={r.href} style={linkStyle} target="_blank" rel="noopener noreferrer">
                      {r.href}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </Fragment>
        );
      })}
    </Prose>
  );
}

/** The effective date, as a machine-readable time carrying the client's own printed label. */
export function EffectiveDate({ doc }: { doc: LegalDoc }) {
  return (
    <p style={dateStyle}>
      Effective date:{" "}
      <time dateTime={doc.effectiveDate}>{doc.effectiveDateLabel}</time>
    </p>
  );
}

/** The body of one document: preamble, then every numbered section, headings at `headingLevel`. */
export function LegalDocumentBody({ doc, headingLevel = 2 }: { doc: LegalDoc; headingLevel?: 2 | 3 }) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-group)" }}>
      <EffectiveDate doc={doc} />
      {doc.preamble.length ? <LegalBlocks blocks={doc.preamble} /> : null}
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id}>
          <Prose size="md">
            <Heading>
              {s.number !== null ? `${s.number}. ` : ""}
              {s.title}
            </Heading>
          </Prose>
          <LegalBlocks blocks={s.blocks} />
        </section>
      ))}
      {doc.incorporates?.length ? (
        <p style={dateStyle}>
          This document also incorporates{" "}
          {doc.incorporates.map((id, i, all) => (
            <Fragment key={id}>
              {i > 0 ? (i === all.length - 1 ? " and " : ", ") : ""}
              <IncorporatedLink id={id} />
            </Fragment>
          ))}
          .
        </p>
      ) : null}
    </div>
  );
}

function IncorporatedLink({ id }: { id: string }) {
  const doc = LEGAL_BY_ID[id];
  if (!doc) return <>{id}</>;
  return (
    <Link href={doc.href} style={linkStyle}>
      {doc.shortTitle.toLowerCase()}
    </Link>
  );
}

const LEGAL_BY_ID: Record<string, LegalDoc> = Object.fromEntries(LEGAL_DOCS.map((d) => [d.id, d]));
