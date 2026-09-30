/* ============================================================
   AccentRule — the ONE accent-strip mechanism (v4.8.0). The left accent rule
   was drawn four ways (Card's 2px border-left, Toast's 3px, ChatMessage's 2px,
   the HQ funnel's 3px) and a BORDER breaks on the radius dial: with rounded
   corners the coloured border paints the corner arcs up to the 45° miter, then
   the hairline colour takes over — a colour seam mid-curve at soft/pronounced.

   The unified strip is an INSET ROUNDED BAR (::before), not a border:
   - the host keeps a transparent 2px left border, so content geometry is
     byte-identical to the old coloured border;
   - the bar insets from each end by the container radius, so at SHARP it spans
     the full edge exactly as before, and at soft/pronounced it terminates
     cleanly before the curve instead of fighting it;
   - the bar's own radius follows --component-radius (square ends at sharp,
     capped ends when the dial rounds).

   USAGE: render <AccentRuleStyle/> once in the consumer, stamp the host with
   data-mw-accent-rule="accent|success|warning|danger|info" (the Card tone set),
   or stamp a bare data-mw-accent-rule="" and set --mw-accent-rule-color inline
   for a custom scale (the HQ funnel's temperature signals).

   Doubled-attribute selectors (0,2,0) out-rank every single-attribute host rule
   regardless of sheet order, so the transparent border and the strip always win
   without relying on style-injection order.
   ============================================================ */

export function AccentRuleStyle() {
  return (
    <style href="magentaweb-accent-rule" precedence="default">
      {css}
    </style>
  );
}

const css = `
[data-mw-accent-rule][data-mw-accent-rule] {
  position: relative;
  border-left: 3px solid transparent;
}
[data-mw-accent-rule][data-mw-accent-rule]::before {
  content: "";
  position: absolute;
  left: -3px;
  width: 3px;
  /* v4.8.0 tune: 3px (one weight, every consumer — Card / CalloutCard / AiCard /
     Toast / ChatMessage / HQ funnel; the old per-consumer 2px/3px drift stays
     dead). Insets ride --mw-accent-rule-inset, the tuned ~60%-of-radius token
     (tokens.css): the full-radius inset read truncated, so each dial's inset
     is an optical call, not a calc() of the radius. At sharp the strip spans
     the full edge; rounded dials stand it off just clear of the curve. */
  top: var(--mw-accent-rule-inset, var(--component-radius));
  bottom: var(--mw-accent-rule-inset, var(--component-radius));
  border-radius: var(--component-radius);
  background: var(--mw-accent-rule-color, var(--accent-base));
  pointer-events: none;
}
[data-mw-accent-rule="accent"]  { --mw-accent-rule-color: var(--accent-base); }
[data-mw-accent-rule="success"] { --mw-accent-rule-color: var(--status-success-accent); }
[data-mw-accent-rule="warning"] { --mw-accent-rule-color: var(--status-warning-accent); }
[data-mw-accent-rule="danger"]  { --mw-accent-rule-color: var(--status-danger-accent); }
[data-mw-accent-rule="info"]    { --mw-accent-rule-color: var(--status-info-accent); }
`;
