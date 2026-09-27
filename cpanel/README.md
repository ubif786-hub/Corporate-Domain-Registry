# Hosting on cPanel

The client hosts this site on his own GoDaddy cPanel (owner, 20 Sep 2026). cPanel serves files and
PHP and runs no Node, so the site ships as a static export plus a few PHP scripts (the location
lookup and, since 23 Sep 2026, payment). Nothing in the
exported folder talks to Vercel, and the export refuses to finish if any Vercel address survives
in it.

## Make the folder

```
node scripts/export-cpanel.mjs --site https://www.<the client's domain> --dest "C:/Users/ali/OneDrive/Desktop/corporate-domain-registry-site"
```

`--site` is the real address the site will answer on. It is written into every canonical link, the
sitemap, robots.txt and the share card, so a placeholder here ships wrong addresses.

## Prove it before it leaves the laptop

```
php -S 127.0.0.1:8099 -t out cpanel/local-router.php
node scripts/probe-cpanel-parity.mjs
```

The probe compares every page against the approved site at 1440 and 390, pixel for pixel, then
drives the export as a Canadian, a US and a German visitor: region, logo, currency, the location
panel, a typed search, a deep link, the cart, whois. It must end `PARITY OK`. It opens the panel
by HOVER, which is how the client uses it; a click toggles it shut again.

PHP is not installed on the laptop. A portable copy (the zip from windows.php.net, unpacked
anywhere) is enough; nothing needs installing.

## Upload

1. cPanel, File Manager, open `public_html`. Settings (top right), tick "Show hidden files", or
   `.htaccess` is invisible and looks missing.
2. Make the zip with `powershell -File cpanel/make-zip.ps1 -Dest <path>.zip`, NEVER with
   `Compress-Archive`: Windows PowerShell 5.1 writes entry names with backslashes, and cPanel's
   Linux unzip turns `api\geo.php` into one flat file of that name, so the site arrives with no
   folders (caught 21 Sep 2026 by listing the first zip before it was uploaded). The script zips
   the CONTENTS of `out/`, writes forward slashes and refuses a zip that has a backslash or lacks
   `.htaccess`. Upload the zip into `public_html`, select it, Extract, then delete the zip. One
   large upload is far more reliable than three hundred small ones, and the IP database alone is
   127 MB.
3. Confirm `.htaccess`, `index.html`, `api/` and `_next/` sit directly inside `public_html`.

## Point the domain at the hosting

Uploading does not make the site live. On 21 Sep 2026 `corporatedomainregistry.com` resolved to
GoDaddy's PARKING addresses (76.223.105.230 and 13.248.243.5, `Server: DPS`), not to the cPanel
account, with `www` redirecting to the bare domain. The `@` A record has to carry the cPanel
account's Shared IP Address (cPanel home, General Information), `www` a CNAME to `@`, any domain
Forwarding removed, and AutoSSL run for both names. The zone is on GoDaddy's nameservers
(`domaincontrol.com`); MX and TXT records are his mail and are never touched. The export's
`.htaccess` sends the bare domain to `www`, because the cart lives in the browser PER ADDRESS: a
visitor who adds a domain on one host and lands on the other sees an empty cart.

## Check it on the real host

`local-router.php` stands in for Apache locally, so the generated `.htaccess` is only proven here:

```
curl -s  https://<domain>/api/geo                      # five fields, your own country
curl -sI https://<domain>/lookup                       # 308 to /whois/
curl -sI https://<domain>/api/geo/dbip-city-lite.mmdb  # 403, never 200
curl -sI https://<domain>/opengraph-image              # content-type: image/png
node scripts/probe-cpanel-parity.mjs --export https://<domain> --work-only
```

FIRST RUN ON THE REAL HOST, 21 Sep 2026: all four answered as written, with one surprise. The bare
`/api/geo` answers 301 to `/api/geo/` first, because a FOLDER of that name holds the IP database
and Apache's folder redirect runs ahead of the rewrite. The page asks for `/api/geo/` in the
export for that reason; with curl, add `-L` or the slash.

Then look at it ON A PHONE WIDTH, which the four curls cannot do. The same day the owner found the
tab strip and the location panel cut off at 390 on the live host: both were in the approved site
too, and the parity probe had passed them because it compares the export WITH staging, and a bug
both sides share is parity. Parity proves the move; it does not prove the design.

```
node scripts/probe-phone.mjs https://<domain>
```

measures both at 390 with a touch screen: the four tabs fit without scrolling, a tap opens the
location panel inside the gutters with its IP row rendered and leaves it open, a tap outside closes
it. It ends with a sentinel that puts the old tab rule back and expects an overflow, so a pass is a
pass. On 22 Sep 2026 it FAILED on the live host and passed on staging: the zip carrying the fix had
been cut on the 21st and not yet uploaded, and no fingerprint in the served HTML could have said
so (the CSS bundle was identical either side; the fix lives in JS).

If `/api/geo` answers 404 or prints PHP source, the host has rewriting or PHP switched off for the
folder; MultiPHP Manager in cPanel sets the version (anything from 7.2 up works).

## Updating the site

