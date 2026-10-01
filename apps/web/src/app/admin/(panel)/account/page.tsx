import type { Metadata } from "next";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Your account" };

export default function AdminAccountPage() {
  return <AccountView />;
}
