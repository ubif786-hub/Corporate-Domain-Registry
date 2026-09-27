// React's CSSProperties has no index signature for CSS custom properties, so
// every `--token` style key would need a per-site cast. This augmentation
// types the whole `--*` key space once, with the value types React serializes
// into style attributes.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
