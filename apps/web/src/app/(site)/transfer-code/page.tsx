import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { TransferCodeView } from "./TransferCodeView";

export const metadata: Metadata = {
  title: "Send your transfer code",
  description: "Send the transfer code for a domain you are moving to Corporate Domain Registry.",
  alternates: { canonical: "/transfer-code" },
  robots: { index: false, follow: false },
};

export default function TransferCodePage() {
  return (
    <PagePanel title="Send your transfer code" size="md" code="Z2">
      <TransferCodeView />
    </PagePanel>
  );
}
