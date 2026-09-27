# domain-services

**This sheet carries ONLY what is true of this project.** Anything true of the studio, the design
system or the fleet lives in the mother (`magentaweb-starter`): `CLAUDE.md` for the rules,
`CONTEXT.md` for standing facts, `REFACTOR_QUEUE.md` for fleet-wide deferred work. Restating any of
it here is how two copies drift and the wrong one gets believed.

**And it carries no derived facts.** No pin, no version, no file count, no fork count, no URL that a
script can resolve. `node scripts/project-brief.mjs <this repo>` prints all of that fresh, from the
mother. Every number this studio has repeatedly got wrong was one somebody typed into a document.

Lifecycle: **edited, not overwritten.** `HANDOFF.md` is the overwrite-each-session snapshot;
`SESSION_LOG.md` is the append-only narrative; this is the durable middle — what the project IS,
what is undecided, and what is queued.

---

## What this is

<!-- Two or three sentences. What the product does, who it is for, and the one thing a newcomer
     would otherwise get wrong. Not a feature list. -->

A domain registrar front end. **Draft 2 is live**: a clean rebuild to the bltz.com register after
the client read draft 1 as missing the mark and named bltz.com as the reference. Eight pages on one
shell; every retired draft-1 URL redirects to its successor.

## Who is involved

<!-- Client and how they review. Any external team, and what they own. Who decides what. -->

**Corporate Domain Registry ("CDR")**, at CorporateDomainRegistry.com. Named 31 Aug 2026 by the six
legal documents the client sent, so it is sourced rather than remembered. Two corporate entities,
Richmond Hill Ontario and Wilmington Delaware.

The contact is **Iqbal Khan**, ikhan@fahmpartners.com, (416) 881-7886. That is a fahmpartners.com
address, NOT the CDR domain: he is the principal or agent, not the site support desk. His details
live in the mother's hq-data.ts and are not published on the site.

The business is an independent reseller and domain-management provider. All six documents state it
is NOT a registry operator and NOT an ICANN-accredited registrar, which constrains what the site
may call it.

## Hosting: the client's own cPanel, not Vercel (owner, 20 Sep 2026)

**The client paid for the code and wants all of it on his GoDaddy cPanel; the Vercel project is
to be taken down once his copy is live.** This is the fleet's one exception to "production is the
fork's `main` on Vercel", and it is his call, recorded here so nobody re-argues it.

cPanel serves files and PHP and runs no Node, so the site ships as a static export plus one PHP
script, built by `scripts/export-cpanel.mjs` and explained in `cpanel/README.md` (make the folder,
prove it, upload it, check it on the host). What changed in the code to allow it, all of it
behaviour-neutral: the five lookup pages read `?domain=` in the browser (`DomainFromUrl.tsx`)
instead of on the server; `robots.txt`, the sitemap, `llms.txt` and the share card are generated at
build time; the redirect list moved to `redirects.json` so next.config.ts and the export's
`.htaccess` read one list; the analytics beacon is off in the export. `/api/geo` is answered by
`cpanel/api/geo.php` from an IP database shipped in the folder, returning the same five fields.

**Proved, not assumed.** `scripts/probe-cpanel-parity.mjs` compares every page against the
approved site at 1440 and 390 (32 of 32 pixel-identical on 20 Sep) and drives the export as a
Canadian, a US and a German visitor: region, logo, currency, the hover panel, search, deep links,
the cart, whois. The generated `.htaccess` is the one thing a laptop cannot prove; the README
lists the four curls that settle it on the real host.

**The domain is `www.corporatedomainregistry.com` (owner, 21 Sep 2026)**, the bare domain
redirecting to it. The export for it passed the parity probe the same day and went to the owner's
Desktop as a zip with upload steps. That day the domain still resolved to GoDaddy's parking page,
so going live is two acts, both the owner's hands: the upload, and the `@` A record moved to the
cPanel account's shared IP (`cpanel/README.md`, "Point the domain at the hosting").

**Live, and the owner uploads it himself (25 Sep 2026).** The host answers on the domain, and the
owner now has cPanel access, so the "goes to Iqbal" step is retired. The export he uploaded on
25 Sep carries the location-panel fix (`ff34143`); `node scripts/probe-phone.mjs
https://www.corporatedomainregistry.com` ends PHONE OK on it.

