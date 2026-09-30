import type { Metadata } from "next";
import { SearchRoute } from "../search/SearchRoute";

/* One of the three named doors onto the single search experience. See search/SearchRoute.tsx. */

export const metadata: Metadata = {
  title: "Transfer a domain",
  description: "Move a domain you hold at another registrar to Corporate Domain Registry.",
  alternates: { canonical: "/transfer" },
};

export default function TransferPage() {
  return (
    <SearchRoute
      title="Transfer a domain"
      lede="Transfers are arranged by our team for now. Search your domain to check it, then email us to move it here."
    />
  );
}
