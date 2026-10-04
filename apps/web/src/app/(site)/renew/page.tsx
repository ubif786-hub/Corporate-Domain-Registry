import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { RenewPanelFromUrl } from "../DomainFromUrl";

/* The renewal page (RenewPanel): for domains registered with CDR. Hidden (owner, call of 3 Oct
   2026): nothing on the site links here and search engines are told not to index it; the client
   sends the link to past buyers (Admin, Analytics, renewal list). */

export const metadata: Metadata = {
  title: "Renew a domain",
  description: "Renew a domain registered with Corporate Domain Registry before it expires.",
  alternates: { canonical: "/renew" },
  robots: { index: false },
};

export default function RenewPage() {
  return (
    <PagePanel
      code="Z2"
      title="Renew a domain"
      lede="Enter a domain registered with us to see when it expires and renew it. Your card is only charged once the renewal goes through."
    >
      <RenewPanelFromUrl />
    </PagePanel>
  );
}
