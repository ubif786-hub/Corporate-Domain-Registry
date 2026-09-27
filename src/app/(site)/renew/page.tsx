import type { Metadata } from "next";
import { SearchRoute } from "../search/SearchRoute";

/* One of the three named doors onto the single search experience. See search/SearchRoute.tsx. */

export const metadata: Metadata = {
  title: "Renew a domain",
  description: "Extend a domain you already hold before it expires.",
  alternates: { canonical: "/renew" },
};

export default function RenewPage() {
  return (
    <SearchRoute
      title="Renew a domain"
      lede="Enter a domain you already hold to extend it before it expires."
    />
  );
}
