import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { RenewPanelFromUrl } from "../DomainFromUrl";

/* The renewal page (RenewPanel): for domains registered with CDR. Not in the menu; the client
   sends the link to past buyers, and the home page's Renew card leads here. */

export const metadata: Metadata = {
  title: "Renew a domain",
  description: "Renew a domain registered with Corporate Domain Registry before it expires.",
  alternates: { canonical: "/renew" },
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