**Owed:** a credit line for the IP database (DB-IP Lite is CC BY 4.0) or a paid
source instead, the owner's call; Stripe, then OpenSRS and RDAP, as PHP scripts on the same
pattern (decision 12); the source handover (the repository carries the magentaweb design system's components,
and whether that goes to the client is the owner's decision); then the Vercel project, its Blob
store and this fork's HQ card are retired.

## Open decisions

<!-- Numbered, and CLOSED RATHER THAN DELETED: a deleted decision reads as one that never existed,
     and the next person raises it again from scratch. Mark blocking ones, because "blocking" means
     the work cannot ship until it is answered, not that it is urgent. -->

0. CLOSED 19 Sep 2026 (owner, after the client's team met). **ONE NAME, TWO REGIONS, TWO LOGOS.**
   - **The name is Corporate Domain Registry everywhere a person reads it.** The header's
     "Domain registry" wordmark (decision 2's second half) is retired; `SITE.wordmark` reads
     `SITE.name`. The repo, the Vercel project and the Blob store stay `domain-services`: that is
     a rename of infrastructure (`scripts/rename-fork.sh` in the mother) and moves URLs and the
     HQ card, so it is its own job and was NOT done.
   - **Two regions, not three.** Canada sees the Canadian lockup, the Canadian flag and CAD;
     everyone else sees the American lockup, the American flag and USD. International is gone
     (decision 3 is superseded). The location panel still reports the country the edge saw.
   - **The header logo follows the region**, resolved in the browser so the HTML stays
     country-free and cached; the logo holds its box and paints nothing until the region is
     ready, so a Canadian never sees the American lockup flash. Measured with `/api/geo` stubbed:
     US and DE get the flag and USD, CA gets the leaf and CAD, at 1440 and 390.
   - **The suite is a studio reconstruction of two opaque PNGs and a GIF**, generated by
     `scripts/brand/domain-services.mjs` in the mother (the flag by construction, the leaf traced,
     the name in DM Sans 600). STAND-IN until the client sees it. The favicon is a static globe.
   - **`FX_RATE.CAD` is still 1**, a placeholder: a Canadian sees USD figures labelled CAD until
     the client gives a rate or a CAD price list. That is the bltz bug this file warns about, so
     it must be settled before launch, together with what currency Stripe charges in.
   - **How it gets verified:** the owner sees the American side from the US; the client, in
     Canada, sees the Canadian side in the 20 Sep meeting.
1. **The theme is pinned light for now** (23 Aug). Every visitor sees the light page with the dark
   hero band regardless of OS. The owner discusses theme and visuals with the client next; auto or
   a dark pin is the same one-line change and both themes already measure zero contrast failures.
2. CLOSED 31 Aug. **The client's name: Corporate Domain Registry.** `SITE.name` carries it. The
   header wordmark stays **"Domain registry"**, re-confirmed by the owner AFTER the naming, so the
   two strings differ on purpose. Raised once and standing: all six documents open by denying
   registry-operator status, so the short mark alone is a claim they refute; inside the full
   trading name the word is the client's own. A drawn logo replaces it later.
   **The slug rename is DEFERRED, not blocked.** `scripts/rename-fork.sh` misses all five live
   `domain-services` literals in this fork's `src/` (a sixth grep hit, `site.ts:71`, is JSDoc
   prose, not a live use), two of them `localStorage` keys whose rename
   would orphan every stored cart and region override. Decided slug: `corporate-domain-registry`.
3. CLOSED 31 Aug. **Visitor country: a three-region chip, and nobody is blocked.** US, CA, and an
   explicit International row. Geo preselects, the visitor can override, the override wins
   permanently. Currency does not change; every region is USD and the chip says so. Blocking
   non-US/CA visitors was raised by the owner and rejected: the site sells gTLDs with no residency
   requirement anywhere, bltz itself answers 200 to every country, and the owner is travelling on
   shared NAT and would be blocked by his own site. See `src/data/regions.ts` for the full argument.
4. CLOSED 31 Aug. **The mini-cart is a right-hand rail on /search**, the literal bltz shape, chosen
   over a drawer. It stands on the bare landing state too, and it has an empty state; the reference
   has neither.
5. CLOSED 31 Aug. **The whois result stays STRUCTURED FIELDS.** The reference prints a raw WHOIS
   text blob in monospace, and the decision was held for the CSV. The CSV arrived and settled it:
   there is no real feed behind this site, so a monospace blob would be a fabricated server
   response dressed as a transcript. Structured fields say what they are. Revisit if a live RDAP
   feed lands, where the raw text is a real field.
6. CLOSED, found stale 23 Sep 2026: the site has sold 1 to 10 years since the flat ladder landed
   on 18 Sep (`TERMS` in `src/data/site.ts`), and OpenSRS takes 1 to 10 where the registry does.
   The history, kept because the figures are measured: **Terms.** bltz sells 1 to 10 years, we sold 1 to 5.
   Extending means seventy more invented figures while `SUPPLIED.prices` is false. **Measured
   4 Sep 2026, so the figures are no longer a recollection:** the reference charges one flat
   ladder for every extension it sells (.com .net .org .info .biz alike) at $60 / 115 / 165 /
   215 / 265 / 305 / 345 / 375 / 405 / 430, plus a $300 redemption fee. This decision got MORE
   visible on the same date, not less: the term is now chosen on the search result rather than
   only in the cart, so the range is the first thing a visitor sees beside a price.
7. OPEN for the client; **the LAUNCH answer is no (owner, 23 Sep 2026, decision 12 D6).** **Is `.ca` sold?** CIRA is named in four of the six documents,
   the Ontario entity is the first address on /tos, and `.ca` is not in `EXTENSIONS`. If yes it is
   real checkout work: CIRA requires the registrant to pick one of eighteen Canadian Presence
   categories at registration. A whois fixture puts it on screen so the gap stays visible.
8. OPEN. **The legal entity per corporate address.** No Inc., Ltd., LLC or numbered company appears
   anywhere in six documents, and the reference site prints an entity above each street address.
9. **The search asks for no service, 4 Sep 2026. This REVERSES the three-tab model.** The owner
   said our search was noticeably unlike bltz's. Driven with a real browser rather than a fetch,
   the reference asks for a service NOWHERE: one field, and the RESULT decides, because a free
   domain is a registration and a taken one is a renewal or a transfer. We had it both ways at
   once, a home field hardcoded to `register` and a `/search` tab strip, so the site asked the
   visitor a question its own data could answer and then asked it twice. The tabs are gone.
   **Nothing was demoted to get there.** `/register`, `/transfer` and `/renew` are real pages
   again (they were 308s onto `/search?service=X`), each the same search with its own heading,
   which is the reference's own anatomy: bltz serves four such pages and links only two of them.
   Our three keep their home-page cards.
10. OPEN, and the one part of this only the client can settle. **Does CDR sell transfer and renewal
   as separately priced products, or does it fuse them the way the reference does?** bltz prints
   ONE line item, "Domain Renewal / Transfer", at one price, so a customer pays without ever
   saying which they bought. We keep them as two named actions on a taken domain and the cart line
   records which, because they are different operations (a transfer needs an auth code from the
   losing registrar; a renewal needs you to already hold the domain) and the Domain Registration
   and Management Agreement governs them separately. If the client wants the reference's fused
   single button, that is one edit to `SearchPanel`. **Do not fuse them without being asked.**
   **Settled from the API side by decision 12 D4:** OpenSRS can only RENEW a domain already in
   CDR's reseller account; anything held elsewhere is a TRANSFER (which adds a year). So the
   visitor keeps one label and the server decides which operation it is.

12. CLOSED 23 Sep 2026 (owner, "yes to all recommendations"). **The checkout, against the OpenSRS
    Domains API.** The provider is OpenSRS (Tucows), which the published agreement already names.
    Read from `domains.opensrs.guide` that day: XML over HTTPS on port 55443, signed
    `md5(md5(xml + key) + key)`; sandbox `horizon.opensrs.net` (keys from `manage.test.opensrs.com`,
    no IP whitelist), live `rr-n1-tor.opensrs.net` (whitelisted server IP required); a prepaid
    balance in USD only, 3% on card deposits; `GET_PRICE` is COST (OpenSRS plus ICANN fee), not a
    selling price; `LOOKUP` answers 210 available / 211 taken with `is_success=1` either way;
    registration needs a full contact set (owner, admin, billing, tech), a registrant profile
    login and a nameserver choice; the registrant must confirm an emailed verification.
    - **D1 Price:** the client's flat ladder stays the selling price; the server refuses a line
      whose `GET_PRICE` cost exceeds it. Every extension's cost is measured in the sandbox first.
    - **D2 Currency:** USD for everyone at launch. OpenSRS bills USD and `FX_RATE.CAD` is a
      placeholder 1, so charging CAD would sell at a loss. Canadians are charged USD.
    - **D3 Registrant:** collected on our checkout page BEFORE Stripe. Reverses the 9 Sep "out of
      scope" and the bltz copy, both of which this sheet said to revisit against the API.
    - **D4 Renew or transfer:** one label for the visitor; the server decides; a transfer line
      asks for the auth code.
    - **D5 Order handling:** `handle=save` at launch, so CDR approves each paid order in the
      OpenSRS panel; `process` once it has run cleanly for a few weeks.
    - **D6 `.ca`:** not at launch (decision 7).
    - **D7 Whois privacy:** off at launch, until its cost is known.
    - **D8 Nameservers:** CDR's defaults, set in the OpenSRS panel; without them a new domain has none.
    - **D9 Endpoints:** PHP only, on the `geo.php` pattern. Vercel staging cannot run them and
      shows checkout as unavailable; proof is local, through `cpanel/local-router.php`.
    - **D10 Profile login:** generated on the server, kept in the order, never shown to the buyer.
    - **D11 Whois:** the CSV snapshot is replaced by RDAP through `rdap.org`, cached, as its own
      step after Stripe.
    - **D12 Customer data:** order files above `public_html`, with a stated retention; the client
      is told his privacy policy should say so.

13. CLOSED 23 Sep 2026 (owner, the same evening): **payment, reseller fulfilment and registrant
    data are BACKEND work, outside this front-end agreement, and go back to the client as his
    decision.** "I should mention this to the client instead of trying to AI build everything from
    here." It restates the 18 Sep line (Stripe, the cart and the registrant data are "backend and
    secure work, the agreement is front-end only") that decision 12 had stepped past, and the
    provider's own warning ("best suited if you have sufficient resources, dev expertise, and
    time"). What makes it a business is not the checkout, it is owning it afterwards: real money,
    registrations that fail after payment, refunds, personal data on shared hosting, ICANN
    verification, support.
    - **What was built stays, as a head start, and ships to nobody.** Decision 12's test-mode
      checkout (`api/checkout.php`, `api/stripe-webhook.php`, the registrant form, both probes)
      is on `staging`, proved against a scratch config, never run against a Stripe key.
    - **The export leaves it out unless asked.** `export-cpanel.mjs` includes the payment scripts,
      their routes and the form only with `--payments`; the default cut carries no payment script
      and no route, and its checkout keeps the client's approved placeholder, word for word (the
      form's JavaScript sits in the bundle unreachable). Any zip for the client is cut without the
      flag.
    - **Decision 12's facts still stand** for whoever takes the backend on: the OpenSRS read, the
      twelve recommendations, and REFACTOR_QUEUE's CDR-PRICE-1, CDR-FULFIL-1 and CDR-LIVE-1.

11. **CLOSED 7 Sep 2026: the grid rebuild (SECT-3) is on staging (`a17402a`), measured as no change
    in any band's height.** The search route's results-plus-rail and the two corporate addresses
    on /tos compose Row and Column now, and all seventeen bands carry a library code. The per-band
    diff against a build of `53958b9` is within 2px on every band of six page shapes at 1440, 820
    and 390. Two nearest-rung deviations, the owner's to overrule: (a) the cart rail was a fixed
    20rem from the desktop breakpoint and is four tracks of twelve now, so it breathes with the
    container: 353px against the old 348 at 1440, and 280 against 337 at 1024, where the results
    column gains the difference. If it reads cramped at 1024 the fix is a desktop span of five.
    (b) The address pair went two-up from about 580px of viewport and pairs from the 768 tablet
    rung now. And one reading rather than a fix: the mother's spacing probe reports every
    PagePanel head as off-ladder (48.8px from lede to content at 1440), because that gap is a
    composite, the panel's xl gap plus the sm padding under the title's rule. That is the panel's
    design, not a defect, and the contact-band inversion the fleet pass of 6 Sep recorded no
    longer reproduces at either width.

## Backlog

<!-- Project-scoped work only. Anything that belongs to the DESIGN SYSTEM goes in the mother's
     REFACTOR_QUEUE instead, or it will be invisible to every other fork that has the same problem. -->

- **`RouteTabs.tsx` branches at `max-width: 639px`, a mid-range breakpoint the mother's rules
  forbid, and its comment calls it "under --mw-bp-tablet", which is 768 (recorded 22 Sep 2026).**
  The phone fix of 21 Sep is live on the client's host (`scripts/probe-phone.mjs`, PHONE OK,
  25 Sep 2026); the tab strip was measured on staging at 320, 360, 375, 390, 412 and 430 (one row
  at every width) but not between 640 and 767, so the breakpoint was not changed. The honest fix is the tablet
  token (767px) with the strip looked at between 640 and 767, or a `clamp()` on the tab padding
  with no breakpoint at all.

**What the client still has to supply**, carried from TRIAGE and unchanged: the price list and
which extensions (the table shows sample figures and says so in a footnote), the business name and
mark (the fork currently wears the studio icon, assets audit AS-6), currency, contact details, and
the legal wording. Everything lands in `src/data/site.ts`.

As of 31 Aug that file is built to take it without a component edit. The five outstanding items
are the five flags in `SUPPLIED`; the paste is replace the value, flip the flag. `EXTENSIONS` is
now the ONE list an extension exists in, with `tier` and `byTerm` on the row: `POPULAR_TLDS`,
`NEW_TLDS` and `PRICES` are all derived from it. Before this, the three lists were hand-kept
separately and nine extensions were offered on /search with no price row behind them, so
`priceFor` returned null and the add-to-cart button on them did nothing.

- Cart is local state; Stripe is named as the next release.
- `/r/CODE` answers 307, temporary until the record store exists.

## The whois data: what shipped, and what was stripped out of it

**CORRECTED 31 Aug 2026.** This section previously recorded a closed decision that the CSV was
"inventory the business owns and is selling", so `price_usd` was effectively required per row and
the search copy should read "buy this domain". That was answered before either of us had opened the
file, and the file disproved it. **An architecture confirmed against a DESCRIBED file is
provisional until the file arrives.**

What actually arrived is `whois-db-download-info-sample.csv`, a 1000-row vendor SAMPLE of a
commercial whois-database product. Measured, not assumed:

- every domain is a `.info`, and every registrant country is the United States
- **every single row's expiry date is already in the past**, the newest by 26 days, the oldest by
  ten years
- there is no price column and no availability column, so it cannot drive stock or a sale
- roughly **741 of the 1000 rows carry a named individual's personal email address, telephone
  number and street address**; only 86 sit behind a privacy proxy

**The RAW file is not in this repo and must not be.** The confirmed architecture compiles the data
into a module imported by CLIENT components, so every byte ships in the public JavaScript bundle
and is readable by anyone who opens the site. Applied to the file as supplied that publishes some
741 people's contact details on CDR's own website, on the same visit as CDR's Privacy Policy.

**WHAT SHIPPED: the file with 35 of its 43 columns removed.** The client asked to see the lookup
working before commissioning a real feed, which is fair, and the objection was never the domains.
`scripts/gen-domains.mjs` keeps eight fields (domain, registrar, whois server, created, updated and
expiry dates, status codes, nameservers) and drops every registrant and administrative contact
column. It works from an ALLOW LIST rather than a block list, because a block list silently passes
whatever a future export adds; it aborts if a kept field ever looks like an email address or a
phone number; and that guard is self-tested against known-bad values from the file itself. Output
audited independently: zero emails, zero hits on every real name, address and phone spot-checked.

The export is presented as a SNAPSHOT and never as a live lookup. `SNAPSHOT_AT` comes from the
source own audit column, `isExpired()` compares against that rather than the clock, and the page
says "searching a snapshot of 1,000 domain records, not a live registry" in its own words.

**The 243 KB table is a demonstration shape, not a permanent one.** When a live feed lands it moves
behind a route the way `/api/geo` already is.

**Alongside it:** eleven invented fixtures in `src/data/whois-fixtures.ts`, on that
file's real 43-column shape, which is the one thing it was genuinely good for. Every registrant,
registrar, address and nameserver is fictional. They cover what a happy-path demo hides:
near-expiry, expired, redemption, a privacy proxy, a triple transfer lock, an honest miss, and a
`.ca`. Dates are OFFSETS from a fixed epoch, never absolute, or a hardcoded 2027 expiry silently
becomes an expired-domain fixture in 2027. `isExpired()` in `lookup.ts` compares expiry against the
record's own `checkedAt` rather than the clock, and expired outranks registered in the badge.

**If a real data source is wanted**, the question to put to the client is whether CDR has a whois
or RDAP feed, or budget for one. Ask the upstream accredited registrar first: it is the one source
that can also answer AVAILABILITY, which is the commercially load-bearing half and the half no
whois product provides.

## Next up

<!-- The two or three things to do next, in order, with enough context to start without asking.
     Empty is a valid and useful answer. -->

1. **The owner raises the backend with the client (decision 13):** checkout, OpenSRS reselling and
   registrant data need a backend developer or a reseller platform, as a separate engagement.
   Nothing payment-related is built further until the client answers.
2. **One fresh export after the design-system sync to the mother's current tag, then one upload by the
   owner** (`cpanel/README.md`, "Upload"), cut without the payment scripts (decision 13). Then
   `node scripts/probe-phone.mjs https://www.corporatedomainregistry.com` must end PHONE OK.
3. The source handover and the Vercel retirement (the mother's DS-CPANEL-1).

**The client's feedback sheet of 9 Sep 2026, worked 18 Sep.** (A paragraph, not a subheading,
since 22 Sep 2026: the numbered items below are this section's next steps and the HQ reads them
off `/project-manifest.json`, grouped by any `###` above them.)

The sheet is `website feedback 9 sep 2026.pdf`, handed over 17 Sep. **Six items were build work and
all six are done on staging.** The rest were decisions or somebody else's job, recorded below so
nobody re-reads the sheet and thinks they were missed.

**TWO OF THE CLIENT'S COMPLAINTS WERE NOT WHAT THEY LOOKED LIKE, and that is the part worth
keeping.**

- **"The functionality of search domain isn't working... the sample csv isn't linked."** It is
  linked and it does work. Measured against staging: `20minutesfromhome.info` returns its
  registrar, dates and nameservers on both `/search` and `/whois`. What the client almost certainly
  did was type a domain they care about. The file is 1000 rows of somebody else's **expired 2016
  and 2017** registrations, from the vendor sample they supplied, so any real domain returns
  nothing. **Linking the CSV was never the fix and doing it again would change nothing.** The real
  item is a live whois or RDAP source, which is already item 3 below.
- **"The flag and currency isn't working."** The header carried a working region PICKER. The client
  was asking for the opposite: a flag that reports where you connect from as a trust signal, not a
  toggle, and no currency switcher at all. That was a removal, not a repair.

**Done (all on staging, none published):** the copyright range opens at 2011; the region chip is an
indicator rather than a control; the contact form takes their six fields including a Turnstile
captcha; the whois explainers sit beside the lookup from the desktop rung; the search page lost its
cart rail; and the hero and search page can carry a photograph.

**Two things to know about what shipped.**

- **The captcha is half a captcha.** A captcha is a widget AND a server that verifies its token.
   The widget is built; verification is backend and outside this agreement. It raises the cost of
   casual spam and stops nothing determined. With no key set it falls back to Cloudflare's
   published always-passes TEST key so the review site shows a real widget; **that key must be
   swapped for the client's own before launch** and the component labels itself in development so
   it cannot go unnoticed.
- **The photographs are not chosen.** The slots (`home-hero`, `search-backdrop`) are declared and
   both surfaces render nothing until a file is recorded, so the pages are unchanged in the
   meantime. Picking the image is art direction and the owner sees it before the client does.

**Out of scope, on the owner's word, 18 Sep 2026:** Stripe and the cart (connected later);
the registrant-details page and where that data is stored (backend and secure work, the agreement
is front-end only); hosting on GoDaddy (ignored for now, and it conflicts with the Vercel and
staging model, so it wants settling before anyone acts on it); the three mailboxes (client's side).

0. **OWED BY THE OWNER, PROMISED FOR THE NEXT SESSION (recorded 4 Sep 2026).** Both were deferred
   deliberately, not forgotten, and both gate the same build:
   - **Stripe keys.** The owner puts them in `.env.local` (gitignored) himself, then tells the
     session the VARIABLE NAMES only. (Not in the Vercel project: since decision 12 D9 the
     payment scripts are PHP on the client's host, and Vercel never runs them.) Never paste a secret key into a
     transcript. Start in TEST mode; live keys wait until fulfilment exists.
   - CLOSED 23 Sep 2026. **Which reseller/registrar account CDR is signing with: OpenSRS.** The
     provider's own message named its test environment and the OpenSRS Domains API, which is
     what the published agreement already says ("Tucows Domains Inc. through OpenSRS"), so that
     sentence stands.

   **The sequencing that matters:** checkout does not exist (there is no `/checkout` route; the
   "Continue to payment" button is deliberately disabled behind a notice). Payment and fulfilment
   are COUPLED — wiring Stripe without the reseller API means taking a real card payment for a
   domain the system cannot register. So the agreed plan is: build the whole checkout flow against
   TEST keys behind a flag, and only flip to live once the reseller connection exists. bltz's own
   checkout was captured this session for reference: a cart table (products / type / duration /
   price, live term select, promo-code toggle, total) then a single `/checkout/stripeform` page
   with an embedded Stripe form, email field, card or Alipay. No account required.

   **One thing NOT to copy from bltz:** it collects no registrant contact details before payment,
   just an email inside Stripe. For an ICANN-governed registration that is a real gap. The owner's
   call was "copy bltz", but revisit it against what the reseller API actually requires at
   provisioning before shipping it.

1. **Client review of the six legal documents on production**, and the four questions his own
   documents raise: the support phone and hours (six documents contain neither), the legal entity
   per corporate address, whether `.ca` is sold, and the 1-to-5 against 1-to-10 term range.
2. **The price list and extensions.** Search results and cart lines are on sample figures and say
   so; this is the last thing standing between the site and an honest checkout.
3. **A real whois or RDAP source**, if one is wanted. Ask the upstream registrar first, because it
   is the only source that also answers availability.
4. The slug rename to `corporate-domain-registry`, in a dedicated session, after
   `scripts/rename-fork.sh` is patched in the mother. Not urgent and invisible to the client.

## Traps this project has paid for

<!-- Things that cost real time here and would be repeated by a fresh session. Project-specific
     only: a trap that applies to every fork belongs in the mother's CONTEXT.md. -->

- This fork once carried `staging` and `fallback/pre-commit-1` branches. D1 deleted them on
  26 Aug and only `main` exists now; check before assuming.
- **A client-supplied data file may be a vendor sample carrying third-party PII.** Profile it
  before wiring it, and check what the delivery pipeline makes public: this repo's data modules are
  imported by client components, so anything in `src/data/**` is readable by every visitor. See the
  whois section above for the measured case.
- **The site said two things its own client's legal documents contradict**, and both survived a
  week because nobody had read the documents against the site. The whois page promised registrant
  contact details that ICANN's registration data policy redacts by default and that the record type
  never rendered, and it called CDR a registrar when four of the six documents say it is not one.
  **When client legal copy arrives, diff it against what the site already claims.**
- **`next.config.ts` 308s `/legal/:path*` to `/tos`, and a redirect runs before a route.** A
  `/legal/[doc]` route would be shadowed entirely and silently. The per-document legal pages are
  explicit top-level folders for that reason.
