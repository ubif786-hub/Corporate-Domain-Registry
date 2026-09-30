import type { Metadata } from "next";
import { SearchRoute } from "./SearchRoute";

export const metadata: Metadata = {
  title: "Search a domain",
  description: "Check whether a domain is available, then register it.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <SearchRoute
      title="Search a domain"
      lede="Enter a domain with its extension to see if it is free to register."
    />
  );
}
