import type { Metadata } from "next";
import { SignInView } from "./SignInView";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminSignInPage() {
  return <SignInView />;
}
