import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { CheckoutView } from "./CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review what you are paying for before payment.",
  alternates: { canonical: "/checkout" },
  // Noindex for the same reason /cart is: the page has no meaning without a cart behind it, and a
  // search result landing a stranger on an empty checkout is a worse first impression than none.
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <PagePanel title="Checkout" size="lg" code="Z2">
      <CheckoutView />
    </PagePanel>
  );
}
