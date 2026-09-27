import type { Metadata } from "next";
import { Fraunces, Geist, Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import { RouteScrollReset } from "@/components/RouteScrollReset";
import { Cursor } from "@/components/motion/Cursor";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SITE } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";
import "./tokens.css";
import "./brand.css"; // fork-owned brand overlay; must load after tokens.css
import "./lenis.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Geist powers the brand wordmark only. This fork's wordmark ((site)/layout.tsx) asks
// --weight-medium (500) with exaggerated tracking. Loaded as the VARIABLE face (no weight
// array) so 500 resolves on the axis; until 23 Aug 2026 it was pinned to static 300 and 400,
// and the browser silently drew the wordmark at 400 (typography audit, T-4).
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // The site's own copy (src/data/site.ts); page files set their own titles under this template.
  title: { default: `${SITE.name}: domain registration, transfer and renewal`, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  // Absolute base for OG and canonicals, from the one derived origin (18 Sep 2026). It was left
  // implicit here on the reasoning that Vercel supplies VERCEL_PROJECT_PRODUCTION_URL anyway, and
  // that is true on Vercel and nowhere else: a local build, a self-hosted one or any other host
  // resolves canonicals against localhost. It is also the value that decides every canonical and
  // every share-card URL, so it is the one that should be stated rather than inferred.
  metadataBase: new URL(SITE_URL),
  // The OG card and icon ride the file conventions (opengraph-image.tsx, icon.svg).
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

/* ============================================================
   RESPONSIVE CHROME / HORIZONTAL-SCROLL AUDIT — 2026-05-25

   Symptom: laptop widths (1280–1440px) scrolled horizontally. The chrome
   (DocsNav + SystemControls + DocsSidebar) grew additively across sessions
   and the layout math stopped fitting. Traced the structural contributors and
   fixed each at its source rather than masking with overflow:hidden on body.

   Contributors and resolutions:

   A. SystemControls — five dials laid flat total ~1400px. They used to sit in
      one centred flex-wrap row, so on a 1280–1440 laptop they wrapped mid-bar
      and the widest single line could still press the edge. Now a real
      breakpoint ladder: one row ≥1024, a clean two-line wrap 768–1024, and a
      collapsed "controls" dropdown <768 (SystemControls.tsx).

   B. DocsNav — brand + centred links + external icons. The three-column grid
      (1fr auto 1fr) is fine at desktop; below 1024 the links/icons now hide
      behind a hamburger that opens a full-screen overlay, so the bar never has
      to fit all three groups on a narrow line (DocsNav.tsx).

   C. DocsSidebar — fixed 14rem card. Already gated to ≥1024 via its own media
      query; the matching content inset (margin-left:18rem in tokens.css) is
      gated to the same breakpoint, so below 1024 there is no reserved gutter
      and no off-canvas element. Left as-is (verified, not changed).

   D. Containers / Row / Column — Row and Column already carry min-width:0 on
      their grid tracks (minmax(0,1fr) / min-width:0), so a wide flex/grid child
      (a long code line, a wide token name) can no longer force a parent past
      100vw. Container is width:100% + max-width, never a fixed width.

   E. Code blocks — CodeBlock's frame is overflow-x:auto, so long shiki lines
      scroll inside the block instead of widening the page.

   F. Fluid gutters — --raw-container-padding-x is now a clamp so the inline
      padding shrinks on small viewports instead of eating a fixed 1.5rem.

   Viewport sweep (1920/1440/1280/1024/768/414/375) is Ali's manual checklist;
   no headless browser is wired into this repo to assert it in CI.

   2026-06-10 postscript: contributors A and B are historical. Phase 3 (see
   NAV_PLAN.md) replaced the DocsNav + SystemControls two-decker with the
   merged DocsBar (condense-to-fit dials, no wrap band) plus the DocsDrawer;
   both old components are deleted. C–F still describe live code.
   ============================================================ */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The (site) flash guard sets data-theme from a stored override before
      // hydration; suppress the resulting expected attribute mismatch on <html>.
      suppressHydrationWarning
      data-spacing="normal"
      data-type="composed"
      data-motion="gentle"
      data-theme="light"
      data-radius="sharp"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${geist.variable}`}
    >
      <body>
        <ToastProvider>
          <Cursor />
          {/* Single app-root wrapper so a body-portaled Modal can make the
              whole page behind it inert while open (real AT isolation;
              aria-modal alone is honored inconsistently across screen
              readers). The Modal portals to document.body as a sibling of
              this node, so it stays interactive while #mw-app-root goes
              inert. Cursor and the ToastViewport sit outside the wrapper, so
              they remain live above the modal (--z-cursor / --z-toast >
              --z-modal). A plain, transform-free div does not establish a
              containing block, so the fixed/sticky chrome and Lenis (which
              scrolls the window) are unaffected.

              Route-group chrome split: the docs chrome (the merged DocsBar)
              lives in (docs)/layout.tsx so it renders only on the reference
              routes. The (site) group ships its own chrome-free shell. Both
              groups render inside this wrapper and the SmoothScroll provider,
              so smooth scroll, the cursor, toasts, and the inert contract are
              shared by every route. */}
          <div id="mw-app-root">
            <SmoothScroll>
              {/* Inside the provider so the reset drives Lenis itself; one
                  mount covers every route group. */}
              <RouteScrollReset />
              {children}
            </SmoothScroll>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
