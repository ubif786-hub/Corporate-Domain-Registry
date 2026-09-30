import { CSSProperties } from "react";

type SpacerSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export interface SpacerProps {
  size?: SpacerSize;
}

const sizeMap: Record<SpacerSize, string> = {
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
  "3xl": "var(--space-3xl)",
};

export function Spacer({ size = "md" }: SpacerProps) {
  const style: CSSProperties = {
    height: sizeMap[size],
    flexShrink: 0,
  };

  return <div aria-hidden="true" style={style} />;
}
