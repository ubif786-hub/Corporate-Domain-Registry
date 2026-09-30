import { CSSProperties, ElementType, Fragment } from "react";
import { ScrollScene } from "@/components/motion/ScrollScene";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   ScrollFillText — a scroll-progress text FILL.

   The text rests in a muted ink and inks in progressively as the reader
   scrolls through it, piece by piece, and un-inks on the way back up.
   The catalog already scrubs opacity and translate off scroll progress
   (Scroll-Driven Transform, ScrollScene); nothing in it scrubs COLOUR.
   This is that gap.

   PROMOTED FROM ZAFIRO AT v6.7.0 (5 Sep 2026). It was proved in that fork's
   src/site/ on 4 Sep (FORK_PROTOCOL rule 1: an experiment is proved in
   fork-owned space and promoted afterwards) and written so promotion was
   a MOVE, not a rewrite: no zafiro token appears in it, every colour
   arrives through a prop or a custom property, and the defaults are
   semantic tokens every fork has. The only line that changed on the move
   is the sheet key. zafiro retires its copy at the v6.7.0 fanout
   (FORK_PROTOCOL rule 5). The motion catalog's "Scroll fill text" card and
   the showroom sample are its two demos; it carries no atlas group, like
   the rest of src/components/motion/.

   HOW IT SCRUBS. ScrollScene in FLOW mode writes a clamped 0-1
   `--mw-scene-progress` to its own node every rAF frame, with no React
   state and no re-render. That is the whole reason it exists instead of
   useScrollProgress, and it is what makes driving a hundred spans off one
   scroll listener cheap. Everything below it is pure CSS:

     --mw-fill-f  the scene progress remapped into the fill window
                  [start, end], clamped 0-1. One multiply, never a
                  division: `scale` is 1/(end-start), computed in TS,
                  because CSS calc division by a non-literal is the kind
                  of thing that parses in one engine and not the next.
     --mw-fill-t  per piece, 0 to 1, from the head position
                  f * (n + soft) walking past this piece's index.
     color        color-mix(in srgb, ink calc(t * 100%), muted).

   VERIFIED, NOT ASSUMED (4 Sep 2026, chromium): unitless clamp() inside
   a custom property and a calc() PERCENTAGE inside color-mix() both
   resolve, and the mix sweeps monotonically across the range. Measured
   at p = 0, .25, .5, .75, 1 with every read forced through
   `color-mix(in srgb, <expr> 100%, transparent)`, because color-mix
   serialises as `color(srgb ...)` and an oklch() author value serialises
   back as `oklch()`; a naive rgb parser walks straight past both and
   reports the ground behind the text. No threshold-switch fallback was
   needed.

   REVERSIBLE, and there is no `once`. Scrolling back up un-inks, because
   the fill is a pure function of a scroll position that ScrollScene
   recomputes in both directions. That is the standing owner requirement
   across this system and it falls out of the substrate for free.

   THE RESTING STATE IS FULLY INKED, READABLE TEXT. Under
   prefers-reduced-motion or `data-motion="still"` ScrollScene never
   attaches its listener and actively REMOVES the property, so
   `--mw-scene-progress` is unset; the same is true before hydration and
   with JS off entirely. Every read is therefore written
   `var(--mw-scene-progress, 1)`, and the window remap is arranged so
   that f(1) is always >= 1: end is clamped to <= 1, so
   (1 - start) * scale >= (end - start) * scale = 1. There is no
   `@media (scripting: none)` rule and none is needed — the fallback in
   the var() IS the no-JS path.

   WHAT ASSISTIVE TECH READS. Splitting a string into spans makes each
   piece a separate text run, and a screen reader announced a word-split
   headline word by word (RevealText, pass 3). The answer is RevealText's,
   copied deliberately: the pieces are aria-hidden and ONE visually hidden
   copy of the intact string sits beside them inside the same Tag, via the
   srOnly idiom, which is role-independent and so holds whether `as` is a
   span, a p or an h2. `children` is typed `string` so that hidden copy is
   byte-identical to the visible text and 2.5.3 Label in Name holds. Not
   aria-label: span and p do not support naming from author.

   GRAPHEMES, NOT CODE POINTS, in letter granularity. Array.from iterates
   code points, so a flag, a decomposed accent, or a ZWJ emoji is torn
   into its parts and drawn wrong. Intl.Segmenter with granularity
   "grapheme" is the splitter and Array.from the fallback, exactly as
   RevealText does it. This is trilingual copy: Spanish and Portuguese
   carry decomposed accents and the splitter is what keeps them whole.

   WORD INTEGRITY, and the ONE deliberate deviation from RevealText.
   RevealText makes each word an inline-block wrapping inline-block
   letters. It has to: it TRANSFORMS each piece, transform needs a box,
   and an inline-block is an atomic inline, which CREATES a soft wrap
   opportunity on either side — so without the nowrap wrapper a word would
   break between its letters. This component changes COLOUR and nothing
   else, so it needs no box at all: every piece is a plain inline span,
   inline element boundaries are not wrap opportunities, and the line
   breaking is byte-for-byte what the unsplit paragraph would do. That
   removes the layout-shift risk rather than managing it. The word wrapper
   is still rendered in letter granularity, still carrying
   `white-space: nowrap`, as an explicit guarantee rather than a
   consequence. MEASURED, and only this: the box holds 896x156px and four
   lines at every scroll progress, every letter-mode word occupies exactly
   one line at 390, and there is no horizontal scroll at 390 with or
   without JS. The claim that the wrap points equal an UNSPLIT paragraph's
   is the reasoning, not a measurement, and is not asserted here.

   THE EMPTY-PIECE TRAP (RevealText MW-2, 3 Sep 2026). `split(/(\s+)/)` is
   a CAPTURING split, so a string with a leading or trailing space ends
   with an empty-string token, and `/^\s+$/.test("")` is FALSE. The guard
   here is `!piece.trim()`, which is true for the empty token AND for
   whitespace, so one predicate covers both.

   ONE INSTANCE CAN CARRY SEVERAL PARAGRAPHS, AND IT HAS TO (5 Sep 2026).
   The defect, owner-reported: /firm's story ran TWO instances, one per
   paragraph, so each drove its own ScrollScene and each measured its own
   travel through the viewport. Two scenes that overlap on screen are
   writing two different progresses at the same moment, so BOTH
   paragraphs ink at once: paragraph 1 was half written while paragraph 2
   had already started. The intent is reading order, "as if you're
   writing", and reading order is a single sequence.

   THE FIX IS ONE SEQUENCE, NOT A DELAY. `children` splits on a BLANK
   LINE, each paragraph renders as its own Tag, and the piece index
   `--mw-fill-i` and the total `--mw-fill-n` run CONTINUOUSLY across all
   of them. Paragraph 2's first word carries index 41 of 80, so it cannot
   ink until the head has walked past paragraph 1's last. One ScrollScene
   wraps the whole group, because the group is the thing the reader is
   travelling through and it is the node whose geometry the progress
   should be measured on. Nothing in the CSS below changed: `f` is
   declared per Tag but resolves identically on every one of them, since
   the window constants are the same and `--mw-scene-progress` is
   inherited from the one scene above them all.

   A SINGLE-PARAGRAPH STRING IS UNCHANGED, byte for byte: one paragraph,
   one Tag, and the scene keeps whatever `sceneStyle` the caller gave it.
   The multi-paragraph case is the only one that adds a flex column and a
   --flow-block gap to the scene, and `sceneStyle` still spreads last so
   a caller can override either.

   ACCESSIBILITY IS PER PARAGRAPH. One visually hidden intact copy inside
   EACH rendered Tag, not one for the group: the paragraph is the unit a
   screen reader announces, and a single hidden copy of both would erase
   the paragraph break for exactly the readers who cannot see it.
   ============================================================ */

