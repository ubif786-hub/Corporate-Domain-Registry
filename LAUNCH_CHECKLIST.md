# Launch checklist: domain-services

Run this before pointing the client's domain at the site. Tick every box. A miss here is what
separates a studio launch from an intern launch.

## Content and brand
- [ ] Real content in every page; all placeholder and lorem removed.
- [ ] Brand tokens set (colours, type, radius); the site looks like the client, not the default.
- [ ] Favicon and app icons in place: replace `src/app/icon.svg` with the client mark, then run `node scripts/gen-favicon.mjs` (needs the playwright-core scratch install, see probe-contrast.mjs) so `src/app/favicon.ico` is the same mark. Until both are replaced the site wears the studio mark, which five forks still did on 23 Aug 2026 (ameritech-security, domain-services, galaxy-studio, studio-moonlight, zyvra).
- [ ] Open Graph and Twitter image and tags on the key pages.
- [ ] The 404 page is intentional, not the framework default.

## Domain and deploy
- [ ] Custom domain added in Vercel, SSL green.
- [ ] Production branch is `main`; a fresh push deploys to production.
- [ ] The staging / preview build was reviewed and approved by the client.
- [ ] `/` points at the real homepage (the `/studio` placeholder promoted or replaced).

## Environment and integrations
- [ ] Env vars set for Production AND Preview; no secrets committed to the repo.
- [ ] Forms submit end to end (send a real test; confirm the inbox or store received it).
- [ ] Spam protection on forms (honeypot at minimum; BotID or Turnstile if it is a target).
- [ ] CMS connected and content pulling (if the project uses one).
- [ ] Analytics installed (Vercel Analytics + Speed Insights, or the client's tool).

## SEO and metadata
- [ ] Unique title and meta description per page.
- [ ] `sitemap.xml` and `robots.txt`.
- [ ] Canonical URLs; hreflang if the site is localised.
- [ ] Structured data where it helps (organisation, article, product).

## Quality
- [ ] Lighthouse pass (performance, accessibility, SEO, best practices) on mobile and desktop.
- [ ] Responsive pass at mobile, tablet, and desktop.
- [ ] Reduced-motion pass (animations settle; nothing essential is motion-only).
- [ ] Every image optimised and has alt text; no oversized media in the repo (large assets live off git).
- [ ] Cross-browser spot check; no broken links.

## Handover
- [ ] Domain ownership confirmed (usually the client owns it, DNS delegated to Vercel).
- [ ] Repo access sorted; the client knows what they hold (a fork, not the design system).
- [ ] Privacy policy and cookie notice if the site collects data.
- [ ] This checklist archived with the project record.
