# Corporate Domain Registry: source handoff

Prepared by Magenta Web on 26 September 2026 for the incoming backend developer. Everything the
site is built from is in this folder. Nothing in it carries a secret.

## What is in this folder

| Path | What it is |
| --- | --- |
| `source/` | The complete source tree of the site as of commit `ebc0c61` on the working branch (`staging`): Next.js 16, React 19, TypeScript. 308 files. This is what the live site was built FROM. |
| `live-site-export-v3.zip` | The static export cut from this source on 25 September 2026: the folder that goes into `public_html` on cPanel (HTML, CSS, JS, `api/geo.php`, the IP database, `.htaccess`). The site currently live at www.corporatedomainregistry.com is the previous cut, v2, from the same source minus one design-system update. |
| `assets/` | The two image files the site loads from Magenta Web's image store rather than from `public/`: `home-hero.webp` and `search-backdrop.webp`, with the manifest (`assets.files.json`) that maps them to their slots. Every other image is in `source/public/`. |
| `git-log.txt` | The commit history, 181 commits, oldest first, so you can see what was done when and why. |

## Why cPanel does not hold the source

cPanel serves a **build**, not the code. What was uploaded there is the output of `next build`
run as a static export: compiled HTML, hashed CSS and JavaScript bundles, one PHP script and an
IP database. You cannot get TypeScript components, page templates, data files, the design system
or the build pipeline back out of that, any more than you can get a Photoshop file back out of a
JPEG. The source has always lived in a private GitHub repository (`magenta-web/domain-services`),
and Magenta Web's Vercel account only ran the review copy of that repository. So "there is code
on Vercel" is a muddled version of the true statement: the code is in the repository, and this
folder is that repository.

What Vercel held beyond the repository: the two image files in `assets/`, on its Blob storage. The
export copies them into the folder, so the live site never depended on Vercel at runtime. They
are included here so a rebuild from source needs nothing from Magenta Web.

## Running it

```
cd source
npm install
npm run dev            # http://localhost:3000
```

Node 22. The `/api/geo` route reads the visitor's country; in development it returns a fixed
answer unless the IP database is present.

## Building the cPanel folder

`source/cpanel/README.md` is the whole procedure and is the document to read first. In short:

```
node scripts/export-cpanel.mjs --site https://www.corporatedomainregistry.com --dest <folder>
```

It writes the static site, `api/geo.php`, the `.htaccess` redirects (from `redirects.json`, the
one list `next.config.ts` also reads), downloads the DB-IP City Lite database into `api/geo/`
(CC BY 4.0: DB-IP asks for a credit wherever its data is shown), and refuses the folder if any
Vercel address survives in it. Zip it with `cpanel/make-zip.ps1` (never `Compress-Archive`,
which writes entry names Linux unzip cannot read), upload into `public_html`, extract, delete
the old `_next/` folder first when updating.

`scripts/probe-cpanel-parity.mjs` and `scripts/probe-phone.mjs` are the checks that were run
before every upload; they need a local PHP (`php -S 127.0.0.1:8099 -t out cpanel/local-router.php`).

## Payment, reselling and registrant data: built, switched off, yours to finish

The checkout form, `cpanel/api/checkout.php` and `cpanel/api/stripe-webhook.php` exist and are
excluded from the export unless it is cut with `--payments`. They read prices from
`src/data/catalog.json` and their secrets from a `cdr-config.php` placed ABOVE `public_html`,
never inside it. `scripts/probe-payment-php.mjs` and `scripts/probe-stripe-checkout.mjs` test
them against Stripe test keys. Registration, renewal and transfer fulfilment (OpenSRS) and a
live whois or RDAP source are not built; `cpanel/README.md`, "Still to come on this host", and
`PROJECT.md` describe the intended shape (a PHP script under `api/`, its secret in
`cdr-config.php`). No Stripe, OpenSRS or registrar credential was ever in this code or on Vercel.

## Environment variables the code reads

Names only; no values ship here. `NEXT_PUBLIC_SITE_URL` (the canonical origin, set at export),
`STATIC_EXPORT` and `NEXT_PUBLIC_STATIC_EXPORT` (set by the export script), `NEXT_PUBLIC_PAYMENTS`
(the `--payments` switch), `COMING_SOON` and `COMING_SOON_PREVIEW_TOKEN` (Vercel's holding page;
irrelevant on cPanel), `BLOB_READ_WRITE_TOKEN` (Magenta Web's image store; not needed once
`assets/` is in `public/`), `MW_PLAYWRIGHT` (the test scripts' browser path).

## The design system

`src/components/**` and `src/app/tokens.css` are Magenta Web's design system, included in this
handover by the studio's decision so the site is complete and buildable on its own. They are
plain React components on CSS custom properties; nothing in them phones home. The two routes
`/components` and `/style-guide` are the studio's reference pages, unlinked and noindexed, and
the export leaves them out.

## Where to read next

- `source/cpanel/README.md`: hosting, exporting, proving, uploading, updating.
- `source/PROJECT.md`: what the site is, the decisions taken and why, what is still open.
- `source/HANDOFF.md` and `source/SESSION_LOG.md`: the working notes, most recent first.

Magenta Web · ali@magentaweb.io