export type ScrollFillGranularity = "word" | "letter";

export interface ScrollFillTextProps {
  /** Typed `string` on purpose: the visually hidden copy for assistive tech must be
   *  byte-identical to the visible text. A two-tone or force-broken line is two instances.
   *
   *  A BLANK LINE IS A PARAGRAPH BREAK. Several paragraphs in one string render as
   *  several tags inside ONE scene, sharing ONE continuous piece sequence, so the
   *  second paragraph does not begin to ink until the first has finished. Passing them
   *  as separate instances gives each its own scene and they ink simultaneously. */
  children: string;
  /** "word" (default) inks a word at a time. "letter" is what a letter-by-letter brief
   *  literally asks for; see the doc comment above the default for when it is right. */
  granularity?: ScrollFillGranularity;
  /** The tag rendered inside the scene. Default "p". */
  as?: ElementType;
  /** The scene-progress window the fill runs across, 0-1. ScrollScene's flow progress is
   *  0 as the element's top reaches the viewport bottom and 1 as its bottom clears the
   *  viewport top, so the readable stretch is roughly 0.25 to 0.75. The default finishes
   *  the fill while the paragraph is still comfortably in view rather than as it leaves. */
  start?: number;
  end?: number;
  /** How many pieces are mid-ink at once: the softness of the leading edge, in pieces.
   *  Defaults to 1 piece for words and 12 for letters (roughly two words). */
  softness?: number;
  /** The resting ink. Semantic token or any colour. Also settable from a parent rule as
   *  `--mw-fill-muted`. Default: 15% of --text-positive-primary over the ground, i.e.
   *  the text arrives as if it were being written rather than being un-dimmed. */
  muted?: string;
  /** The inked colour. Also settable as `--mw-fill-ink`. Default --text-positive-primary. */
  ink?: string;
  /** The content language, on the rendered tag. Not a convenience: this is trilingual copy,
   *  the tag carries BOTH the split pieces and the hidden intact copy a screen reader reads,
   *  and a Spanish paragraph announced with an English voice is the failure that fixes. */
  lang?: string;
  className?: string;
  style?: CSSProperties;
  /** Styles for the ScrollScene wrapper, which is the node the progress is measured on. */
  sceneClassName?: string;
  sceneStyle?: CSSProperties;
}

