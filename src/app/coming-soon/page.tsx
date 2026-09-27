import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_FLASH_GUARD } from "@/components/theme/config";
import { ComingSoonSplash } from "@/components/ComingSoonSplash";
import { isComingSoonGated } from "@/comingSoon";

// The pre-launch holding page, scaffolded by fork-project.sh (promoted from the
// one-off on a client fork, 3 Sep 2026). OFF BY DEFAULT: see src/comingSoon.ts and
// src/proxy.ts. Nothing here goes live until COMING_SOON=1 is set in this fork's own Vercel
// project and it is redeployed.
//
// IT LIVES OUTSIDE (site) ON PURPOSE. Nav and Footer are mounted by (site)/layout.tsx and
// neither exposes a suppression prop (both are sync unit), so this is the only way to serve a
// chrome-free takeover. The cost is that this page inherits nothing from the (site) shell, so
// it mounts its own ThemeProvider and theme-flash guard here.
//
// ITS ROBOTS DIRECTIVE FOLLOWS THE GATE. Gated off, this is a thin side route and must stay
// noindex so it never competes with the fork's real pages. Gated on, IT IS the domain, and a
// domain with zero indexed pages forfeits its own brand query, so it flips to indexable
// (src/proxy.ts and robots.ts read the same flag, so the two cannot disagree).
export const metadata: Metadata = {
  title: { absolute: "Coming soon | Corporate Domain Registry" },
  description: "A new site for Corporate Domain Registry is on its way.",
  robots: isComingSoonGated() ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { canonical: "/coming-soon" },
};

export default function ComingSoonPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_FLASH_GUARD }} />
      <ThemeProvider>
        <main id="main">
          {/* No props by design (owner decisions, 4 Sep 2026). The mark defaults to the studio
              lockup: every fork wears the MW lockup until its own SVG lands, and a typed
              wordmark is never a placeholder. No action button: a holding page holds. Pass
              `mark` only with the client's real vector; pass `lede` or `contact` only once the
              words are confirmed. An unconfirmed phone or email renders as a link that looks
              tappable and does nothing (see ComingSoonSplash's own header comment). A client
              who wants a picture behind the lockup gets it fork-locally through the `layer`
              slot, the way one client fork did (REFACTOR_QUEUE CS-1). */}
          <ComingSoonSplash />
        </main>
      </ThemeProvider>
    </>
  );
}
