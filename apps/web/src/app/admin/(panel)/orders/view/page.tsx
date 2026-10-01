import type { Metadata } from "next";
import { OrderView } from "./OrderView";

export const metadata: Metadata = { title: "Order" };

export default function AdminOrderPage() {
  return <OrderView />;
}