const DEFAULT_START = 0.2;
const DEFAULT_END = 0.62;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function ScrollFillText({
  children,
  granularity = "word",
  as,
  start = DEFAULT_START,
  end = DEFAULT_END,
  softness,
  muted,
  ink,
  lang,
  className,
  style,
  sceneClassName,
  sceneStyle,
}: ScrollFillTextProps) {
  const Tag = (as ?? "p") as ElementType;

  // The window is clamped into 0-1 and forced non-degenerate, because the fully-inked
  // resting state depends on end <= 1 (see the header note). A consumer who passes
  // nonsense gets a usable fill, never unreadable text.
  const from = clamp01(start);
  const to = Math.max(clamp01(end), from + 0.05);
  const scale = 1 / (to - from);

  const soft = Math.max(softness ?? (granularity === "letter" ? 12 : 1), 0.001);

  // ONE SEQUENCE ACROSS ALL PARAGRAPHS. `next` carries the running index out of
  // each block and into the following one, so `--mw-fill-i` is a position in the
  // whole passage rather than in its own paragraph, and `--mw-fill-n` is the
  // passage's total. That single fact is what makes the fill read in order.
  const paragraphs = splitParagraphs(children);
  let running = 0;
  const blocks = paragraphs.map((text) => {
    const built = renderPieces(text, granularity, running);
    running = built.next;
    return { text, pieces: built.pieces };
  });
  const count = running;

  const rootStyle: CSSProperties = {
    "--mw-fill-n": count,
    "--mw-fill-soft": soft,
    "--mw-fill-soft-inv": 1 / soft,
    "--mw-fill-start": from,
    "--mw-fill-scale": scale,
    ...(muted && { "--mw-fill-muted": muted }),
    ...(ink && { "--mw-fill-ink": ink }),
    ...style,
  };

  // Only a multi-paragraph passage needs the scene to lay anything out, so a
  // single-paragraph instance keeps exactly the scene it had before. --flow-block
  // is the ladder's own paragraph rung; sceneStyle spreads last so a call site
  // can change either.
  const sceneRoot: CSSProperties =
    blocks.length > 1
      ? { display: "flex", flexDirection: "column", gap: "var(--flow-block)", ...sceneStyle }
      : sceneStyle ?? {};

  return (
    <>
      <style href="magentaweb-scroll-fill-text" precedence="default">
        {scrollFillCss}
      </style>
      <ScrollScene className={sceneClassName} style={sceneRoot}>
        {blocks.map((block, b) => (
          <Tag
            key={b}
            data-mw-scroll-fill=""
            data-granularity={granularity}
            lang={lang}
            style={rootStyle}
            className={className}
          >
            {block.pieces}
            {/* The intact string for assistive tech; the pieces above are aria-hidden.
                One per PARAGRAPH, so the paragraph break survives for a reader who
                cannot see it. Not selectable, so a copy is not doubled. */}
            <span style={srCopyStyle}>{block.text}</span>
          </Tag>
        ))}
      </ScrollScene>
    </>
  );
}

/* A blank line is the break. Windows line endings included, and a passage that
   carries none comes back as a single paragraph, which is the existing
   behaviour unchanged. Each paragraph is trimmed so the hidden intact copy and
   the visible pieces are built from the SAME string: a stray leading newline
   would otherwise put whitespace in one and not the other. An all-whitespace
   input yields one empty paragraph rather than none, so the component never
   renders a scene with no tag in it. */
