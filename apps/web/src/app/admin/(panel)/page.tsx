import type { Metadata } from "next";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <DashboardView />;
}
