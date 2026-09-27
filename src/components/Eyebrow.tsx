import { CSSProperties, HTMLAttributes, ReactNode, createElement } from "react";
import { tokenNumber } from "@/components/internal/styles";

/** The "plain" alias of "quiet" (A-049 intent rename) was REMOVED at v5.0.0. */
type EyebrowVariant = "quiet" | "rule" | "pill";
type EyebrowTag = "span" | "div" | "p";

export interface EyebrowProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
  as?: EyebrowTag;
  children: ReactNode;
  style?: CSSProperties;
  variant?: EyebrowVariant;
}

const baseStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--label-tracking)",
  lineHeight: "var(--leading-snug)",
  textTransform: "uppercase",
  color: "var(--text-positive-secondary)",
  margin: 0,
};

const variantStyle: Record<EyebrowVariant, CSSProperties> = {
  quiet: {
    display: "inline-block",
  },
  rule: {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-xs)",
  },
  pill: {
    display: "inline-block",
    padding: "var(--space-2xs) var(--space-sm)",
    background: "var(--accent-soft)",
    color: "var(--accent-emphasis)",
    borderRadius: "var(--radius-full)",
  },
};

const ruleLineStyle: CSSProperties = {
  display: "inline-block",
  width: "var(--space-lg)",
  height: "var(--rule-weight)",
  background: "var(--border-positive-secondary)",
};

export function Eyebrow({
  as = "span",
  children,
  style,
  variant = "quiet",
  ...rest
}: EyebrowProps) {
  const v: EyebrowVariant = variant;
  const merged: CSSProperties = {
    ...baseStyle,
    ...variantStyle[v],
    ...style,
  };

  const content =
    v === "rule" ? (
      <>
        <span aria-hidden="true" style={ruleLineStyle} />
        <span>{children}</span>
      </>
    ) : (
      children
    );

  return createElement(
    as,
    { "data-mw-eyebrow": v, style: merged, ...rest },
    content
  );
}
