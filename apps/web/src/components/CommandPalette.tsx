"use client";

import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "@carbon/icons-react";
import { Kbd } from "./Kbd";
import { useDialogOverlay } from "@/components/useDialogOverlay";
import { FocusSentinel } from "@/components/internal/FocusSentinel";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   CommandPalette — the keyboard-first search overlay (Sprint 3A,
   from the ArtistHQ handoff: the ⌘K surface; PATTERNS.md pattern
   4). A body-portaled dialog on the Modal machinery: the shared
   useDialogOverlay contract (focus capture/restore, scroll lock,
   background inert on #mw-app-root, Tab trap), the --modal-scrim
   frosted veil, and the same tokenized motion; the panel sits
   high (a palette drops from the top band, it does not center).

   SEARCH: fuzzy subsequence match against each item's title,
   case-insensitive, matched characters highlighted in
   --accent-ink (weight inherited). An empty query shows every group (the "top
   actions" state). No matches shows the empty state with the
   optional fallbackAction (a real, Tab-reachable button; Enter
   also fires it while nothing matches). The empty state is a
   SIBLING below the listbox, never inside it: a listbox may own
   only options and groups, and a <p> plus a <button> inside one is
   invalid owned content whose browse-mode exposure varies by
   screen reader. The listbox simply owns nothing while it has
   nothing.

   STATUS: one always-mounted, visually hidden role="status"
   region (polite) outside the listbox announces the TRANSITION
   into the zero-result state ("No matches for q") and out of it
   (the count, once), and nothing else. Never per keystroke: a
   polite region queues rather than coalesces (DataTable's sort
   announcement records the same rule), so a count that re-fires on
   every character turns the palette into a stream of
   interruptions. It is set in the input handler, on the user's own
   action, never from an effect.

   KEYBOARD: ArrowUp/Down walk the FLAT item list across groups
   (clamped at the ends, the Listbox grammar); Enter selects the
   active item (onSelect, then the palette closes); Escape closes.
   The list scrolls the active row into view on a KEYBOARD move
   only (arrows, typing, the open reset), never on a pointer hover:
   a pointer also sets the active row, and a partially visible
   row that scrolled itself into view slid the next row under the
   still pointer, which entered, scrolled, and so on down the list
   (the Combobox rule, pass 4, 27 Aug 2026). A pointer sets the row
   only when it actually MOVED, which is the other half of that
   pair: see setActiveFromPointer.

   OVERLAY LAYERING (the stack-sanity contract): Escape is
   claimed at the ELEMENT level, on the panel's own keydown, with
   preventDefault before it bubbles to window. Parent overlays
   (a Modal, the drawer) listen at window through useDialogOverlay,
   whose handlers yield to a defaultPrevented event, so one Escape
   closes the palette FIRST and a second closes the parent, in
   order, regardless of listener registration order. The hook's
   own window-level Escape stays on as a backstop for the case
   where focus has left the panel entirely.

   ARIA: the combobox-with-listbox pattern the kit already speaks
   (Combobox/Listbox): the input is role="combobox" wired by
   aria-activedescendant; groups are role="group" labelled by
   their heading; items are role="option".
   ============================================================ */

// The trap's focusable set is the hook's DIALOG_FOCUSABLE_SELECTOR (hoisted in pass 4,
// 27 Aug 2026, from the verbatim copy that sat here); containment past an <iframe> is
// the FocusSentinel pair at the panel's edges in the JSX below.

export interface CommandPaletteItem {
  /** Leading glyph (a Carbon icon element). */
  icon?: ReactNode;
  title: string;
  /** Quiet mono context after the title ("Works", "Jul 8"). */
  meta?: string;
  onSelect: () => void;
  /** Shortcut hint rendered as Kbd at the row's end ("⌘L"). */
  shortcut?: string;
}

export interface CommandPaletteGroup {
  title: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  /** Controlled open state; the consumer owns the ⌘K binding. */
  open: boolean;
  /** Called by every dismiss path (Escape, scrim click, select). */
  onClose: () => void;
  resultGroups: CommandPaletteGroup[];
  /** The no-matches escape hatch ("Create 'q'"). Tab reaches it; Enter fires it while nothing matches. */
  fallbackAction?: { label: string; onSelect: () => void };
  /** Input placeholder. */
  placeholder?: string;
  /** Accessible dialog name. Default "Command palette". */
  "aria-label"?: string;
}

/* Fuzzy subsequence match: every query character must appear in the title in
   order (case-insensitive). Returns the matched title indices for
   highlighting, or null for no match. Whitespace in the query is ignored so
   "lt3" and "l t 3" behave alike. */
function fuzzyMatch(title: string, query: string): number[] | null {
  const q = query.replace(/\s+/g, "").toLowerCase();
  if (!q) return [];
  const t = title.toLowerCase();
  const matched: number[] = [];
  let ti = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    matched.push(found);
    ti = found + 1;
  }
  return matched;
}

/* The query-character highlight: matched characters take --accent-ink; the weight
   is inherited (no bolding), and the rest of the title keeps the row's ink. */
function HighlightedTitle({ title, matched }: { title: string; matched: number[] }) {
  if (matched.length === 0) return <>{title}</>;
  const matchedSet = new Set(matched);
  const parts: ReactNode[] = [];
  let run = "";
  let runMatched = matchedSet.has(0);
  const flush = (key: number) => {
    if (!run) return;
    parts.push(
      runMatched ? (
        <mark key={key} data-mw-palette-match="" style={matchStyle}>
          {run}
        </mark>
      ) : (
        <span key={key}>{run}</span>
      ),
    );
  };
  for (let i = 0; i < title.length; i++) {
    const isMatch = matchedSet.has(i);
    if (isMatch !== runMatched) {
      flush(i);
      run = "";
      runMatched = isMatch;
    }
    run += title[i];
  }
  flush(title.length);
  return <>{parts}</>;
}

interface FlatItem {
  item: CommandPaletteItem;
  matched: number[];
  groupIndex: number;
}

/* The filter: fuzzy per item, groups keep their order, empty groups drop. The
   flat list is what the arrows walk; per-group slices render from it, and each
   group carries its offset into the flat list so the render never counts with
   a cursor of its own. Pure, so the input handler can run it against the NEXT
   query and decide whether the result count is crossing zero (the status
   announcement). */
function filterGroups(resultGroups: CommandPaletteGroup[], query: string) {
  const groups: { title: string; items: FlatItem[]; offset: number }[] = [];
  const flat: FlatItem[] = [];
  resultGroups.forEach((group, groupIndex) => {
    const items: FlatItem[] = [];
    for (const item of group.items) {
      const matched = fuzzyMatch(item.title, query);
      if (matched !== null) items.push({ item, matched, groupIndex });
    }
    if (items.length > 0) {
      groups.push({ title: group.title, items, offset: flat.length });
      flat.push(...items);
    }
  });
  return { groups, flat };
}

export function CommandPalette({
  open,
  onClose,
  resultGroups,
  fallbackAction,
  placeholder = "Type a command or search",
  "aria-label": ariaLabel = "Command palette",
}: CommandPaletteProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // The status region's text (see STATUS in the header): set only when the
  // result count crosses zero, in the input handler, never per keystroke.
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pointerDownOnScrimRef = useRef(false);
  // Who moved the active row last. The scroll-into-view effect below runs for a
  // keyboard move (arrows, typing, the open reset) and skips a pointer one (see
  // KEYBOARD in the header for the cascade a pointer-driven scroll produced).
  const activeSourceRef = useRef<"keyboard" | "pointer">("keyboard");
  const id = useId();
  const listId = `${id}-list`;

  // Client-only portal target (the Modal SSR guard).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate client-only gate: createPortal targets are client-only (the Modal precedent).
    setMounted(true);
  }, []);

  // Every open starts at the top-actions state: empty query, first item active.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate reset-on-open: a reopened palette must not carry the last session's query.
      setQuery("");
      activeSourceRef.current = "keyboard";
      setActiveIndex(0);
      setAnnouncement("");
    }
  }, [open]);

  // The shared overlay contract, Modal's exact configuration: focus lands in
  // the input on open, the page scroll-locks, and #mw-app-root goes inert.
  // closeOnEsc stays on as the window-level backstop; the primary Escape path
  // is the element-level handler below (see the layering note in the header).
  useDialogOverlay({
    open,
    trapRef: panelRef,
    initialFocusRef: inputRef,
    onClose,
    closeOnEsc: true,
    lockScroll: true,
    inertTarget: () => document.getElementById("mw-app-root"),
  });

  const { groups, flat } = useMemo(() => filterGroups(resultGroups, query), [resultGroups, query]);

  const noMatches = flat.length === 0;

  // The query change: filter state, then the status text if, and only if, the
  // count crosses zero in either direction (the DataTable idiom: set on the
  // user's action, never from an effect, never on a count that merely changed).
  const onQueryChange = (next: string) => {
    setQuery(next);
    activeSourceRef.current = "keyboard";
    setActiveIndex(0);
    const nextCount = filterGroups(resultGroups, next).flat.length;
    const nextEmpty = nextCount === 0;
    if (nextEmpty !== noMatches) {
      const q = next.trim();
      setAnnouncement(
        nextEmpty
          ? `No matches${q ? ` for "${q}"` : ""}.`
          : `${nextCount} ${nextCount === 1 ? "result" : "results"}.`,
      );
    }
  };
  const clampedActive = Math.min(activeIndex, Math.max(flat.length - 1, 0));

  // Keep the active option in view while the arrows walk a long list. Keyboard
  // moves only: a pointer-set active row is already under the pointer, and
  // scrolling it fully into view used to slide the next row under the still
  // pointer, which entered and scrolled in turn (pass 4, 27 Aug 2026).
  //
  // The LIST is scrolled, never scrollIntoView: that walks every scrollable
  // ancestor up to the viewport (the Listbox and Combobox rule). The palette
  // panel is fixed, so nothing above it scrolls today, but the row lives two
  // levels down inside a role="group" wrapper, and a rect comparison against the
  // scroller handles that nesting without caring about the depth.
  useEffect(() => {
    if (!open || activeSourceRef.current === "pointer") return;
    const list = listRef.current;
    const row = list?.querySelector(`[id="${CSS.escape(`${id}-opt-${clampedActive}`)}"]`);
    if (!list || !row) return;
    const l = list.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = l.top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (r.top < top) list.scrollTop -= top - r.top;
    else if (r.bottom > bottom) list.scrollTop += r.bottom - bottom;
  }, [open, clampedActive, id]);

  // A pointer sets the active row, but ONLY when the pointer actually moved.
  // Any scroll re-fires the hover events on whatever row lands under a
  // STATIONARY pointer, and that row sits BEHIND the one the arrows just
  // reached, so the highlight walks backwards (measured on Combobox, 27 Aug
  // 2026; the palette shares the model). The pass-4 source guard above stopped
  // the CASCADE, not this: it keeps a pointer-set row from scrolling again, and
  // the backwards step happens before that. Chromium re-dispatches the move at
  // the last real pointer position, so comparing coordinates separates a user's
  // move from the browser's bookkeeping; pointermove rather than pointerenter
  // because enter cannot tell the two apart.
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const setActiveFromPointer = (index: number, x: number, y: number) => {
    if (lastPointer.current && lastPointer.current.x === x && lastPointer.current.y === y) return;
    lastPointer.current = { x, y };
    activeSourceRef.current = "pointer";
    setActiveIndex(index);
  };

  const select = (flatItem: FlatItem) => {
    flatItem.item.onSelect();
    onClose();
  };

  // Element-level keys: Escape is claimed HERE (preventDefault marks the event
  // consumed before it reaches any overlay's window listener, so the palette
  // closes before a parent drawer or modal would). Arrows and Enter drive the
  // flat list; Enter with no matches fires the fallback.
  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSourceRef.current = "keyboard";
      setActiveIndex(Math.min(clampedActive + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSourceRef.current = "keyboard";
      setActiveIndex(Math.max(clampedActive - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!noMatches && flat[clampedActive]) {
        select(flat[clampedActive]);
      } else if (noMatches && fallbackAction) {
        fallbackAction.onSelect();
        onClose();
      }
    }
  };

  if (!mounted) return null;

  // Scrim click dismiss with the Modal's slipped-press guard.
  const onScrimMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    pointerDownOnScrimRef.current = e.target === e.currentTarget;
  };
  const onScrimClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && pointerDownOnScrimRef.current) onClose();
    pointerDownOnScrimRef.current = false;
  };

  const surface = (
    <div
      data-mw-palette-scrim=""
      data-open={open ? "true" : "false"}
      data-lenis-prevent=""
      inert={!open}
      onMouseDown={onScrimMouseDown}
      onClick={onScrimClick}
    >
      <div
        ref={panelRef}
        data-mw-palette-panel=""
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        <FocusSentinel edge="start" trapRef={panelRef} />
        <div data-mw-palette-head="">
          <Search size={16} aria-hidden="true" data-mw-palette-search-icon="" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={!noMatches ? `${id}-opt-${clampedActive}` : undefined}
            placeholder={placeholder}
            value={query}
            data-mw-palette-input=""
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* The listbox owns groups and options only; with no matches it owns
            nothing (and collapses its padding, see the sheet). The empty state
            and the status region are its siblings.
            tabIndex -1 keeps the list out of the tab sequence: Chromium 130+
            makes a scrollable element with no focusable children a keyboard tab
            stop, and this one scrolls (overflow-y auto, max-height in the sheet)
            while its rows are plain divs. Without it, Tab from the input landed
            on the results panel itself instead of the fallback button, but only
            once the results overflowed, which is why it survived the pass-2
            sweep that gave Combobox and MultiSelect the same attribute
            (Combobox's list, reasoned there in full). */}
        <div ref={listRef} id={listId} role="listbox" aria-label="Results" data-mw-palette-list="" tabIndex={-1}>
          {groups.map((group) => (
            <div key={group.title} role="group" aria-label={group.title} data-mw-palette-group="">
              <div aria-hidden="true" data-mw-palette-group-title="">
                {group.title}
              </div>
              {group.items.map((flatItem, itemIndex) => {
                // The flat index (aria-activedescendant walks the flat list) from
                // the group's offset, not a cursor mutated inside this callback.
                const flatIndex = group.offset + itemIndex;
                const active = flatIndex === clampedActive;
                return (
                  <div
                    key={`${flatItem.groupIndex}-${flatItem.item.title}`}
                    id={`${id}-opt-${flatIndex}`}
                    role="option"
                    aria-selected={active}
                    data-mw-palette-option=""
                    data-active={active ? "true" : "false"}
                    onPointerDown={(e) => {
                      // pointerdown (the Combobox precedent) so focus never
                      // leaves the input before the selection lands.
                      e.preventDefault();
                      select(flatItem);
                    }}
                    onPointerMove={(e) => setActiveFromPointer(flatIndex, e.clientX, e.clientY)}
                  >
                    {flatItem.item.icon ? (
                      <span aria-hidden="true" data-mw-palette-option-icon="">
                        {flatItem.item.icon}
                      </span>
                    ) : null}
                    <span data-mw-palette-option-title="">
                      <HighlightedTitle title={flatItem.item.title} matched={flatItem.matched} />
                    </span>
                    {flatItem.item.meta ? (
                      <span data-mw-palette-option-meta="">{flatItem.item.meta}</span>
                    ) : null}
                    {flatItem.item.shortcut ? (
                      <span data-mw-palette-option-shortcut="">
                        <Kbd>{flatItem.item.shortcut}</Kbd>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {noMatches ? (
          <div data-mw-palette-empty="">
            <p data-mw-palette-empty-line="">
              No matches{query.trim() ? <> for &quot;{query.trim()}&quot;</> : null}.
            </p>
            {fallbackAction ? (
              <button
                type="button"
                data-mw-palette-fallback=""
                onClick={() => {
                  fallbackAction.onSelect();
                  onClose();
                }}
              >
                {fallbackAction.label}
                <Kbd>↵</Kbd>
              </button>
            ) : null}
          </div>
        ) : null}
        <span role="status" aria-live="polite" data-mw-palette-status="" style={srOnly}>
          {announcement}
        </span>
        <FocusSentinel edge="end" trapRef={panelRef} />
      </div>
    </div>
  );

  return (
    <>
      <style href="magentaweb-command-palette" precedence="default">
        {paletteCss}
      </style>
      {createPortal(surface, document.body)}
    </>
  );
}

/* ---------- styles ---------- */

const matchStyle: CSSProperties = {
  background: "transparent",
  color: "var(--accent-ink)",
  fontWeight: "inherit",
};

const paletteCss = `
[data-mw-palette-scrim] {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* The palette drops from the top band; the top gap is viewport-relative so
     it rides tall and short screens without a breakpoint. */
  padding: clamp(var(--space-xl), 14vh, var(--space-6xl)) var(--space-lg) var(--space-lg);
  background: var(--modal-scrim);
  backdrop-filter: blur(var(--overlay-blur));
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-palette-scrim][data-open="true"] {
  opacity: 1;
  pointer-events: auto;
}
[data-mw-palette-panel] {
  display: flex;
  flex-direction: column;
  width: min(var(--modal-width-md), 100%);
  max-height: 100%;
  overflow: hidden;
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  /* Entry offset rides the motion dial (gentle 12px / 0.96, sharp 8px / 0.97,
     still none); the old literals here were the sharp values. */
  transform: translateY(calc(-1 * var(--motion-reveal-distance))) scale(var(--motion-reveal-scale));
  transition: transform var(--motion-duration) var(--motion-ease);
  outline: none;
}
[data-mw-palette-scrim][data-open="true"] [data-mw-palette-panel] {
  transform: translateY(0) scale(1);
}

[data-mw-palette-head] {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-positive-secondary);
}
[data-mw-palette-search-icon] {
  flex: 0 0 auto;
  color: var(--text-positive-tertiary);
}
[data-mw-palette-input] {
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--space-2xs) 0;
  font-family: var(--font-body);
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026). AUD-2 named this
     one a low-consequence member of the CG-1 class and left it to "fold in or get a
     sanction comment"; this is the fold-in. A single-line search field takes the same
     leading as every other single-line field. */
  line-height: var(--leading-tight);
  font-size: var(--type-md);
  color: var(--text-positive-primary);
  background: transparent;
  border: none;
  outline: none;
}
[data-mw-palette-input]::placeholder {
  color: var(--text-positive-tertiary);
}

[data-mw-palette-list] {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-xs);
  max-height: 24rem; /* results viewport: about six rows before the list scrolls; deliberate fixed cap */
}
/* Owning nothing, the listbox takes no room: the empty state below it keeps
   the panel's rhythm on its own padding. */
[data-mw-palette-list]:empty {
  padding: 0;
}
[data-mw-palette-group] + [data-mw-palette-group] {
  margin-top: var(--space-sm);
}
[data-mw-palette-group-title] {
  padding: var(--space-2xs) var(--space-sm);
  font-family: var(--font-code);
  font-size: var(--type-2xs);
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-positive-tertiary);
}
[data-mw-palette-option] {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--component-radius);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  cursor: pointer;
}
[data-mw-palette-option][data-active="true"] {
  background: var(--accent-wash);
  color: var(--text-positive-primary);
}
[data-mw-palette-option-icon] {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--text-positive-tertiary);
}
[data-mw-palette-option][data-active="true"] [data-mw-palette-option-icon] {
  color: var(--accent-ink);
}
[data-mw-palette-option-title] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-mw-palette-option-meta] {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-code);
  font-size: var(--type-2xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-positive-tertiary);
}
[data-mw-palette-option-shortcut] {
  margin-left: auto;
  flex: 0 0 auto;
}
/* A meta cell already stretches; keep the shortcut pinned right either way. */
[data-mw-palette-option-meta] + [data-mw-palette-option-shortcut] {
  margin-left: 0;
}

[data-mw-palette-empty] {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
}
[data-mw-palette-empty-line] {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-tertiary);
}
[data-mw-palette-fallback] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--accent-ink);
  background: var(--accent-wash);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  cursor: pointer;
  transition: background var(--motion-transition);
}
[data-mw-palette-fallback]:hover {
  background: var(--accent-wash-strong);
}
[data-mw-palette-fallback]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;
