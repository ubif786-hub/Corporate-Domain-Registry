import { StyleGuidePage } from "@/components/kit/StyleGuidePage";

export const metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

// The synced kit style guide (v3.0.0 kit fanout): the brand sheet for this site,
// flat and client-facing, runtime-derived from this fork's own tokens + brand
// overlay, mounted bare (no children) so it carries zero studio panels.
// Unpublished per FORK_PROTOCOL: noindexed, never linked in the nav, reachable
// by direct URL for studio and client reference.
export default function StyleGuideRoute() {
  return <StyleGuidePage />;
}
