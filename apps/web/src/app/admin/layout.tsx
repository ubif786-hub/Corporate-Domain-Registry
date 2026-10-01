import type { Metadata } from "next";
import "./admin.css";

// The admin panel's root. The public site's look without its motion: before the page paints, the
// motion dial is pinned to "still", which turns off smooth scrolling, the trailing cursor and every
// token-driven transition the shared components carry. Never indexed, never in the sitemap.

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Corporate Domain Registry" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const STILL = `document.documentElement.setAttribute("data-motion","still");document.documentElement.setAttribute("data-theme","light");`;

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: STILL }} />
      <div data-admin="">{children}</div>
    </>
  );
}
