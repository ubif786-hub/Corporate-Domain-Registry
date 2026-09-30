import type { NextConfig } from "next";
import { join } from "node:path";
import REDIRECTS from "./redirects.json";

// THE STATIC BUILD. The site ships as a static export that nginx serves on the droplet, with the
// API (apps/api) behind /api/. `scripts/export-static.mjs` sets STATIC_EXPORT=1 and is the only
// thing that should: it also moves the server-only routes aside for the build. nginx carries the
// redirects below (deploy/droplet/cdr-site.conf). Without the flag this file builds as it always has.
const STATIC_EXPORT = process.env.STATIC_EXPORT === "1";
// `npm run dev` sends /api/* to the API (apps/api, `npm run dev:api`). The export has no rewrites:
// on the server nginx sends /api/ to the API itself.
const API_ORIGIN = process.env.API_ORIGIN || "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  // The catalogue and the API's reply types live in packages/shared, shipped as TypeScript source.
  transpilePackages: ["@cdr/shared"],
  // The workspace root (the folder with the lockfile), so Turbopack can read packages/shared.
  turbopack: { root: join(process.cwd(), "..", "..") },
  ...(STATIC_EXPORT
    ? {}
    : {
        async rewrites() {
          return { beforeFiles: [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }] };
        },
      }),
  ...(STATIC_EXPORT
    ? {
        output: "export" as const,
        // A folder per route with its own index.html, so nginx serves /search/ with no rewrite
        // and a reload of any page finds a real file.
        trailingSlash: true,
      }
    : {}),
  // Next 16 blocks dev resources (HMR, the client runtime) from origins not listed
  // here. The CDP verification harness drives the app over 127.0.0.1 (headless Edge
  // binds CDP to IPv4), so allow it or the client will not hydrate under a probe.
  allowedDevOrigins: ["127.0.0.1"],
  // The 23 Aug 2026 rebuild (the bltz.com register) folded the draft's seventeen routes into
  // eight. Every retired URL lands on its successor so nothing a client bookmarked 404s.
  //
  // /checkout IS A REAL PAGE AGAIN (18 Sep 2026) and its 308 to /cart had to come out here in the
  // same edit that added the page. A redirect runs before a route, so leaving it would have
  // shadowed the new page entirely and silently, the same trap /legal/:path* records below. It
  // was PERMANENT, so a browser that ever followed it has the redirect cached: a hard reload is
  // the cure for anyone testing who still lands on /cart.
  // /register, /transfer and /renew were 308s onto /search?service=X until 4 Sep 2026. They
  // are REAL PAGES again now, and the redirects had to come out in the same edit: a redirect
  // runs before a route, so leaving them would have shadowed the three new pages entirely and
  // silently (the same trap /legal/:path* documents below). They render the one search
  // experience with their own heading, which is the reference's own anatomy and is what keeps
  // transfer and renew first-class after the service tabs were removed.
  // 31 Aug 2026, owner instruction: the pricing tab and page are gone. Temporary, not
  // permanent: the page was removed because the price list has never arrived, and if the
  // client sends one the route comes back. A 308 here would be cached by browsers and would
  // outlive that decision.
  //
  // THE LIST ITSELF LIVES IN redirects.json (20 Sep 2026). deploy/droplet/cdr-site.conf repeats it
  // for nginx; keep the two in step. `permanent` false is the temporary kind (307 here, 302 there).
  async redirects() {
    return REDIRECTS;
  },
  images: {
    // No Node means no image optimizer: the export serves each image as the file it is.
    unoptimized: STATIC_EXPORT,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Client images uploaded to a fork's Vercel Blob store are served from
        // <storeId>.public.blob.vercel-storage.com. Whitelisted here so every fork inherits it and
        // next/image optimises Blob URLs out of the box. The mother never serves Blob images itself;
        // this entry exists so a fork does not have to add it (keeps forks identical, see FORK_PROTOCOL).
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
