import type { Metadata } from "next";
import { PagePanel } from "../../PagePanel";
import { DoneView } from "./DoneView";

export const metadata: Metadata = {
  title: "Order received",
  description: "Your order has been received.",
  alternates: { canonical: "/checkout/done" },
  robots: { index: false, follow: false },
};

export default function CheckoutDonePage() {
  return (
    <PagePanel title="Thank you" size="md" code="Z2">
      <DoneView />
    </PagePanel>
  );
}
