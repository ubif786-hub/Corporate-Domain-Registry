import { CSSProperties, ReactNode } from "react";
import { Card } from "./Card";
import { DataLabel } from "@/components/DataLabel";

/* ============================================================
   ChatContextCard — the "what the model sees" transparency panel
   (v4.3.0, from the ArtistHQ handoff: the context column beside a
   conversational AI surface).

   The trust mechanism, not decoration: a labelled list of exactly
   the state the consumer feeds the model's system prompt, rendered
   from the same data object, so the panel can never drift from the
   prompt. The component is the SHAPE only; keeping panel and prompt
   in lockstep is the consumer's contract.

   COMPOSES Card (compact padding, plain surface). Semantics are a
   definition list: each item's eyebrow is the term (the DataLabel
   metadata voice), its content the definition, so AT reads
   source-then-value as pairs. The label heads the card in the same
   mono voice, one step more present (secondary).

   Server component: a pure rendering of given items.
   ============================================================ */

export interface ChatContextItem {
  /** The item's source line, e.g. "On the easel" or "Recent entries". */
  eyebrow: string;
  content: ReactNode;
}

export interface ChatContextCardProps {
  /** The panel's heading line, e.g. "What the model sees". */
  label: string;
  items: ChatContextItem[];
}

export function ChatContextCard({ label, items }: ChatContextCardProps) {
  return (
    <Card padding="compact">
      <Card.Body>
        <div style={stackStyle}>
          <DataLabel tone="secondary">{label}</DataLabel>
          <dl style={listStyle}>
            {items.map((item, i) => (
              <div key={i} style={itemStyle}>
                <dt style={termStyle}>
                  <DataLabel>{item.eyebrow}</DataLabel>
                </dt>
                <dd style={definitionStyle}>{item.content}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------- inline styles ---------- */

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  width: "100%",
  minWidth: 0,
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  margin: 0,
};

// The eyebrow hugs its content at the tight rung (the eyebrow -> heading law).
const itemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

const termStyle: CSSProperties = {
  margin: 0,
};

const definitionStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
