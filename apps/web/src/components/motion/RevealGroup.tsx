import { Children, cloneElement, isValidElement, ReactElement, ReactNode } from "react";
import { Reveal, RevealProps } from "@/components/motion/Reveal";

/* ============================================================
   RevealGroup — the stagger group (owner-approved API): assigns ascending
   Reveal steps to its children automatically, so a page never hand-numbers its
   panels. Composes Reveal (no second animation implementation): a child that
   already IS a <Reveal> gets its step injected (span and style preserved); any
   other child is wrapped in one. Degradation is Reveal's own: the motion-dial
   still tier and prefers-reduced-motion collapse the animation, and the step
   knob itself derives from the reveal duration (0 at still).

   `trailing` is the "reveals last" slot for the drill-in back-button
   convention: it renders FIRST IN THE DOM (the back button sits at the top of
   the page) but takes the LAST step (start + count), so it fades in after
   every panel no matter how many there are.

   Known limits (by design, keep in mind at the call site):
   - Children.toArray counts RENDERED children: a child that conditionally
     renders null still occupies a step slot (a skipped beat, nothing breaks).
   - Manual <Reveal step> beats on the same page must sit BELOW `start`; the
     group owns [start, start + count], and trailing takes start + count.
   - A fragment passed as one child is ONE beat: Children.toArray does not
     traverse fragments, so the group wraps the whole fragment in a single
     Reveal and never adopts Reveals inside it. Spread the elements as
     direct children to give each its own beat.

   Server component; renders a fragment, so grid parents still see the Reveal
   beats as direct children (the [data-reveal-span] grid CSS keeps working).

   Naming note: part of the MOUNT-time entrance-beat family with Reveal,
   NOT the viewport-triggered RevealBlock / RevealText reveals. Full
   naming note in Reveal.tsx.
   ============================================================ */

export interface RevealGroupProps {
  /** The first child's step. Manual beats on the page stay below this. */
  start?: number;
  /** Rendered first in the DOM, revealed last (step = start + child count). */
  trailing?: ReactNode;
  children: ReactNode;
}

export function RevealGroup({ start = 0, trailing, children }: RevealGroupProps) {
  const items = Children.toArray(children);
  warnSingleChildNoOp(items, trailing);
  return (
    <>
      {trailing != null ? <Reveal step={start + items.length}>{trailing}</Reveal> : null}
      {items.map((child, i) => {
        const step = start + i;
        if (isValidElement(child) && child.type === Reveal) {
          return cloneElement(child as ReactElement<RevealProps>, { step });
        }
        return (
          <Reveal key={isValidElement(child) && child.key != null ? child.key : i} step={step}>
            {child}
          </Reveal>
        );
      })}
    </>
  );
}

/* MW-4 (3 Sep 2026): make the single-child NO-OP audible.

   The behaviour below is correct and is exactly what the header documents. The trap is that
   the WRONG call site is silent: wrap ONE element (a Row, a list) that itself contains N
   Reveals, and the group assigns a step to the wrapper and nothing to the N. Every beat
   lands on step `start`, the page fades in all at once, and there is no error, no warning,
   no type failure and no visual clue that a stagger was ever requested.

   It has now caught TWO repos independently -- zafiro (2 call sites) and magenta-web (3:
   src/app/(site)/page.tsx:98 and :185, src/app/(site)/about/page.tsx:63, a live client site
   where a stats grid and a numbered process list both land in one beat). Two-for-two is this
   studio's own threshold for a shared-layer gap rather than two coincidences, so the fix
   belongs here even though the component is not wrong.

   Deliberately a WARNING and not a behaviour change. Adopting Reveals through an arbitrary
   wrapper would mean walking children the group does not own, and the header already records
   why it does not traverse fragments. Dev only, so nothing ships to a client's runtime.

   The predicate is narrow on purpose, and each exclusion is a real, correct call site:
     - N children            -> the intended shape, no warning.
     - one child that IS a Reveal -> a legitimate one-beat group, no warning.
     - `trailing` present    -> there are two beats, the group is doing work, no warning.
   Children.toArray FLATTENS arrays, so `<RevealGroup>{items.map(...)}</RevealGroup>` reads as
   N children and is correctly silent; it does NOT flatten fragments or DOM wrappers, which is
   precisely the shape being warned about. */
function warnSingleChildNoOp(items: ReturnType<typeof Children.toArray>, trailing: ReactNode) {
  if (process.env.NODE_ENV === "production") return;
  if (trailing != null || items.length !== 1) return;
  const only = items[0];
  if (isValidElement(only) && only.type === Reveal) return;
  const what =
    isValidElement(only) && typeof only.type === "function"
      ? ((only.type as { displayName?: string; name?: string }).displayName ??
         (only.type as { name?: string }).name ?? "a component")
      : isValidElement(only)
        ? String(only.type)
        : "a text node";
  console.warn(
    `[magentaweb] RevealGroup received ONE child (${what}) that is not a <Reveal>, so it ` +
      `produces ONE beat at the group's start step and no stagger. If the Reveals are INSIDE that ` +
      `child, the group cannot see them: spread them as direct children of RevealGroup, or ` +
      `drop RevealGroup and give each inner Reveal an explicit step={i}. ` +
      `See RevealGroup.tsx (MW-4) and MOTION.md.`,
  );
}
