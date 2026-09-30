import type { Metadata } from "next";
import { PagePanel } from "../PagePanel";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your domains, renewals and invoices.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <PagePanel title="Sign in" lede="Your domains, renewals and invoices in one place." size="md" code="Z2">
      <LoginForm />
    </PagePanel>
  );
}
