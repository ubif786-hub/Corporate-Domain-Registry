import { ComponentsShowroom } from "@/components/kit/ComponentsShowroom";

export const metadata = {
  title: "Components",
  robots: { index: false, follow: false },
};

// The synced kit showroom (v3.0.0 kit fanout): every design-system component
// rendered live in this site's own brand, coverage-checked in the mother.
// Unpublished per FORK_PROTOCOL: noindexed, never linked in the nav.
export default function ComponentsRoute() {
  return <ComponentsShowroom />;
}