Change the code, export again, upload again. Everything under `_next/` is fingerprinted, so old and
new files cannot collide; delete the old `_next/` folder first to keep the account tidy.

## The IP database

`api/geo/dbip-city-lite.mmdb` is DB-IP's free "IP to City Lite", refreshed monthly. Addresses move
between countries slowly, so a stale file degrades gently (a visitor is occasionally placed in the
wrong city), but refresh it every few months: delete `cpanel/api/geo/dbip-city-lite.mmdb` and
export again, and the script downloads the current one. It is licensed CC BY 4.0, which asks for a
credit to DB-IP wherever the data is shown. It is not in git.

## What the export leaves out, and why

- `/api/geo` as a Node route: replaced by `api/geo.php`, same five fields, same shape.
- Payment on Vercel: there is none. The checkout form renders only in this export; the Vercel
  preview shows a box saying payment is taken on the client's own site (decision 12 D9).
- The holding page and the proxy that gates it: on cPanel, launching is uploading.
- `/components` and `/style-guide`: the studio's design-system reference routes, unlinked and
  noindexed, and the only pages that read the studio's own image store.
- The two HQ manifests and the analytics beacon: they report to the studio's dashboard.

## Payment: built, OFF, and not the client's yet

**Nothing below ships by default.** Payment, reseller fulfilment and registrant data are backend
work outside this front-end agreement (PROJECT.md decision 13, 23 Sep 2026); the owner has put it
to the client as his decision. An export includes the payment scripts, their two routes and the
checkout form ONLY with `--payments`; without it the checkout keeps the client's approved
placeholder and the zip carries no payment script and no payment route (the form's JavaScript
still sits in the bundle, unreachable: it never renders and has nothing to post to; measured
23 Sep 2026, 300 files against 304 with the flag). **Never cut a zip for the client with
`--payments`** until he has commissioned it and fulfilment exists.

What the flag adds, TEST MODE until registration exists. Two scripts on the `geo.php` pattern
(PROJECT.md decision 12):

| Route | Script | What it does |
| --- | --- | --- |
| `POST /api/checkout/` | `api/checkout.php` | The checkout form's registrant and cart in; prices every line from `api/lib/catalog.json` (the same file the page renders from), saves the order as `pending_payment`, answers with a Stripe Checkout URL |
| `POST /api/stripe-webhook/` | `api/stripe-webhook.php` | Stripe's events in; verifies the signature, marks the order `paid` (or `amount_mismatch`, `payment_failed`, `expired`) and emails CDR |

**The secrets live in ONE file ABOVE `public_html`:** `cdr-config.php` in the cPanel home folder,
beside `public_html`, never inside it. The template is `cpanel/cdr-config.sample.php`: the Stripe
secret key, the webhook signing secret, the notice address, the site address and the sender. The
scripts find it as the folder above the document root, and write each order as a JSON file into
`cdr-orders/` beside it (created on first use, with a deny-all `.htaccess` in case a host ever
serves it). Nothing in the zip carries a key; the config file is a separate upload.

**A paid order is not a registered domain.** The notice says so and lists what to register in the
OpenSRS panel. OpenSRS fulfilment is REFACTOR_QUEUE CDR-FULFIL-1, and live keys wait for it.

**The Stripe dashboard needs one webhook endpoint**, `https://<domain>/api/stripe-webhook/` (the
rule matches it with or without the slash; unlike `api/geo/` no folder of that name exists, so
Apache has no folder redirect to run ahead of it), for
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed` and `checkout.session.expired`. Its signing secret goes in
`cdr-config.php`.

**Prove it locally**, both halves:

```
# the scripts' own refusals and state changes, no Stripe involved (fake key, own signing secret)
node scripts/probe-payment-php.mjs --orders <cdr-orders dir> --secret-file <file holding a whsec_>

# the real round trip on test keys: the CLI's signing secret into a file, never onto the screen
stripe listen --api-key <test key> --print-secret > <scratch>/whsec.txt
node scripts/local-cdr-config.mjs --key-var <NAME in .env.local> --webhook-secret-file <scratch>/whsec.txt
stripe listen --api-key <test key> --forward-to http://127.0.0.1:8099/api/stripe-webhook/ --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired
```

`local-cdr-config.mjs` writes `cdr-config.php` at the repo root, which is the folder above `out/`
exactly as the host's is above `public_html`; it refuses a key that is not a test key, and it and
`cdr-orders/` are gitignored. Locally the notices go to `cdr-orders/outbox/` rather than a mail
server.

On the real host, beside the four curls above:

```
curl -sI https://<domain>/api/checkout/            # 405: the script answers, and only to POST
curl -s -X POST https://<domain>/api/stripe-webhook/  # 400 signature: it refuses an unsigned call
curl -sI https://<domain>/api/lib/cdr.php          # 403, never 200
```

A `503 not_configured` from either means `cdr-config.php` is missing or in the wrong folder.

## Still to come on this host

OpenSRS (registration, renewal, transfer; REFACTOR_QUEUE CDR-FULFIL-1) and RDAP whois
(CDR-RDAP-1), on the same pattern: a PHP script under `api/`, its secret in `cdr-config.php`.
