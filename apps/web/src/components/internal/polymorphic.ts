import { RefObject } from "react";

/* ============================================================
   internal/polymorphic.ts — typing helpers for polymorphic
   components (the `as?: ElementType` pattern).
   ============================================================ */

// A polymorphic Tag's element type is chosen by the caller, so TypeScript
// resolves the JSX ref slot on a bare ElementType to an unsatisfiable type;
// no concrete RefObject can pass it. This is the one place in the system
// allowed to perform that widening. The input type keeps it honest: only a
// real DOM ref object can pass through, and the runtime contract holds
// because every Tag the motion primitives accept renders a DOM element.
export function polymorphicRef(ref: RefObject<HTMLElement | null>): never {
  return ref as never;
}
