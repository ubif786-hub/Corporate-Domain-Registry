"use client";

import { CSSProperties, useCallback, useEffect, useId, useRef, useState } from "react";
import { SettingsAdjust, Close } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { registerOverlay, isTopOverlay, unregisterOverlay } from "@/components/useDialogOverlay";
import { DIALS, DIALS_STORAGE_KEY, type DialId, type DialSpec } from "@/components/masterControlsConfig";

/* ============================================================
   MasterControls — the system design dials (spacing, type, motion, radius) as a
   first-class, fork-inheritable control. A trigger button opens a popover of
   segmented dials; each dial writes its data-* attribute on <html> live and
   tokens.css does the rest (the same mechanism the docs playground and the old
   HQ drawer used, now promoted into the sync unit).

   Light/dark is NOT here (v4.5.0): it moved to the app shell's default control,
   the NavRail foot's themeToggle (NavRailThemeLink), so there is one owner of
   the theme attribute rather than two. MasterControls stays the design-dial
   playground; a product that fixes its dials ships none of it.

   Client component: it opens a panel and writes the DOM. Persistence is OPT-IN
   (v6.37.0, the owner on the HQ: a choice that resets on every reload is not a
   setting): without `persist` the choices apply for the session and reset on
   reload, the docs playground's behaviour, so a demo click never writes a
   product's stored dials; with `persist` each choice is written to localStorage
   under DIALS_STORAGE_KEY and re-applied on mount, and the layout that mounts
   the panel inlines DIALS_FLASH_GUARD (masterControlsConfig.ts) so the stored
   dials paint before the first frame rather than after hydration. Self contained
   (the dial config lives in the plain config module beside it, and it depends on
   no docs-layer control), so a fork drops <MasterControls/> into its TopBar
   utilities and inherits the whole system playground with no wiring.

   The panel only renders once opened (post-hydration), so the closed control
   never depends on client-only <html> state during hydration and there is no
   mismatch. Values are re-read from <html> each time the panel opens, so the
   dials always reflect the live state.
   ============================================================ */

type DialValues = Record<DialId, string>;

// Read the live <html> attributes (client) or fall back to the defaults (server
// / unset). Called lazily for the initial state and again whenever the panel
// opens, so the dials reflect the current state without a mount effect (which
// would trip react-hooks/set-state-in-effect).
function readDials(): DialValues {
  const values = {} as DialValues;
  const el = typeof document === "undefined" ? null : document.documentElement;
  for (const d of DIALS) {
    const live = el?.getAttribute(d.attr);
    values[d.id] = live && d.options.includes(live) ? live : d.fallback;
  }
  return values;
}

export interface MasterControlsProps {
  /** Remember each choice on this device (localStorage, DIALS_STORAGE_KEY) and re-apply it on
   *  mount. Pair it with DIALS_FLASH_GUARD in the mounting layout so a reload paints the stored
   *  dials before the first frame. Off by default: a playground resets, a product remembers. */
  persist?: boolean;
}

