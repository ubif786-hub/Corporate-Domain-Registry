import type { Metadata } from "next";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return <OrdersView />;
}
