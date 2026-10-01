import type { Metadata } from "next";
import { DomainsView } from "./DomainsView";

export const metadata: Metadata = { title: "Domains" };

export default function AdminDomainsPage() {
  return <DomainsView />;
}
