"use client";

import {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "@carbon/icons-react";

/* ============================================================
   Accordion — the disclosure primitive.

   WHY IT EXISTS. The atlas shipped 110 components with no accessible
   disclosure. Every fork that needed one either hand-rolled a <details>
   (unstylable across browsers, no shared keyboard model) or shipped the
   content permanently open. Surfaced on a client build,
   19 Aug 2026, where per-page FAQ blocks are a stated requirement and
   "accordions keyboard operable with correct aria state" is a stated
   acceptance criterion.

   THE LOAD-BEARING DECISION: panel content is ALWAYS IN THE DOM.

   A collapsed panel is hidden by grid-row collapse plus `inert`, never by
   conditional rendering and never by `display: none` on the content itself.
   That matters for three reasons and one of them is commercial:

   1. Crawlers and assistants read the answer. An FAQ whose answers only
      exist after a click is an FAQ that never appears in an AI answer, and
      FAQPage schema that describes text the page does not contain is a
      mismatch, not an optimisation.
   2. In-page find (ctrl+F) reaches the text.
   3. The panel can animate. Conditionally rendered content cannot.

   `inert` keeps a closed panel out of the tab order and out of the
   accessibility tree, so "in the DOM" never means "announced twice".
   React 19 passes `inert` through as a real attribute.

   HEADINGS. Each trigger is a <button> inside a real heading element whose
   level the caller sets. A disclosure list is a set of section headings, and
   flattening it to a stack of buttons breaks screen reader heading
   navigation and any heading hierarchy audit. There is no default that suits
   every page, so `headingLevel` is explicit at the call site.

   KEYBOARD, per the APG disclosure pattern: Enter and Space toggle (native
   button behaviour, not reimplemented). Arrow down and arrow up move between
   triggers, Home and End jump to the first and last. Arrow keys move focus
   only; they never open a panel, because a roving open would fight the
   single-open mode.
   ============================================================ */

export interface AccordionItem {
  /** Stable id. Falls back to the index, which is fine for a static list. */
  id?: string;
  /** The trigger. A string in almost every case. */
  title: ReactNode;
  /** Panel content. Always rendered, hidden by collapse when closed. */
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /**
   * "multiple" (default) lets any number stand open, which is right for FAQ
   * and specification lists. "single" closes the others, which is right when
   * the panels are alternatives rather than additions.
   */
  mode?: "single" | "multiple";
  /**
   * The heading level wrapping each trigger. Required thinking, not a default
   * to accept blindly: it must continue the page's outline. An accordion under
   * an h2 section heading takes 3.
   */
  headingLevel: 2 | 3 | 4 | 5 | 6;
  /** Accessible name for the list. When set, the root renders role="group" carrying it
   *  (the StatBand guard, pass 3, 27 Aug 2026); when omitted, no role is applied,
   *  because an unnamed group is noise to assistive tech and worse than none. Pass it
   *  whenever a page holds more than one list. */
  ariaLabel?: string;
  /** Fires with the ids of every open panel, after the change. Observe only. */
  onOpenChange?: (openIds: string[]) => void;
}

export function Accordion({
  items,
  mode = "multiple",
  headingLevel,
  ariaLabel,
  onOpenChange,
}: AccordionProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const idOf = useCallback(
    (item: AccordionItem, i: number) => item.id ?? `${baseId}-${i}`,
    [baseId],
  );

  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach((item, i) => {
      if (item.defaultOpen) initial.add(item.id ?? `${baseId}-${i}`);
    });
    // A single-mode accordion opened with two defaults would contradict itself
    // on first paint. First one wins, silently, rather than throwing at runtime.
    if (mode === "single" && initial.size > 1) {
      const first = [...initial][0];
      initial.clear();
      initial.add(first);
    }
    return initial;
  });

  const toggle = useCallback(
    (id: string) => {
      setOpen((prev) => {
        const next = new Set(mode === "single" ? [] : prev);
        if (prev.has(id)) next.delete(id);
        else next.add(id);
        onOpenChange?.([...next]);
        return next;
      });
    },
    [mode, onOpenChange],
  );

  // Focus movement only. Arrow keys never toggle: in single mode that would
  // collapse the panel the user is reading as they arrow past it.
  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;

    const root = rootRef.current;
    if (!root) return;
    const triggers = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-mw-accordion-trigger]:not(:disabled)"),
    ];
    if (triggers.length === 0) return;

    const current = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;

    e.preventDefault();
    const last = triggers.length - 1;
    const target =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowDown"
            ? (current + 1) % triggers.length
            : (current - 1 + triggers.length) % triggers.length;

    triggers[target].focus();
  }, []);

  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <div
      ref={rootRef}
      data-mw-accordion=""
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <style href="magentaweb-accordion" precedence="default">{css}</style>

      {items.map((item, i) => {
        const id = idOf(item, i);
        const triggerId = `${id}-trigger`;
        const panelId = `${id}-panel`;
        const isOpen = open.has(id);

        return (
          <div key={id} data-mw-accordion-item="" data-open={isOpen ? "true" : "false"}>
            <Heading data-mw-accordion-heading="">
              <button
                type="button"
                id={triggerId}
                data-mw-accordion-trigger=""
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(id)}
              >
                <span data-mw-accordion-title="">{item.title}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  data-mw-accordion-chevron=""
                  style={chevronStyle}
                />
              </button>
            </Heading>

            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              data-mw-accordion-panel=""
              inert={!isOpen}
            >
              <div data-mw-accordion-panel-inner="">{item.children}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const chevronStyle: CSSProperties = {
  flexShrink: 0,
  color: "var(--text-positive-secondary)",
};

// Rows are separated by hairline rules rather than boxed, which matches the
// FaqLedger recipe and keeps a long list from reading as a stack of cards.
//
// The collapse is a grid-template-rows transition from 0fr to 1fr. That is the
// only technique that animates to content height without measuring it in JS,
// and it degrades to an instant open where it is unsupported.
const css = `
[data-mw-accordion] {
  display: block;
  border-top: var(--rule-weight) solid var(--border-positive-secondary);
}

[data-mw-accordion-item] {
  border-bottom: var(--rule-weight) solid var(--border-positive-secondary);
}

[data-mw-accordion-heading] {
  margin: 0;
  font: inherit;
}

[data-mw-accordion-trigger] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  padding-block: var(--space-md);
  background: none;
  border: 0;
  cursor: pointer;
  text-align: start;
  color: var(--text-positive-primary);
  font-family: inherit;
  font-size: var(--type-md);
  font-weight: var(--weight-medium);
  line-height: var(--leading-snug);
  transition: color var(--motion-transition);
}

[data-mw-accordion-trigger]:hover { color: var(--text-positive-link); }

[data-mw-accordion-trigger]:focus-visible {
  /* The house keyboard ring, the same pair Button, BrandMark and BackToTop run. */
  outline: var(--focus-outline);
  outline-offset: 2px;
}

[data-mw-accordion-trigger]:disabled {
  cursor: not-allowed;
  color: var(--text-positive-tertiary);
}

[data-mw-accordion-chevron] {
  transition: transform var(--motion-transition);
}

[data-mw-accordion-item][data-open="true"] [data-mw-accordion-chevron] {
  transform: rotate(180deg);
}

[data-mw-accordion-panel] {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-transition);
}

[data-mw-accordion-item][data-open="true"] [data-mw-accordion-panel] {
  grid-template-rows: 1fr;
}

[data-mw-accordion-panel-inner] {
  overflow: hidden;
  min-height: 0;
}

[data-mw-accordion-item][data-open="true"] [data-mw-accordion-panel-inner] {
  padding-block-end: var(--space-md);
}

[data-mw-accordion-panel-inner] > :first-child { margin-block-start: 0; }
[data-mw-accordion-panel-inner] > :last-child { margin-block-end: 0; }

@media (prefers-reduced-motion: reduce) {
  [data-mw-accordion-panel],
  [data-mw-accordion-chevron] {
    transition: none;
  }
}
`;
