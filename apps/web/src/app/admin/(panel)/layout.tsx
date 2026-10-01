"use client";

import type { ReactNode } from "react";
import { RegionProvider } from "@/app/(site)/RegionProvider";
import { SessionProvider } from "../lib/session";
import { Shell } from "../ui/Shell";

// Every page behind the sign-in: the session, then the frame.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <RegionProvider>
      <SessionProvider>
        <Shell>{children}</Shell>
      </SessionProvider>
    </RegionProvider>
  );
}
