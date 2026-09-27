import type { Metadata } from "next";
import { SearchRoute } from "../search/SearchRoute";

/* One of the three named doors onto the single search experience. See search/SearchRoute.tsx. */

export const metadata: Metadata = {
  title: "Register a domain",
  description: "Check whether the domain you want is free, then register it.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <SearchRoute
      title="Register a domain"
      lede="Enter the domain you want. If it is free you can register it here for one to five years."
    />
  );
}
