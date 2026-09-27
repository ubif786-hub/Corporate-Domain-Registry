import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { CartView } from "./CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "The domains you are about to register, transfer or renew.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

// No lede. The reference puts the item count beside the title and nothing else, and the count is
// client state, so CartView prints it; a static lede above a dynamic count line would be two
// subtitles saying different things. Width goes from md to lg because the table gained a column.
export default function CartPage() {
  return (
    <PagePanel title="Cart" size="lg" code="Z2">
      <CartView />
    </PagePanel>
  );
}
