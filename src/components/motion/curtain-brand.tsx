import { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/* ============================================================
   CurtainBrand — the branded cover's shared centerpiece: the BrandMark over
   the 6rem accent rule, the one visual vocabulary every curtain speaks. It
   existed as three near-copies (PageLoader's cover, the docs route curtain,
   and the route preset would have been the third); this is the one source.

   The consumer owns the SURFACE and its phases (cover, lift, fade): these
   rules carry only the group's layout, the mark/rule geometry, and the
   entrance choreography. `animate` opts into the entrance (mark rises on the
   reveal distance, the rule draws from center-left one stagger later) - the
   PageLoader plays it on first paint; a route curtain that shows the group
   with a plain fade leaves it off. The group's opacity is inherited-normal
   (1); a consumer keys fades off its own phase attribute.

   Token-driven throughout; still dial + prefers-reduced-motion collapse the
   entrance through the zeroed motion tokens. The 6rem/2px rule is one-off
   brand-mark geometry, not a layout value (the same note as the loader
   carried). Server component, self-emitted sheet.
   ============================================================ */

export interface CurtainBrandProps {
  /** Play the entrance (mark rise + rule draw) when the group first shows. */
  animate?: boolean;
  /** The centerpiece mark. Defaults to the MW BrandMark; a fork passes its
   *  own mark here (threaded through PageLoader / RouteCurtain) so its loader
   *  and route curtain speak the fork's brand, not the mother's. The rule and
   *  choreography stay shared. */
  mark?: ReactNode;
}

export function CurtainBrand({ animate = false, mark }: CurtainBrandProps) {
  return (
    <>
      <style href="magentaweb-curtain-brand" precedence="default">{curtainBrandCss}</style>
      <div data-mw-curtain-brand="" data-animate={animate ? "true" : "false"}>
        <span data-mw-curtain-mark="">{mark ?? <BrandMark size="3.5rem" />}</span>
        <span data-mw-curtain-rule="" />
      </div>
    </>
  );
}

const curtainBrandCss = `
[data-mw-curtain-brand] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}
[data-mw-curtain-mark] {
  display: inline-flex;
}
[data-mw-curtain-rule] {
  width: 6rem;
  height: 2px;
  background: var(--accent-base);
  transform-origin: 50% 50%;
}
[data-mw-curtain-brand][data-animate="true"] [data-mw-curtain-mark] {
  animation: mw-curtain-mark-in var(--motion-reveal-duration) var(--motion-ease) both;
}
[data-mw-curtain-brand][data-animate="true"] [data-mw-curtain-rule] {
  animation: mw-curtain-rule-in var(--motion-reveal-duration) var(--motion-ease) both;
  animation-delay: calc(var(--motion-stagger) * 2);
}
@keyframes mw-curtain-mark-in {
  from { opacity: 0; transform: translateY(var(--motion-reveal-distance)); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes mw-curtain-rule-in {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
`;
