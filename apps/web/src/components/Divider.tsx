import { CSSProperties, HTMLAttributes } from "react";

type DividerSpacing = "none" | "sm" | "md" | "lg" | "xl";
type DividerWeight = "thin" | "regular" | "strong";

export interface DividerProps extends Omit<HTMLAttributes<HTMLHRElement>, "style"> {
  spacing?: DividerSpacing;
  style?: CSSProperties;
  weight?: DividerWeight;
}

const spacingMap: Record<DividerSpacing, string> = {
  none: "0",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
};

// Strong is a deliberate 2px step above the 1px hairline convention, not a
// drifted literal.
const weightMap: Record<DividerWeight, { width: string; color: string }> = {
  thin: { width: "var(--rule-weight)", color: "var(--border-positive-primary)" },
  regular: { width: "var(--rule-weight)", color: "var(--border-positive-secondary)" },
  strong: { width: "var(--rule-weight-strong)", color: "var(--border-positive-secondary)" },
};

export function Divider({
  spacing = "md",
  style,
  weight = "thin",
  ...rest
}: DividerProps) {
  const w = weightMap[weight];

  const merged: CSSProperties = {
    border: 0,
    borderTop: `${w.width} solid ${w.color}`,
    marginBlock: spacingMap[spacing],
    marginInline: 0,
    ...style,
  };

  // <hr> already carries the separator role and horizontal orientation
  // implicitly; restating them was dead weight (audit).
  return <hr style={merged} {...rest} />;
}
