import { CSSProperties, ReactElement, cloneElement } from "react";

type IconSize = "sm" | "md" | "lg" | "xl" | "2xl";

// Library-agnostic child shape. Any React icon component that accepts a numeric
// size and standard ARIA props will satisfy this.
type IconChildProps = {
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  role?: string;
  size?: number | string;
};

export interface IconProps {
  children: ReactElement<IconChildProps>;
  label?: string;
  size?: IconSize;
}

// The system's icon scale. Carbon icon components take a numeric pixel `size`
// (not a CSS var), so the scale lives here rather than in tokens.css — this map
// is the single source of truth for icon sizing across the system.
const sizePxMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 40,
};

const wrapperStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 0,
};

export function Icon({ children, label, size = "md" }: IconProps) {
  const px = sizePxMap[size];

  const childProps: IconChildProps = label
    ? { size: px, "aria-label": label, role: "img" }
    : { size: px, "aria-hidden": true };

  return (
    <span style={wrapperStyle}>{cloneElement(children, childProps)}</span>
  );
}
