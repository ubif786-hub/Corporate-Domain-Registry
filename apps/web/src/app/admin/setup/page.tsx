import type { Metadata } from "next";
import { SetupView } from "./SetupView";

export const metadata: Metadata = { title: "Set up your sign-in" };

export default function AdminSetupPage() {
  return <SetupView />;
}
