import { CSSProperties, HTMLAttributes, ReactNode, createElement } from "react";

type ContainerSize = "sm" | "md" | "lg" | "full";
type ContainerTag = "div" | "section" | "main" | "article";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ContainerTag;
  children: ReactNode;
  size?: ContainerSize;
}

const sizeMap: Record<ContainerSize, string> = {
  sm: "var(--container-width-sm)",
  md: "var(--container-width-md)",
  lg: "var(--container-width)",
  full: "100%",
};

export function Container({
  as = "div",
  children,
  size = "lg",
  style,
  ...rest
}: ContainerProps) {
  const merged: CSSProperties = {
    maxWidth: sizeMap[size],
    marginInline: "auto",
    paddingInline: "var(--container-padding-x)",
    width: "100%",
    ...style,
  };

  return createElement(as, { style: merged, ...rest }, children);
}
