import type { Metadata } from "next";
import { LettersView } from "./LettersView";

export const metadata: Metadata = { title: "Letters" };

export default function AdminLettersPage() {
  return <LettersView />;
}
