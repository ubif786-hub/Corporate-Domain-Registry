import { CSSProperties, ReactNode } from "react";

/* ============================================================
   Toolbar — the list's control row on a data surface (v6.30.0, HQ v7
   system pass, theme 2): the FILTERS group leading (a Search on the sm
   rung, a SegmentedControl on the track variant, a Select where the
   options exceed four, a Checkbox with its label on the baseline, a
   ghost-styled link), the ACTIONS group trailing (a ghost Refresh with
   its stamp, then the one primary), and the live COUNT line under them
   ("12 of 40 clients"), announced politely as a search narrows the list.

   A composition with three slots; the mother stores it so every list in
   the fleet lines its controls up on one baseline and in one order:
   search, view switch, toggles, then actions. The search is the first
   thing a hand reaches for on a list and the switch is a mode, which is
   why the order is fixed and not a prop. Every child is expected on the
   sm rung (Button sm, Search sm, SegmentedControl sm), the Button sm
   height, about 35 px at the md type rung; gaps sm inside a group and lg
   between the groups. The toolbar sits at the top of the body and the
   list follows it at the block rung.

   At the phone width the row wraps: the search takes the full width on
   its own row, the switch and the primary share the next, the toggles
   the one after. The consumer moves a Refresh ghost into the panel it
   refreshes at that width; the toolbar does not know which panel that is.

   Server component: three slots and a live region, no state. The count
   line is `aria-live="polite"` so a screen reader hears "3 of 8 clients"
   as the search narrows the list without the field losing focus.
   ============================================================ */

export interface ToolbarProps {
  /** The leading group: search, view switch, toggles, links. Children on the sm rung. */
  filters?: ReactNode;
  /** The trailing group: ghosts with their stamps, then the one primary. */
  actions?: ReactNode;
  /** The live result line under the row: "12 of 40 clients". Body small, secondary,
   *  aria-live polite. Omit it for a list that never narrows. */
  count?: ReactNode;
  /** Accessible name for the toolbar landmark. Default "List controls". */
  ariaLabel?: string;
}

export function Toolbar({ filters, actions, count, ariaLabel = "List controls" }: ToolbarProps) {
  return (
    <div data-mw-toolbar="" style={rootStyle}>
      <style href="magentaweb-toolbar" precedence="default">{toolbarCss}</style>
      <div role="toolbar" aria-label={ariaLabel} style={rowStyle}>
        {filters ? <div data-mw-toolbar-filters="" style={groupStyle}>{filters}</div> : null}
        {actions ? <div data-mw-toolbar-actions="" style={groupEndStyle}>{actions}</div> : null}
      </div>
      {count != null ? (
        <p data-mw-toolbar-count="" aria-live="polite" style={countStyle}>{count}</p>
      ) : null}
    </div>
  );
}

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  minWidth: 0,
};
// The two groups on one baseline, lg apart, the actions pushed to the trailing edge.
const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm) var(--space-lg)",
};
const groupStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-sm)",
  minWidth: 0,
};
const groupEndStyle: CSSProperties = {
  ...groupStyle,
  marginLeft: "auto",
};
const countStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

/* The phone wrap. The search (the first control in the filters group) takes its own full row;
   everything else wraps by the flex rules above. Search's root already stretches; the rule
   here widens the wrap the group gives it. */
const toolbarCss = `
[data-mw-toolbar] [data-mw-search] {
  flex: 1 1 16rem;
  min-width: 12rem;
  max-width: 20rem;
}
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-mw-toolbar] [data-mw-search] {
    flex-basis: 100%;
    max-width: none;
  }
  [data-mw-toolbar-actions] {
    margin-left: 0;
    width: 100%;
  }
  [data-mw-toolbar-actions] [data-mw-button][data-variant="primary"] {
    flex: 1 1 auto;
    justify-content: center;
  }
}
`;
