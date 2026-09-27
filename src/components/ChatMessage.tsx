import { CSSProperties, Fragment, ReactNode } from "react";
import { AccentRuleStyle } from "@/components/AccentRule";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   ChatMessage — one turn in a conversational AI surface (v4.3.0,
   from the ArtistHQ handoff: the companion drawer, an inline
   critique thread, a course tutor).

   Two roles, two sides, two surfaces. user sits right on the
   NEGATIVE surface (the inverse family: dark bubble in light theme,
   light bubble in dark, no bespoke color); assistant sits left on
   the positive surface behind the 2px accent left rule, the same
   mark AiCard and CalloutCard use for the generated/callout voice.
   Both cap at 80% of the thread's width so a turn never reads as a
   band.

   `speaker` is the attribution line above an assistant turn (a mono
   accent line with a small accent mark). It is a PROP because the
   name is product vocabulary ("Companion", "Tutor"): the system
   ships the shape, the product supplies the word.

   EVERY TURN IS NAMED IN WORDS (AX, 26 Aug 2026): side and surface
   are invisible to assistive tech, and `speaker` is optional and
   never shown on a user turn, so a thread could read as one
   undifferentiated run of text. A turn without the visible speaker
   row opens with a visually hidden name instead: `userSpeaker`
   (default "You") on user turns, "Assistant" on an unattributed
   assistant turn. Both halves are product vocabulary a fork can
   localise. The hidden name sits BEFORE the bubble, never inside
   it, so it is not read as the first words of the message.

   `markdown` is deliberately light: blank-line-separated paragraphs
   and single-newline breaks, nothing else, rendered from plain text
   (no HTML parsing, nothing injectable). A model reply wants
   paragraph rhythm, not a document language.

   `pending` renders the thinking line in place of content (italic,
   tertiary, CSS italic per the a11y rule: no <em>, this is voice
   not emphasis). Announcing arrival is the thread's job, not the
   bubble's: put the message list in a polite live region.

   Server component: a pure rendering of one turn.
   ============================================================ */

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessageProps {
  role: ChatMessageRole;
  /** The turn's text. Ignored while pending. */
  content?: string;
  /** Assistant turns: render light markdown (paragraphs + line breaks) from plain text. */
  markdown?: boolean;
  /** The turn is being generated: the thinking line replaces content. */
  pending?: boolean;
  /** The thinking line's copy. Default "thinking…". */
  pendingLabel?: string;
  /** Attribution line above an assistant turn, e.g. "Companion". Product vocabulary. Omitted, the turn is still named "Assistant" for assistive tech. */
  speaker?: string;
  /** The name a user turn is read under by assistive tech (visually hidden, never on screen). Default "You". Product vocabulary, the pair of `speaker`. */
  userSpeaker?: string;
}