function readStored(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DIALS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeStored(values: Record<string, string>) {
  try {
    localStorage.setItem(DIALS_STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* storage unavailable: the attribute still applies for this session */
  }
}

export function MasterControls({ persist = false }: MasterControlsProps = {}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<DialValues>(readDials);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const openPanel = () => {
    setValues(readDials()); // reflect the current <html> state
    setOpen(true);
  };

  // The one close path for every deliberate exit (the Close button, the trigger
  // toggle, Escape): it restores focus to the trigger, the sibling overlays'
  // restoreFocus idiom. The panel unmounts on close, so a Close button that
  // had focus takes it to <body> otherwise and the keyboard user loses their
  // place (2.4.3). Until v5.10.0 only the Escape branch did this. The trigger
  // is the first button in the wrap. The outside-click path below deliberately
  // does NOT route through here: that mousedown has already put focus where
  // the user pointed, and pulling it back to the trigger would fight it.
  const closePanel = useCallback(() => {
    setOpen(false);
    wrapRef.current?.querySelector("button")?.focus({ preventScroll: true });
  }, []);

  // While open, close on outside click or Escape. The effect only wires
  // listeners (no synchronous setState), so it does not trip the
  // set-state-in-effect rule. The listeners fire setState on real events.
  useEffect(() => {
    if (!open) return;
    const token = registerOverlay("master-controls");
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Only the topmost surface acts on Escape. This panel listens on `document`,
      // which fires before every overlay's window listener, so without the stack it
      // claimed the key from whatever was actually on top, and without
      // preventDefault the overlay beneath then closed as well (A-117).
      if (!isTopOverlay(token)) return;
      e.preventDefault();
      closePanel();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      unregisterOverlay(token);
    };
  }, [open, closePanel]);

  // Re-assert the stored dials after hydration. The flash guard applied them before paint, but
  // React 19's hydration can put an <html> attribute back to the layout's value (the trap
  // CONTEXT.md records for probes); an effect that writes the attribute, and sets no state, makes
  // them stick. The panel reads the live attributes when it opens, so its state follows.
  useEffect(() => {
    if (!persist) return;
    const stored = readStored();
    for (const d of DIALS) {
      const v = stored[d.attr];
      if (typeof v === "string" && d.options.includes(v)) document.documentElement.setAttribute(d.attr, v);
    }
  }, [persist]);

  const setDial = (d: DialSpec, opt: string) => {
    document.documentElement.setAttribute(d.attr, opt);
    setValues((v) => ({ ...v, [d.id]: opt }));
    if (persist) writeStored({ ...readStored(), [d.attr]: opt });
  };

  return (
    <div data-mw-mc="" ref={wrapRef} style={wrapStyle}>
      <style href="magentaweb-master-controls" precedence="default">{css}</style>
      <Button
        iconOnly
        variant="ghost"
        size="sm"
        icon={<SettingsAdjust size={20} />}
        onClick={() => (open ? closePanel() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="System controls"
        title="System controls"
      />

      {open && (
        <div id={panelId} data-mw-mc-panel="" role="dialog" aria-label="System controls">
          <header data-mw-mc-head="">
            <span data-mw-mc-title="">Controls</span>
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              icon={<Close size={18} />}
              onClick={closePanel}
              aria-label="Close controls"
            />
          </header>
          <div data-mw-mc-dials="">
            {DIALS.map((d) => (
              <div key={d.id} data-mw-mc-dial="">
                <span data-mw-mc-label="">
                  {d.label}
                  {d.control === "slider" ? <em data-mw-mc-now="">{values[d.id]}</em> : null}
                </span>
                {d.control === "slider" ? (
                  // An AXIS, not a set of categories: the stops run warm to cold
                  // through the kit default, so a range input says what a row of
                  // buttons cannot. It is also the only shape that fits seven
                  // stops in an 18rem panel without ellipsing every label.
                  <input
                    type="range"
                    data-mw-mc-slider=""
                    min={0}
                    max={d.options.length - 1}
                    step={1}
                    value={Math.max(0, d.options.indexOf(values[d.id]))}
                    onChange={(e) => setDial(d, d.options[Number(e.currentTarget.value)])}
                    aria-label={d.label}
                    aria-valuetext={values[d.id]}
                    list={`${panelId}-${d.id}-stops`}
                  />
                ) : (
                  <div data-mw-mc-pill="" role="group" aria-label={d.label}>
                    {d.options.map((opt, i) => {
                      const active = values[d.id] === opt;
                      const isLast = i === d.options.length - 1;
                      return (
                        <button
                          key={opt}
                          type="button"
                          data-mw-mc-seg=""
                          data-active={active ? "true" : "false"}
                          aria-pressed={active}
                          onClick={() => setDial(d, opt)}
                          style={{ borderRight: isLast ? "none" : "1px solid var(--border-positive-primary)" }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
                {d.control === "slider" ? (
                  <datalist id={`${panelId}-${d.id}-stops`}>
                    {d.options.map((opt) => <option key={opt} value={d.options.indexOf(opt)} label={opt} />)}
                  </datalist>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const wrapStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

const css = `
[data-mw-mc-panel] {
  position: absolute;
  top: calc(100% + var(--space-2xs));
  right: 0;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 18rem; /* dial panel width: fits the longest segment row without wrapping */
  max-width: 92vw;
  padding: var(--space-md);
  box-sizing: border-box;
  background: var(--background-positive-primary);
  border: 1px solid var(--border-positive-primary);
  border-radius: var(--component-radius);
  box-shadow: var(--shadow-raised);
  animation: mw-mc-in var(--motion-duration) var(--motion-ease) both;
}
@keyframes mw-mc-in {
  from { opacity: 0; transform: translateY(-0.25rem); }
  to   { opacity: 1; transform: translateY(0); }
}
[data-mw-mc-head] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}
[data-mw-mc-title] {
  font-family: var(--font-brand);
  font-size: var(--type-md);
  color: var(--text-positive-primary);
}
[data-mw-mc-dials] {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
[data-mw-mc-dial] {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}
[data-mw-mc-label] {
  font-family: var(--font-code);
  font-size: var(--type-2xs);
  color: var(--text-positive-tertiary);
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}
[data-mw-mc-pill] {
  display: flex;
  border-radius: var(--component-radius);
  border: 1px solid var(--border-positive-primary);
  background: var(--background-positive-secondary);
  overflow: hidden;
}
/* The neutral dial is an AXIS: seven stops running warm to cold through the kit
   default. A range input carries that direction; seven buttons in an 18rem panel
   would give each label about 35px and ellipsis them all. */
[data-mw-mc-slider] {
  width: 100%;
  margin: 0;
  accent-color: var(--accent-base);
}
[data-mw-mc-now] {
  font-style: normal;
  float: right;
  color: var(--text-positive-secondary);
}
[data-mw-mc-seg] {
  flex: 1 1 0;
  min-width: 0;
  padding: var(--space-2xs) var(--space-xs);
  font-family: var(--font-code);
  font-size: var(--type-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: lowercase;
  text-align: center;
  color: var(--text-positive-tertiary);
  background: transparent;
  border: 0;
  cursor: pointer;
  /* AUD-3 (4 Sep 2026): the radius dial's "pronounced" option truncated to
     "pronoun..." at every width and type dial, because the fixed 18rem panel
     divided by three equal segments left less room than the longest label
     needs once --type-xs scales with the live type dial. Wrapping (rather
     than widening the shared panel, which would misalign every other dial's
     pill) lets the one long label take a second line while the other five
     — all shorter — still render on one, and the equal flex-basis keeps all
     six dials' pills the same width. */
  white-space: normal;
  overflow-wrap: break-word;
  transition:
    background var(--motion-transition),
    color var(--motion-transition);
}
[data-mw-mc-seg]:hover {
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
}
[data-mw-mc-seg][data-active="true"] {
  background: var(--accent-soft);
  color: var(--accent-emphasis);
}
[data-mw-mc-seg]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-mc-panel] { animation: none; }
}
html[data-motion="still"] [data-mw-mc-panel] { animation: none; }
`;
