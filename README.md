# Corporate Domain Registry

The website and domain shop for https://www.corporatedomainregistry.com: live availability and
prices from Tucows (OpenSRS), Stripe checkout, registration after payment, and the card hold
released for anything that fails.

## Layout

```
apps/web         the site: Next.js 16, shipped as a static export that nginx serves
apps/api         the shop's API: Express 5 on Node 22, behind nginx at /api/
packages/shared  what both agree on: the catalogue and prices, the domain rules, the API's reply types
deploy/droplet   the DigitalOcean server: nginx, the systemd unit, setup and HTTPS scripts
```

An npm workspace: one `npm install` at the root installs all three.

## Run it locally

```
npm install
npm run dev:api        # the API on http://127.0.0.1:4000 (needs apps/api/cdr.env, see apps/api/README.md)
npm run dev:web        # the site on http://localhost:3000, /api/* forwarded to the API
```

The shop shows in the pages only when `NEXT_PUBLIC_PAYMENTS=1` is set for the web app.

## Build

```
npm run build:web      # apps/web/out, the static site with the shop on
npm run build:api      # apps/api/dist/server.js, one file with every dependency inside
npm run typecheck
```

Deploying: `deploy/droplet/README.md`.

## History

The front end was built by Magenta Web on its own design system (`apps/web/src/components`); its
notes are kept at the root (`HANDOFF.md`, `PROJECT.md`, `SESSION_LOG.md` and the rest) as
reference. The first shop backend was PHP for GoDaddy's cPanel (commit `90318d9`); it moved to the
Express API when the site moved to DigitalOcean.