function splitParagraphs(text: string): string[] {
  const parts = text
    .split(/\r?\n[ \t]*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

const srCopyStyle: CSSProperties = { ...srOnly, userSelect: "none" };

// Grapheme clusters, not code points: "é" built from e + U+0301 is one letter, and so is
// a flag or a ZWJ emoji. Intl.Segmenter is in every browser this baseline targets;
// Array.from stays as the fallback for a runtime without it.
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
const graphemes = (text: string): string[] =>
  segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);

// `from` is the running index this paragraph starts at, and `next` is where the
// following one picks up. Nothing else about the splitting changed.
function renderPieces(text: string, granularity: ScrollFillGranularity, from: number) {
  const words = text.split(/(\s+)/);
  let idx = from;

  if (granularity === "word") {
    const pieces = words.map((piece, i) => {
      // `!piece.trim()` covers whitespace AND the empty token a capturing split leaves
      // on a leading or trailing space. /^\s+$/ does not, which is RevealText's MW-2.
      if (!piece.trim()) return <Fragment key={i}>{piece}</Fragment>;
      return (
        <span
          key={i}
          data-mw-scroll-fill-piece=""
          aria-hidden="true"
          style={{ "--mw-fill-i": idx++ }}
        >
          {piece}
        </span>
      );
    });
    return { pieces, next: idx };
  }

  // letter: the index runs across the whole passage, not per word and not per
  // paragraph, so the fill head walks the text rather than restarting at each
  // space or each break.
  const pieces = words.map((piece, i) => {
    if (!piece.trim()) return <Fragment key={i}>{piece}</Fragment>;
    return (
      <span key={i} data-mw-scroll-fill-word="" aria-hidden="true">
        {graphemes(piece).map((char, j) => (
          <span
            key={j}
            data-mw-scroll-fill-piece=""
            aria-hidden="true"
            style={{ "--mw-fill-i": idx++ }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  });
  return { pieces, next: idx };
}

/* Every read of the scene variable carries the `, 1` fallback: unset means no scroll
   scrubbing is happening (reduced motion, the still dial, pre-hydration, JS off) and
   the contract for all four is fully inked, readable text.

   The pieces are plain inline spans. No display, no transform, no will-change: colour
   is not a composited property here and a hundred promoted layers on a paragraph is a
   cost with nothing bought. */
const scrollFillCss = `
/* THE MUTED DEFAULT IS A PERCENTAGE OF THE INK, NOT A BODY RUNG (5 Sep 2026).
   It was --text-positive-tertiary, chosen for AA safety, and it measures
   6.29:1 to 6.81:1, a fully READABLE rung, so the "unwritten" half of the
   paragraph read as body copy at about 80% and the fill barely registered.
   AA does not govern here and that was the error: the component's resting
   state under prefers-reduced-motion, the "still" dial, no-JS and SSR is FULLY
   INKED by construction (every read carries a var(--mw-scene-progress, 1) fallback),
   so the muted colour only ever exists as a transient animation frame with
   motion enabled. Nothing is ever read at it.

   THE SHAPE IS THE POINT, not the number. It is a percentage of
   --text-positive-primary, which tokens.css already mirrors light to dark and
   inside [data-section-bg="inverted"], so the light/dark mirror here is
   STRUCTURAL: there is no second value to hand-maintain and no way for the two
   themes to drift apart. color-mix on a SEMANTIC token is the sanctioned use;
   what is forbidden is generating a RAW one.

   A call site can still override with the "muted" prop or by setting
   --mw-fill-muted on any ancestor. */
[data-mw-scroll-fill] {
  --mw-fill-rest: color-mix(in srgb, var(--text-positive-primary) 15%, transparent);
  --mw-fill-f: clamp(
    0,
    calc((var(--mw-scene-progress, 1) - var(--mw-fill-start, 0)) * var(--mw-fill-scale, 1)),
    1
  );
  color: var(--mw-fill-muted, var(--mw-fill-rest));
}
/* Letter granularity only: an explicit guarantee that a word never breaks across a
   line, independent of what the pieces inside it are. */
[data-mw-scroll-fill-word] {
  white-space: nowrap;
}
[data-mw-scroll-fill-piece] {
  --mw-fill-t: clamp(
    0,
    calc(
      (var(--mw-fill-f) * calc(var(--mw-fill-n) + var(--mw-fill-soft)) - var(--mw-fill-i))
      * var(--mw-fill-soft-inv)
    ),
    1
  );
  color: color-mix(
    in srgb,
    var(--mw-fill-ink, var(--text-positive-primary)) calc(var(--mw-fill-t) * 100%),
    var(--mw-fill-muted, var(--mw-fill-rest))
  );
}
`;
