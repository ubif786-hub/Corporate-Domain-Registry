"use client";

import {
  CSSProperties,
  ElementType,
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";
import { polymorphicRef } from "@/components/internal/polymorphic";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   RevealText — splits a string into letters, words, or lines and
   staggers their fade-up. Word integrity is preserved: in "letter"
   mode each word becomes an inline-block wrapping its inline-block
   letters, so a word never breaks across a line.

   Whitespace handling differs per variant:
   - letter: actual space character renders between word-wrappers
     (not a stagger target)
   - word:   literal whitespace renders between word spans via a plain
     Fragment (not a stagger target)
   - line:   newlines split the input; each line is a block div

   What assistive tech reads (pass 3, 27 Aug 2026): inline-block boxes
   are separate text runs, so a letter-split headline was announced
   "B, o, l, d" and a word-split one word by word. The pieces are now
   aria-hidden and ONE visually hidden copy of the intact string (the
   srOnly idiom, role-independent, so it holds whether `as` is a span,
   a p, or an h1) sits beside them inside the Tag. `children` is typed
   string, so the hidden copy is byte-identical to the visible text
   (2.5.3 Label in Name holds). The line variant keeps its natural
   reading: block lines read as lines. Not aria-label: span and p do
   not support naming from author, and hiding the pieces while relying
   on it could delete the headline from the tree.

   Letters are GRAPHEMES, not code points (same pass): Array.from
   iterates code points, so a flag, a decomposed accent, or a ZWJ emoji
   sequence was torn into separate boxes and drawn as its parts.
   Intl.Segmenter (granularity "grapheme") is the splitter, Array.from
   the fallback where it is missing.

   Naming note: RevealText belongs to the VIEWPORT-triggered reveal
   family with RevealBlock (RevealBlock.tsx), not the mount-time
   entrance beats Reveal / RevealGroup (Reveal.tsx). Full naming note
   in Reveal.tsx.
   ============================================================ */

type RevealTextVariant = "letter" | "word" | "line";
type RevealTextTrigger = "mount" | "viewport";

export interface RevealTextProps {
  children: string;
  variant?: RevealTextVariant;
  trigger?: RevealTextTrigger;
  delay?: number;
  /** Seed the stagger counter, in STAGGER STEPS, so a second instance continues a first one's
   *  sequence instead of restarting at 0. The unit is the point: a step is multiplied by
   *  --motion-stagger, so an offset stays correct at every motion dial, where a `delay` in ms is
   *  correct at exactly one. Use it for a heading composed of two RevealText instances (a
   *  two-tone headline, or one with a forced break): give the second the first's piece count.
   *  See MOTION.md, "Chaining two RevealText instances in one heading". */
  indexOffset?: number;
  staggerMultiplier?: number;
  /** Play once and stay revealed. Default false: the reveal REVERSES when scrolled out
   *  of view, so re-entering the viewport replays it. Viewport trigger only. */
  once?: boolean;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function RevealText({
  children,
  variant = "word",
  trigger = "viewport",
  delay = 0,
  indexOffset = 0,
  staggerMultiplier = 1,
  once = false,
  as,
  style,
  className,
}: RevealTextProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (trigger === "mount") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    // REVERSIBLE by default: the reveal follows visibility both ways, so scrolling back
    // replays it (the CSS transition animates both directions off data-revealed). `once`
    // opts back into play-once-and-stay for surfaces where a replay would distract.
    const observer = new IntersectionObserver(
      (entries, obs) => {
        // A fast direction flip can batch out-then-in crossings into one callback;
        // only the newest record reflects actual visibility.
        const entry = entries[entries.length - 1];
        if (once) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
          return;
        }
        setRevealed(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, once]);

  const rootStyle: CSSProperties = {
    ...(delay > 0 && { "--reveal-base-delay": `${delay}ms` }),
    "--reveal-stagger-mult": staggerMultiplier,
    ...style,
  };

  const content = renderPieces(children, variant, indexOffset);

  return (
    <>
      <style href="magentaweb-reveal-text" precedence="default">{revealTextCss}</style>
      <Tag
        ref={polymorphicRef(ref)}
        data-mw-reveal-text=""
        data-variant={variant}
        data-revealed={revealed ? "true" : "false"}
        style={rootStyle}
        className={className}
      >
        {content}
        {/* The intact string for assistive tech; the animated pieces above are
            aria-hidden. Not selectable, so a copy of the headline is not doubled. */}
        {variant !== "line" ? <span style={srCopyStyle}>{children}</span> : null}
      </Tag>
    </>
  );
}

const srCopyStyle: CSSProperties = { ...srOnly, userSelect: "none" };

// Grapheme clusters, not code points: "🇫🇷" is one letter, "é" built from e + U+0301 is one
// letter. Intl.Segmenter is in every browser this baseline targets; Array.from stays as the
// fallback for a runtime without it.
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
const graphemes = (text: string): string[] =>
  segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);

/* MW-2 (3 Sep 2026), the phantom piece. `split(/(\s+)/)` is a CAPTURING split, so a string with
   a leading or trailing space ends with an empty-string token: "a b ".split(/(\s+)/) is
   ["a", " ", "b", " ", ""]. The old guard was /^\s+$/, and /^\s+$/.test("") is FALSE, so that
   empty token fell through to the span branch and became a real, animated, stagger-consuming
   zero-width piece. Measured live on zafiro: two of them on the home page, each eating a beat
   out of the middle of a headline's sequence. `!piece.trim()` is true for the empty token AND
   for whitespace, so one predicate covers both and the whitespace behaviour is unchanged.

   CENSUS OF THE CLASS, and the two branches do NOT share a symptom, which is worth stating
   rather than smoothing over. Both run the same capturing split and both carried the same
   guard, so both are fixed here. But in the WORD branch the empty token becomes a staggered
   piece and eats a beat, while in the LETTER branch it reaches graphemes(""), which is empty,
   so it emits an empty inline-block word wrapper and consumes NO index. One is a timing defect,
   the other a stray element. probe-reveal-stagger asserts each symptom separately for exactly
   that reason: the assertions written for the word branch PASS on the unfixed letter branch
   (measured), and would have read as "the class is closed" with half of it untested.

   The `line` branch does NOT have this defect and is deliberately left alone — it uses
   `split("\n")`, which is non-capturing, so it emits an empty piece only for a newline the
   author actually wrote, and that is an intentional blank line rather than a boundary artefact.
   The probe asserts that blank line SURVIVES, so the scope stays where it belongs.

   MW-3, same pass: `indexOffset` seeds the counter so a SECOND instance can continue the first
   one's sequence. It is expressed in STAGGER STEPS, not milliseconds, which is the whole point
   -- a step composes with --motion-stagger automatically at every motion dial, where a
   hardcoded delay is right at exactly one dial setting. The `delay` prop cannot do this job: it
   is typed `number` and stamped as `${delay}ms`. Measured on the two-instance heading that
   prompted this: 909ms is correct at `gentle` and leaves a 533ms dead gap at `sharp`. */
function renderPieces(text: string, variant: RevealTextVariant, indexOffset = 0) {
  if (variant === "line") {
    const lines = text.split("\n");
    return lines.map((line, i) => (
      <span
        key={i}
        data-mw-reveal-text-piece=""
        data-block="true"
        style={{ "--stagger-index": i + indexOffset }}
      >
        {line}
      </span>
    ));
  }

  if (variant === "word") {
    const words = text.split(/(\s+)/);
    let staggerIdx = indexOffset;
    return words.map((piece, i) => {
      if (!piece.trim()) {
        return <Fragment key={i}>{piece}</Fragment>;
      }
      const idx = staggerIdx++;
      return (
        <span
          key={i}
          data-mw-reveal-text-piece=""
          aria-hidden="true"
          style={{ "--stagger-index": idx }}
        >
          {piece}
        </span>
      );
    });
  }

  // letter: keep word integrity by wrapping each word in an inline-block; each
  // letter inside is its own staggered inline-block. Whitespace between words
  // renders as a literal space.
  const words = text.split(/(\s+)/);
  let staggerIdx = indexOffset;
  return words.map((piece, i) => {
    if (!piece.trim()) {
      return <Fragment key={i}>{piece}</Fragment>;
    }
    const letters = graphemes(piece);
    return (
      <span key={i} data-mw-reveal-text-word="" aria-hidden="true">
        {letters.map((char, j) => {
          const idx = staggerIdx++;
          return (
            <span
              key={j}
              data-mw-reveal-text-piece=""
              aria-hidden="true"
              style={{ "--stagger-index": idx }}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  });
}

const revealTextCss = `
[data-mw-reveal-text-word] {
  display: inline-block;
  white-space: nowrap;
}
[data-mw-reveal-text-piece] {
  display: inline-block;
  opacity: 0;
  transform: translateY(var(--motion-reveal-distance));
  transition:
    opacity var(--motion-reveal-duration) var(--motion-ease),
    transform var(--motion-reveal-duration) var(--motion-ease);
  transition-delay: 0ms;
}
/* will-change only while hidden: a letter-split headline otherwise pins dozens
   of compositor layers permanently (audit). */
[data-mw-reveal-text][data-revealed="false"] [data-mw-reveal-text-piece] {
  will-change: opacity, transform;
}
[data-mw-reveal-text-piece][data-block="true"] {
  display: block;
}
/* The stagger delay applies on enter only. If it also applied on exit, a reverse
   would be a seconds-long staggered tear-down, and a re-enter mid-tear-down leaves
   words frozen in mixed states (interrupted transitions restart their delay clocks).
   Enter-only keeps the exit uniform and makes any interrupt converge. */
[data-mw-reveal-text][data-revealed="true"] [data-mw-reveal-text-piece] {
  opacity: 1;
  transform: none;
  transition-delay: calc(
    var(--reveal-base-delay, 0ms) +
    var(--stagger-index, 0) * var(--motion-stagger) * var(--reveal-stagger-mult, 1)
  );
}
/* The still dial zeroes the whole delay, not just the stagger term: the
   stagger dies with --motion-stagger, but the base delay prop rides an inline
   custom property only a real transition-delay rule can beat, or still
   content sits invisible for the authored delay and pops (A-111). */
html[data-motion="still"] [data-mw-reveal-text] [data-mw-reveal-text-piece] {
  transition-delay: 0ms;
}
/* No scripting at all (JS off in the browser): data-revealed never flips, so the pieces
   would rest invisible over a rendered document. Mirrors RevealBlock; lives in the hoisted,
   deduped sheet, not a per-instance <noscript>. Beats the base piece rule on specificity. */
@media (scripting: none) {
  [data-mw-reveal-text][data-revealed="false"] [data-mw-reveal-text-piece] {
    opacity: 1;
    transform: none;
  }
}
`;
