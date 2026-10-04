import { AnalyticsBeacon } from "./AnalyticsBeacon";
import { CartProvider } from "./CartProvider";
import { RegionProvider } from "./RegionProvider";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { THEME_FLASH_GUARD } from "@/components/theme/config";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// The site shell, rebuilt 23 Aug 2026 to the bltz.com register the client asked for: a brand row
// and a route tab strip on top, one dark line at the bottom, and the page between them on the
// secondary ground so white panels read as panels. Nothing from the sync unit is modified; the
// header and footer are fork-owned compositions (see their files for why not Nav and Footer).
//
// The page ground is set on <main> rather than html/body, so the docs-style kit mounts
// (/components, /style-guide) keep their own ground.
//
// No startup loader: the studio's PageLoader drew the magenta "MW" mark on first paint, and the
// client asked for it gone (Sep 2026).

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_FLASH_GUARD }} />
      <ThemeProvider>
        <RegionProvider>
          <CartProvider>
            <AnalyticsBeacon />
            {/* A screen-tall column, so the footer sits at the bottom of a short page (the home page
                since its cards came out, 4 Oct 2026) instead of leaving bare ground under it. */}
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
              <SiteHeader />
              <main id="main" style={{ flex: "1 0 auto", background: "var(--background-positive-secondary)" }}>
                {children}
              </main>
              <SiteFooter />
            </div>
          </CartProvider>
        </RegionProvider>
      </ThemeProvider>
    </>
  );
}
