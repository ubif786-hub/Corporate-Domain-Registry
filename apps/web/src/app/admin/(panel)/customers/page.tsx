import type { Metadata } from "next";
import { CustomersView } from "./CustomersView";

export const metadata: Metadata = { title: "Customers" };

export default function AdminCustomersPage() {
  return <CustomersView />;
}
