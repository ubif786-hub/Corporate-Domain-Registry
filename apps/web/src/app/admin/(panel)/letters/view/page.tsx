import type { Metadata } from "next";
import { MailingView } from "./MailingView";

export const metadata: Metadata = { title: "Mailing results" };

export default function AdminMailingPage() {
  return <MailingView />;
}