// Blank-line-separated paragraphs; single newlines stay as breaks inside one.
// The last paragraph drops its bottom margin so the bubble's own padding
// closes the block (no phantom trailing gap).
function renderLightMarkdown(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== "");
  return blocks.map((block, i) => (
    <p key={i} style={i < blocks.length - 1 ? paragraphStyle : lastParagraphStyle}>
      {block.split("\n").map((line, j, lines) => (
        <Fragment key={j}>
          {line}
          {j < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </p>
  ));
}

export function ChatMessage({
  role,
  content,
  markdown = false,
  pending = false,
  pendingLabel = "thinking…",
  speaker,
  userSpeaker = "You",
}: ChatMessageProps) {
  const isUser = role === "user";
  const body = pending ? (
    <span style={thinkingStyle}>{pendingLabel}</span>
  ) : markdown && content != null ? (
    renderLightMarkdown(content)
  ) : (
    content
  );

  return (
    <div style={isUser ? userRowStyle : assistantRowStyle}>
      <div style={bubbleColumnStyle}>
        {/* The voice, in real text, before the bubble (see the header note): the visible
            speaker row on an attributed assistant turn, otherwise a hidden name. */}
        {!isUser && speaker ? (
          <div style={speakerRowStyle}>
            <span aria-hidden="true" style={speakerDotStyle} />
            <span style={speakerTextStyle}>{speaker}</span>
          </div>
        ) : (
          <span style={srOnly}>{isUser ? userSpeaker : "Assistant"}</span>
        )}
        {/* v4.8.0: the assistant strip rides the shared AccentRule inset bar
            (was its own 2px borderLeft — the corner-seam fix, one mechanism).
            data-mw-chat-bubble carries the chat-specific NESTING override below:
            on a small bubble the shared border-zone strip read detached, floating
            in the margin — here the bubble keeps its hairline and the strip tucks
            flush against the bubble edge. */}
        {!isUser ? (
          <>
            <AccentRuleStyle />
            <style href="magentaweb-chat-bubble-rule" precedence="default">{chatRuleCss}</style>
          </>
        ) : null}
        <div
          style={isUser ? userBubbleStyle : assistantBubbleStyle}
          data-mw-accent-rule={isUser ? undefined : "accent"}
          data-mw-chat-bubble={isUser ? undefined : ""}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

/* ---------- inline styles ---------- */

const userRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  width: "100%",
};

const assistantRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  width: "100%",
};

// A turn never spans the thread: the cap is what makes the two sides read
// as a conversation. Deliberate fixed geometry, like Modal's drawer width.
const bubbleColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  maxWidth: "80%",
  minWidth: 0,
};

const speakerRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3xs)",
};

// Deliberate fixed geometry (the 6px attribution mark from the handoff): a
// glyph-scale dot, not a spacing value, so it does not ride the spacing dial.
const speakerDotStyle: CSSProperties = {
  width: "0.375rem",
  height: "0.375rem",
  flexShrink: 0,
  background: "var(--accent-base)",
  borderRadius: "var(--radius-full)",
};

const speakerTextStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--accent-ink)",
};

const bubbleBase: CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  borderRadius: "var(--component-radius)",
  overflowWrap: "break-word",
};

// The inverse surface IS the user bubble: dark-on-light in light theme,
// light-on-dark in dark, one token pair, no bespoke ink. The ink is
// --text-on-negative, not a family rung: the bubble's own fill is the negative
// surface and it paints one ink.
const userBubbleStyle: CSSProperties = {
  ...bubbleBase,
  background: "var(--background-negative-primary)",
  color: "var(--text-on-negative)",
};

const assistantBubbleStyle: CSSProperties = {
  ...bubbleBase,
  background: "var(--background-positive-primary)",
  color: "var(--text-positive-primary)",
  border: "1px solid var(--border-positive-primary)",
  // v4.8.0: the accent strip comes from the shared AccentRule attr, not a border.
};

const paragraphStyle: CSSProperties = {
  margin: 0,
  marginBottom: "var(--space-xs)",
};

const lastParagraphStyle: CSSProperties = {
  margin: 0,
};

// --font-quote, not --font-display (D28): the quoted-italic lever, defaulting to the display
// face, so the pending label reads exactly as it did.
const thinkingStyle: CSSProperties = {
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  color: "var(--text-positive-tertiary)",
};

// The chat-specific nesting override (triple-attr = 0,3,0, out-ranks the shared
// AccentRule host rule's 0,2,0): the bubble KEEPS its 1px hairline all round and
// the strip sits flush over the left hairline — attached to the bubble edge, not
// floating in the border-zone margin the shared rule reserves for card-scale hosts.
const chatRuleCss = `
[data-mw-chat-bubble][data-mw-accent-rule][data-mw-accent-rule] {
  border-left: 1px solid var(--border-positive-primary);
}
[data-mw-chat-bubble][data-mw-accent-rule][data-mw-accent-rule]::before {
  left: -1px;
}
`;
