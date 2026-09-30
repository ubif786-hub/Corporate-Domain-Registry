/* ============================================================
   PressLift — the interaction idiom (hover lift + pressed depress) promoted
   from the HQ-local convention to the system, in two scales:

   - data-mw-lift: elevated surfaces (cards, tiles). Lift on hover (a small
     rise + the raised shadow) and depress on press (drop back + a whisper of
     scale + the subtle shadow).
   - data-mw-tap: small controls (nav items, toggles, icon buttons). Depress
     on press only; hover color/background stays the control's own.

   Mark any element; mount <PressLift /> once per surface (a layout). The
   values are the HQ idiom's, verbatim. Token-driven; the still dial and
   prefers-reduced-motion drop the transforms so only color/background
   feedback remains. Server component, emits the sheet once (React dedupes
   by href).
   ============================================================ */

export function PressLift() {
  return (
    <style href="magentaweb-press-lift" precedence="default">
      {pressLiftCss}
    </style>
  );
}

const pressLiftCss = `
[data-mw-lift] {
  transition: transform var(--motion-transition), box-shadow var(--motion-transition);
}
[data-mw-lift]:hover { transform: translateY(-2px); box-shadow: var(--shadow-raised); }
[data-mw-lift]:active { transform: translateY(0) scale(0.99); box-shadow: var(--shadow-subtle); }

[data-mw-tap] {
  transition: transform var(--motion-transition), background var(--motion-transition), color var(--motion-transition);
}
[data-mw-tap]:active { transform: scale(0.95); }

@media (prefers-reduced-motion: reduce) {
  [data-mw-lift], [data-mw-lift]:hover, [data-mw-lift]:active,
  [data-mw-tap], [data-mw-tap]:active { transform: none; }
}
html[data-motion="still"] [data-mw-lift],
html[data-motion="still"] [data-mw-lift]:hover,
html[data-motion="still"] [data-mw-lift]:active,
html[data-motion="still"] [data-mw-tap],
html[data-motion="still"] [data-mw-tap]:active { transform: none; }
`;
