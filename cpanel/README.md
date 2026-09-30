# Hosting on cPanel

The client hosts this site on his own GoDaddy cPanel (owner, 20 Sep 2026). cPanel serves files and
PHP and runs no Node, so the site ships as a static export plus a few PHP scripts (the location
lookup and the shop). Nothing in the
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

## The shop (`--payments`)

**Only a `--payments` export carries the shop**; without the flag the search says online ordering
opens soon, the checkout keeps its placeholder, and no shop script or route ships.

| Route | Script | What it does |
| --- | --- | --- |
| `GET /api/domain-check/?domain=` | `api/domain-check.php` | Asks Tucows whether the name is free; `available`, `taken`, `premium`, `unsupported`, `invalid` or `error`. 30 searches a minute per visitor. |
| `POST /api/checkout/` | `api/checkout.php` | Registrant and cart in. Checks every domain again at the registry (no cache), prices it from `api/lib/catalog.json` in the visitor's currency (CAD in Canada, USD elsewhere), saves the order, and answers with a Stripe Checkout URL. The card is only authorised (`capture_method=manual`); promotion codes are entered on Stripe's page. |
| `POST /api/stripe-webhook/` | `api/stripe-webhook.php` | Verifies the signature, reads the PaymentIntent back from Stripe (must be `requires_capture` for the right amount), answers, then registers. |
| `GET /api/order-status/?order=&t=` | `api/order-status.php` | The done page's view of one order (the token comes back from Stripe in the address). Also picks up a payment whose webhook is late, and keeps registration moving. |
| `/api/admin/` | `api/admin.php` | Every order, one order in full, CSV export, Tucows balance. Signed in with `admin_token`. |
| cron | `api/cron.php` | Every 5 minutes: finishes registrations Tucows answers later, retries a failed capture, settles an order on day six before the card hold lapses, and picks up any payment whose webhook never came. |

**What happens to a paid order** (`api/lib/fulfil.php`): each domain is registered at Tucows
(`sw_register`, owner = admin = billing from the form, the reseller's tech contact, lock on,
auto-renew off, privacy off), then Stripe captures only the registered domains' share of the hold
and releases the rest; nothing registered means the hold is cancelled and nothing is charged. A
register whose reply is lost is never sent again blindly: the next pass asks Tucows for its orders
on that name first. The customer and `notify_email` each get one email with the result. Every step
is written to the order's history, shown on the admin page.

**The secrets live in ONE file ABOVE `public_html`:** `cdr-config.php` in the home folder, beside
`public_html`, never inside it. The template, with every setting explained, is
`cpanel/cdr-config.sample.php`. Orders are JSON files in `cdr-orders/` beside it (created on first
use, with a deny-all `.htaccess`). Nothing in the zip carries a key.

**Stripe needs one webhook endpoint**, `https://<domain>/api/stripe-webhook/`, for
`checkout.session.completed`, `checkout.session.expired` and
`checkout.session.async_payment_failed`. Its signing secret goes in `cdr-config.php`.

**Tucows live calls** are accepted only from the server IPs on the live account's IP Access Rules.
The test system (Horizon) has no such list. The host must reach port 55443 outbound; GoDaddy's
shared hosting does not (tested 28 and 29 Sep 2026).

**The cron job** (cPanel, Cron Jobs, every 5 minutes):

```
php /home/<cPanel user>/public_html/api/cron.php >/dev/null 2>&1
```

**Prove it locally** with the test keys in the repo's `cdr-config.php` (the folder above `out/`, as
the host's is above `public_html`; it and `cdr-orders/` are gitignored, and `mail_transport =>
'file'` writes the emails to `cdr-orders/outbox/`):

```
node scripts/export-cpanel.mjs --site https://www.corporatedomainregistry.com --payments
php -S 127.0.0.1:8099 -t out cpanel/local-router.php
stripe listen --forward-to http://127.0.0.1:8099/api/stripe-webhook/ --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_failed
```

The webhook is optional locally: the done page reads the payment from Stripe itself when no
webhook arrives. `scripts/probe-payment-php.mjs` predates the shop (it expects the old `paid`
status) and is out of date.

On the real host, beside the curls above:

```
curl -s  "https://<domain>/api/domain-check/?domain=example.com"   # {"status":"taken",...}
curl -sI https://<domain>/api/checkout/                            # 405: answers only to POST
curl -s -X POST https://<domain>/api/stripe-webhook/               # 400 signature
curl -sI https://<domain>/api/lib/cdr.php                          # 403, never 200
```

A `503 not_configured` means `cdr-config.php` is missing, in the wrong folder, or still holds a
`PASTE` placeholder.

## Still to come

Renewals, transfers, `.ca` and RDAP whois (Stage 2), on the same pattern: a PHP script under
`api/`, its secret in `cdr-config.php`.
