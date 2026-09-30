/* ============================================================
   subscribeMotionActive — the LIVE motion gate.

   A motion primitive that attaches imperative listeners has to answer two
   questions, not one: is motion allowed right now, and what happens when that
   answer changes. Reading `data-motion` (or matchMedia) once inside a mount
   effect answers only the first, so a dial flip on a docs page leaves the
   primitive running at its old setting until the next navigation. That was
   A-107, live in Magnetic, Parallax and ScrollScene; the same shape left
   useScrollProgress reading no dial at all.

   SmoothScroll already solved it with a MutationObserver plus a restart. This
   is that pattern extracted, so the four primitives that need it share ONE
   implementation instead of four near-copies.

   `apply` runs immediately with the current answer, and again whenever the
   answer CHANGES. Return a teardown from it to release whatever it attached;
   the teardown runs before the next `apply` and once more when the returned
   unsubscribe is called.

   Two things a caller must know:

   1. It re-runs on the ANSWER, not on the attribute. Flipping gentle to sharp
      does not tear anything down, because both are motion. A primitive that
      needs to re-read a token on every dial change wants its own observer, not
      this: that is why SmoothScroll keeps one (it re-reads --mw-scroll-lerp on
      every flip) and why that is not drift.

   2. Going inactive must RESTORE the resting state, not merely skip the
      attach. Anything a primitive wrote stays written otherwise. ScrollScene
      is the worked example: it clears --mw-scene-progress, because leaving the
      last scrubbed value on the node would rest the composition partly
      revealed while its own documented contract promises fully revealed.
   ============================================================ */

export type MotionTeardown = (() => void) | void;

export function subscribeMotionActive(
  apply: (active: boolean) => MotionTeardown,
): () => void {
  // Client-only by construction (every caller is inside an effect), but the
  // guard keeps the module import-safe from a server component.
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const root = document.documentElement;
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let teardown: MotionTeardown;
  let last: boolean | null = null;

  const isActive = () =>
    !reduceQuery.matches && root.getAttribute("data-motion") !== "still";

  const release = () => {
    teardown?.();
    teardown = undefined;
  };

  const run = () => {
    const active = isActive();
    if (active === last) return;
    last = active;
    release();
    teardown = apply(active);
  };

  run();

  // The dial is an attribute on <html>, and the docs MasterControls flips it
  // live on a mounted tree. The OS preference can change mid-session too.
  const observer = new MutationObserver(run);
  observer.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
  reduceQuery.addEventListener("change", run);

  return () => {
    observer.disconnect();
    reduceQuery.removeEventListener("change", run);
    release();
  };
}
