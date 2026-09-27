# Session log

## Session 2026-08-19: fork created
Forked from magentaweb-starter at the design system baseline v5.2.0. Stripped the mother app layer
(docs, HQ, gate, sync tooling, internal docs); repointed / to /studio; mounted the synced kit pages
at /style-guide and /components; pinned package.json. Repo created private at magenta-web/domain-services and pushed. Scaffold builds on the inherited
design system; real client content is next.

## 19 Aug 2026: triage before code, and three commits of draft 1

Created from magentaweb-starter, deployed, registered in HQ with a staging URL that tracks a real
`staging` branch.

**The first task was not code.** The client's brief reads as a complete product with a registrar
integration, a payment gateway, a customer portal, an admin portal, a relational database and a job
queue. What he asked for on the phone was a front end he can look at.

So `TRIAGE.md` was written before any page: every page, feature and flow in his brief sorted into
build now, deferred, or needs a decision, with a reason on each and nothing silently dropped. 15
build now, 22 deferred, 7 need a decision. Written for him to read rather than as notes to
ourselves, because it goes back to him with the preview link.

The deferred list is ordered the way the backend should be built, lookup first, because everything
else depends on knowing a domain's state.

**Three decisions worth keeping, because each one had an easier wrong answer.**

Prices read "not set" rather than plausible figures. The brief states no prices, no extensions, no
currency and no tax rate. A table showing $14.99 gets screenshotted and quoted back; a table saying
"not set" with a plain sentence gets a real price list sent over, which is the thing the project
needs.

The search resolves anything outside three fixtures to "unable to verify" rather than guessing.
Inventing an availability answer for a domain someone actually types is the exact failure this build
exists to avoid, and the search box is where a client tests it first.

The EPP auth-code step is drawn and stores nothing. It is a secret in transit, the brief says keep
it out of logs and routine email, and a prototype has nowhere safe to put it. Collecting one into
local state to make the demo feel complete would reward the wrong instinct.

**The transfer ladder says whose clock is running.** Each of the eight stages states whether it is
waiting on the customer, on us, or on the registry. The brief specifies the states; it does not
specify telling the customer that, and it is the highest-value thing on the page: a customer who
knows the registry holds a multi-day window does not open a ticket on day two.

**Accounts are deferred and the sign-in entry point is in the header anyway**, so the nav is built
once and does not shift when accounts arrive.

**Verified at close:** tsc 0, build 21/21, 19 routes 200, 0 em dashes and 0 bare ampersands in
fork-owned paths, 0 unfilled placeholders in the build output, and contrast measured at zero
failures on production in both themes. That last one is not free: the fleet-wide token fix in mother
v5.4.0 through v5.4.2 landed first and this fork consumed it.

## 23 Aug 2026: draft 2, the rebuild to bltz.com

The client came back: draft 1 missed the mark, and the reference is bltz.com, just the front end
for now (Stripe, the registrar and real domains come next). bltz.com is six pages on one shell: a
brand row and a tab strip, a full-bleed hero with one field, a sentence, three action cards, a
pricing table by term, a whois lookup, contact, terms, a one-line footer. Draft 1 was the opposite
register: seventeen routes, a draft banner, mock markers, a four-column footer.

The owner allowed a wipe, and a wipe was less risk than surgery. `src/app/(site)/**` and
`src/data/**` were deleted (28 files) and re-authored: `src/data/site.ts` (the name, the tabs, the
services, the extensions, the sample prices, the fees, contact) and `src/data/lookup.ts` (the three
sample states, normalisation, validation); a fork-owned shell (`SiteHeader` with the cart widget,
`RouteTabs`, `SiteFooter`, `PagePanel`); `DomainSearchForm`; eight pages. The Tabs component lives
on Search: register, transfer and renew are one field with a different result action, so they are
tabs on one page rather than bltz's three near-identical routes, and the service and domain ride
the URL. The cart is a React context mirrored to localStorage; its payment button is disabled and
says Stripe is next. Every retired URL redirects.

Two things the browser caught that reading would not: the result card rendered inside all three
tab panels (Tabs keeps inactive panels in the DOM, so three live regions announced one result; now
only the active panel carries the form and the result), and the cart's term select ids carried
":" and "." from the item id (now selector-safe). One thing the screenshot caught: the hero's glow
layer escaped its band until the band had a positioned wrapper that reaches out by the section
padding.

Verified: tsc 0, build 13/13, routes 200 and redirects 308, the mother's type probe 0 on every
classifier with one h1 per page, contrast 0 in both themes, the search-to-cart flow driven end to
end. Merged to main in one commit and pushed. The kit mounts (/components, /style-guide) are
untouched.

**Addendum.** The owner's system is dark, which under data-theme="auto" showed the flipped
rendering (dark page, light hero). Pinned light on the root layout pending the client
conversation on theme and visuals; verified under a dark-preference browser before the push.

## 27 Aug 2026: pass 4, the inherited docs dark guard, D23 and D25, and the skeptic pass

Two commits. Nothing in the sync unit moved in either: the pathspec diff over
`src/components`, `src/app/tokens.css`, `src/app/lenis.css` and `src/types/css.d.ts` is empty
against HEAD~1 in both, and the mother's `check-fork-parity.mjs v5.14.0` reports this fork
165/165 identical.

**FK-2, the inherited docs dark guard, and it was LIVE here.** `src/app/layout.tsx` carried the
mother's pre-paint `DOCS_DARK_GUARD`, a script that force-sets `data-theme="dark"` when the path
is `/foundations`, `/components`, `/motion` or `/patterns`. This fork has no docs route group, but
it does serve `/components` from `(site)`, and it pins `data-theme="light"` as its root dial, so
`/components` was the one page on the whole public site rendering DARK for any visitor with no
stored override, under BOTH OS schemes. Deleted, the const and the `<script>`.

Measured on a dev server on :3125, `data-theme` read back by polling until it held still for eight
consecutive frames (React 19 reverts `<html>` attribute mutations, so a single read catches either
the pre-paint or the post-mount value). Eighteen rows, two OS schemes by three stored-override
states by `/`, `/components` and `/login`: every row agrees, `stored=none` gives `data-theme=light`
and `bodyBg rgb(247, 248, 249)` in both OS schemes, `stored=dark` gives `rgb(9, 11, 13)`, 0
pageerrors, and the storage-seeding self-test passed on every run.

The before state was re-measured rather than remembered: the deleted script was injected back into
the served HTML at the position it used to occupy, through a request interception, so the repo was
never mutated to prove it. With the guard restored, `/components` reads `data-theme=dark`,
`bodyBg rgb(9, 11, 13)` at os=light AND os=dark while `/` and `/login` stay light. With it gone,
all three agree. The injection carries its own self-test (documents rewritten = 8).

The mechanism is worse than a repaint, which is why it survived hydration. `ThemeProvider` captures
the dial with `const [inheritedDial] = useState(readDial)` at FIRST client render
(`src/components/theme/ThemeProvider.tsx:101`), which is after the pre-paint guard has already
written the attribute, and its effect then re-asserts `data-theme` to that captured value. The
guard therefore poisoned the provider's own idea of this site's dial, not just the first frame.

**D23, the narrow-form frame.** `src/app/(site)/login/LoginForm.tsx` carried a bare `28rem`
`maxWidth`; it now reads `var(--container-width-xs)`, the token v5.12.0 minted for this shape. A
rename, not a resize, and measured both ways: `[data-ds-login-form]` renders 486.969px against a
computed max-width of 486.976px at a 1440 viewport with a 17.392px root (28 x 17.392 = 486.976),
and 291.875px against a 448.756px cap at 390 with a 16.027px root. Identical before and after. The
width probe carries a known-absent sentinel that reports MISSING in the same run, so a reported
number is a measurement and not a stale read.

**D25, the hero search frame, deliberately NOT tokenised.** `heroFormWrapStyle` in
`src/app/(site)/page.tsx` keeps its `46rem` literal per the owner call, and now carries a comment
saying it is a display frame tuned to the search control it wraps rather than a rung on the
`--container-width-*` band ladder. Comment only: measured 800.031px rendered against an 800.032px
cap at 1440 (46 x 17.392 = 800.032), and 357.969px against 737.242px at 390.

A census so D23 is not a partial: the only literal width caps left in fork-owned code are the
sanctioned 46rem hero and the `24ch` headline cap on the home h1, which belongs to the separate,
still-open headline-cap decision. Every other cap in the fork reads a token.

**The share card now reads the brand from the fork's single source (skeptic pass).**
`src/app/opengraph-image.tsx` carried `"Domain services"` as a literal TWICE, once as
`export const alt` and once as the wordmark drawn at 72px, while `src/data/site.ts` is this fork's
declared single source for the name and TRIAGE decision 3 keeps that name neutral only until the
client names the company. Both now read `SITE.name`. Zero rendered change today and measured as
such: `/opengraph-image` is 200 `image/png` at 26323 bytes and the home page serves
`og:image:alt="Domain services"` BOTH before and after, and the two PNGs compare byte-identical.
The point is the day `SITE.name` changes and the card is not left announcing the old one.

The fleet shape for `alt` is `"<brand>: <what the site is>"`, and this card carries the bare brand
with no descriptor. That half was left alone on purpose: the root metadata title already makes the
claim (`${SITE.name}: domain registration, transfer and renewal`), and extending a client-facing
share card is a copy call for the owner. Handed up rather than invented.

Gates: `npx tsc --noEmit` printed no diagnostics (read from the empty output, not the exit code);
`/`, `/components` and `/login` all 200 on :3125; parity 165/165 at v5.14.0. Not pushed: the main
session pushes.

## 27 Aug 2026 · Fleet sweep: FK-4 (the stale ledger) and FK-11 (the data-mw- namespace)

Run after every per-fork batch had committed. No sync-unit file touched; the mother's
`node scripts/check-fork-parity.mjs v5.14.0` reports this fork 165/165 identical after it.

**FK-4.** The current-state paragraph read "at parity (v5.9.0, see `package.json` -> `magentaweb`"
while the pin reads 5.14.0: five releases stale. The pin claim is now its own paragraph, naming the
pin of record, the count (165/165 at v5.14.0), and the reason the line drifted: nothing checks it.
The 400-character single line it was buried in is wrapped.

**FK-11.** Nothing to rename and nothing to report. This fork mints no `data-mw-*` name and selects
on none from fork-owned CSS. Its own hooks are `data-ds-*`. Clean on both shapes.

## 31 Aug 2026: synced to v6.3.1

Sync unit copied from the mother's blob at v6.3.1 and verified byte-identical; pin bumped to 6.3.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## Session 2026-08-31: the client is named, and his documents ship

Six pieces of work, in the order they happened.

**The data layer was hardened before any of it.** `src/data/site.ts` was rebuilt around
`EXTENSIONS` as the single list an extension exists in, with `POPULAR_TLDS`, `NEW_TLDS` and
`PRICES` derived from it. That change found a live bug: the three lists had been hand-kept
separately, so the nine new-gTLD extensions were offered on /search with no price row behind them.
`priceFor` returned null for all nine and their add-to-cart button silently did nothing. /pricing
went from 5 rows to 14 before the page was removed. `SUPPLIED`, five booleans naming what the
client still owes, dates from this commit and is what the site reads to decide whether to caveat
itself.

**The header and the pricing page, on the owner's instruction.** The wordmark reads "Domain
registry" through a new display-only `SITE.wordmark`; the repo, the remote and `SITE.name` did not
move. /pricing was deleted and 307s to /search, TEMPORARY on purpose because the removal is a
consequence of a missing price list rather than a decision about the route. The nav became four
tabs, which turned out to match the reference site exactly.

**Terms of service became an accordion**, first with studio placeholder text in `src/data/terms.ts`
and later with the client's real documents, which retired that file entirely.

**A research pass over bltz.com** (17 agents, five recon lenses, three proposals each
triple-verified) produced the region and cart work. Its most useful output was negative: bltz
labels its homepage cart chip CAD and shows byte-identical USD figures on its cart one click later,
and it ships only CA.png and US.png so a German visitor sees a US flag captioned DE. Both were
copied deliberately NOT.

**Then the client sent seven files** and the session changed shape. Six legal documents named the
business, Corporate Domain Registry, closing an open decision that had blocked the slug rename
since 22 Aug. The seventh was a 1000-row CSV meant to populate whois, and it was a vendor sample of
a commercial whois database carrying roughly 741 named individuals' personal email addresses,
telephone numbers and street addresses, with every row already expired. It is not in this repo. The
whois page runs on eleven invented fixtures built on that file's real 43-column shape, which is the
one thing it was genuinely good for. HANDOFF carries the full trap.

**The documents were transcribed by twelve agents**, one writing each and a second auditing it
word-for-word against the source, and then verified independently here by round-tripping every
module back to flat text and diffing it: zero missing lines across all six. /tos is now the
client's own shape, six accordion panels plus the corporate address block, with a per-document
route behind each panel so an incorporated instrument stays citable.

**Reading his documents against the site found two false claims** that had been live for a week:
the whois page promised registrant contact details that ICANN's registration data policy redacts
by default and that the record type never rendered, and it called CDR a registrar when four of the
six documents say it is not one.

**And the owner spotted a mother bug by eye:** a search button sitting shorter than the field beside
it. Measured at 67.28px against 61.09px with font size, padding, border and box-sizing all
identical, so the entire gap was leading. Input and Select pinned none and inherited the body's
prose leading while Button pins `--leading-tight`. Fixed in the mother, sealed as v6.3.1, fanned
out to all fourteen forks. Full write-up in the mother's log, including the two `fanout.mjs` bugs
that first reported the whole fleet as failing when nothing had.

**Late in the session the CSV question reopened**, and the answer changed. The client wants to see
the lookup working before commissioning a real feed, which is fair, and the objection had never
been the domains: it was columns 14 to 43. `scripts/gen-domains.mjs` now keeps eight fields and
drops all 35 contact columns, so 1000 real domains are searchable and nobody's personal data is
published. The generator works from an allow list rather than a block list, aborts if a kept field
looks like an email or a phone number, and self-tests that guard against known-bad values from the
file before its clean run is believed. The output was audited independently of the script. The
export is presented as a snapshot with its own checked-at date, never as a live lookup.

The lesson worth keeping is the shape of the mistake that nearly happened: the safe-sounding answer
was "do not use the file", and it was not the right one. The right one was to work out precisely
which part was unsafe and remove exactly that.

2026-09-01: doc truth-pass from the fleet audit corrected src/app/brand.css and PROJECT.md; stale claims aligned with code.

## 02 Sep 2026: synced to v6.4.0

Sync unit copied from the mother's blob at v6.4.0 and verified byte-identical; pin bumped to 6.4.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.4.1

Sync unit copied from the mother's blob at v6.4.1 and verified byte-identical; pin bumped to 6.4.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.0

Sync unit copied from the mother's blob at v6.5.0 and verified byte-identical; pin bumped to 6.5.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.1

Sync unit copied from the mother's blob at v6.5.1 and verified byte-identical; pin bumped to 6.5.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.2

Sync unit copied from the mother's blob at v6.5.2 and verified byte-identical; pin bumped to 6.5.2; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.3

Sync unit copied from the mother's blob at v6.5.3 and verified byte-identical; pin bumped to 6.5.3; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.4

Sync unit copied from the mother's blob at v6.5.4 and verified byte-identical; pin bumped to 6.5.4; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.5

Sync unit copied from the mother's blob at v6.5.5 and verified byte-identical; pin bumped to 6.5.5; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 02 Sep 2026: synced to v6.5.6

Sync unit copied from the mother's blob at v6.5.6 and verified byte-identical; pin bumped to 6.5.6; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 04 Sep 2026: synced to v6.6.0

Sync unit copied from the mother's blob at v6.6.0 and verified byte-identical; pin bumped to 6.6.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 05 Sep 2026: synced to v6.7.0

Sync unit copied from the mother's blob at v6.7.0 and verified byte-identical; pin bumped to 6.7.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 05 Sep 2026: synced to v6.7.1

Sync unit copied from the mother's blob at v6.7.1 and verified byte-identical; pin bumped to 6.7.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 05 Sep 2026: synced to v6.8.0

Sync unit copied from the mother's blob at v6.8.0 and verified byte-identical; pin bumped to 6.8.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 06 Sep 2026: synced to v6.8.1

Sync unit copied from the mother's blob at v6.8.1 and verified byte-identical; pin bumped to 6.8.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 06 Sep 2026: synced to v6.9.0

Sync unit copied from the mother's blob at v6.9.0 and verified byte-identical; pin bumped to 6.9.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 06 Sep 2026: synced to v6.10.0

Sync unit copied from the mother's blob at v6.10.0 and verified byte-identical; pin bumped to 6.10.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 06 Sep 2026: synced to v6.11.0

Sync unit copied from the mother's blob at v6.11.0 and verified byte-identical; pin bumped to 6.11.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 06 Sep 2026: synced to v6.11.1

Sync unit copied from the mother's blob at v6.11.1 and verified byte-identical; pin bumped to 6.11.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 07 Sep 2026: SECT-3, the grid rebuild

The search route's hand-rolled results-plus-rail grid and the /tos address grid onto Row and
Column, seventeen of seventeen bands stamped (`a17402a`). The per-band diff against a worktree
build of `53958b9` is within 2px on every band of six page shapes at 1440, 820 and 390; the rail
width moves with the container now (decision 11 has the numbers). The spacing probe's off-ladder
reading on every PagePanel head is the panel's composite gap, read and left.

## 07 Sep 2026: synced to v6.12.0

Sync unit copied from the mother's blob at v6.12.0 and verified byte-identical; pin bumped to 6.12.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 08 Sep 2026: synced to v6.12.1

Sync unit copied from the mother's blob at v6.12.1 and verified byte-identical; pin bumped to 6.12.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 08 Sep 2026: synced to v6.12.2

Sync unit copied from the mother's blob at v6.12.2 and verified byte-identical; pin bumped to 6.12.2; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 08 Sep 2026: synced to v6.13.0

Sync unit copied from the mother's blob at v6.13.0 and verified byte-identical; pin bumped to 6.13.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 08 Sep 2026: synced to v6.13.1

Sync unit copied from the mother's blob at v6.13.1 and verified byte-identical; pin bumped to 6.13.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 08 Sep 2026: synced to v6.14.0

Sync unit copied from the mother's blob at v6.14.0 and verified byte-identical; pin bumped to 6.14.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.15.0

Sync unit copied from the mother's blob at v6.15.0 and verified byte-identical; pin bumped to 6.15.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.16.0

Sync unit copied from the mother's blob at v6.16.0 and verified byte-identical; pin bumped to 6.16.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.17.0

Sync unit copied from the mother's blob at v6.17.0 and verified byte-identical; pin bumped to 6.17.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.18.0

Sync unit copied from the mother's blob at v6.18.0 and verified byte-identical; pin bumped to 6.18.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.18.1

Sync unit copied from the mother's blob at v6.18.1 and verified byte-identical; pin bumped to 6.18.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 10 Sep 2026: synced to v6.19.0

Sync unit copied from the mother's blob at v6.19.0 and verified byte-identical; pin bumped to 6.19.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 11 Sep 2026: synced to v6.20.0

Sync unit copied from the mother's blob at v6.20.0 and verified byte-identical; pin bumped to 6.20.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 14 Sep 2026: synced to v6.21.0

Sync unit copied from the mother's blob at v6.21.0 and verified byte-identical; pin bumped to 6.21.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 14 Sep 2026: synced to v6.22.0

Sync unit copied from the mother's blob at v6.22.0 and verified byte-identical; pin bumped to 6.22.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 14 Sep 2026: synced to v6.22.1

Sync unit copied from the mother's blob at v6.22.1 and verified byte-identical; pin bumped to 6.22.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 14 Sep 2026: synced to v6.23.0

Sync unit copied from the mother's blob at v6.23.0 and verified byte-identical; pin bumped to 6.23.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 15 Sep 2026: synced to v6.23.1

Sync unit copied from the mother's blob at v6.23.1 and verified byte-identical; pin bumped to 6.23.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 15 Sep 2026: synced to v6.24.0

Sync unit copied from the mother's blob at v6.24.0 and verified byte-identical; pin bumped to 6.24.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 16 Sep 2026: synced to v6.24.1

Sync unit copied from the mother's blob at v6.24.1 and verified byte-identical; pin bumped to 6.24.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 16 Sep 2026: synced to v6.24.2

Sync unit copied from the mother's blob at v6.24.2 and verified byte-identical; pin bumped to 6.24.2; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 17 Sep 2026: synced to v6.25.0

Sync unit copied from the mother's blob at v6.25.0 and verified byte-identical; pin bumped to 6.25.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 18 Sep 2026: the brand, and the client's feedback sheet

**The brand arrived as a raster and was reconstructed.** The client sent `logo.png` at 141x51 and a
`favicon.ico`, no vector. Intake is vector or it is not intake, so the first recommendation stands:
a logo that arrives as a 141px PNG almost always has an AI or EPS behind it, and one email beats a
redraw. Failing that, the suite is generated by `scripts/brand/domain-services.mjs` in the mother.

The two halves were recovered by different means because one method is wrong for each. The leaf is
traced sub-pixel, reading the anti-aliasing as edge position rather than thresholding it away: 0 of
768 inked pixels disagree with their file. The words are not traced at all, because at a 17px cap
height the letterforms carry more information than the raster holds; they are re-set in Segoe UI
Bold, which won a measured fit against eight other faces on two independent signals and was
confirmed by overlay. Nine slots publish through `brand.json`, all live on the HQ Brand tab. Status
is `standin`: a studio reconstruction cannot ratify itself.

Four wrong answers on the way, each caught by looking at a render rather than by a checker: an
ad-hoc marching-squares winding that produced 12 splinters instead of a leaf; a verification that
compared a cropped SVG against a full canvas and reported 85%; a second that graded a supersampled
trace against its own interpolation; and a lockup composed from derived ratios that put the leaf
three units high while the trace reported 0.00% error, because the shape was perfect and the
placement was not. **The owner then caught a fifth that none of those would have: the g and y
descenders were clipped**, because the viewBox was sized from the source's ink box while the re-set
type is fractionally taller. The bounds come from the placed glyph outlines now.

**The feedback sheet of 9 Sep, worked.** Six build items, all on staging, none published; the
disposition including the out-of-scope half is in PROJECT.md. The finding worth carrying: two of
the client's complaints were misreadings. The search is not broken, it answers correctly for the
1000 expired rows in the sample they supplied and returns nothing for the real domain they will
have typed; and the flag was a working picker when they were asking for it to stop being one.
Fixing either as written would have been wasted work, and only measuring against staging showed it.

## 18 September 2026, late: the purchase flow, and what the registry was never needed for

The client walked the owner through the reference site's whole checkout, screen by screen, and
asked for it copied. It is copied: type a domain, get one priced offer, add it, watch the rail,
view the cart, check out into a stubbed Stripe box.

**The insight that unblocked it is that the reference never asks a registry anything.** It quotes
nike.com because it offers to renew or transfer WHATEVER you type, at a price that does not depend
on the domain. It will quote a typo; the client's own screenshot has `nke.com` in the cart at $375.
Earlier in the week this session's own advice to the owner was that real domains could not be
searched until a live feed landed. That was wrong, and it was wrong in the expensive direction: it
made a blocker out of something that was only ever a source of extra information.

So the per-extension price table went, replaced by `LADDER`, ten flat numbers copied from the
reference on the client's instruction. **That table was not merely unfinished, it was the bug.** An
extension absent from it had no price, so the site could look `maplegrove.ca` up, print a real
registration record, and then refuse to sell anything. That is the mechanical form of "the search
isn't working", and it had been read here as a data gap rather than a design fault.

The availability lookup goes back to being information. The "Unable to verify" badge is gone: it
sat beside a button that now works in all three states, so it read as a refusal next to an offer,
and it is the copy the client read as the search being broken.

Two reversals, both taken deliberately rather than drifted into. The cart rail is back on `/search`
nine days after the client asked for it removed, because the newer instruction is more specific and
about the same page; the earlier objection survives in the 2:1 proportions. And `/checkout` was a
permanent 308 to `/cart` and is now a page, with the reasoning for the redirect kept in the file
rather than deleted, because it is still true: payment and fulfilment are coupled. What changed is
that the page does not pretend.

Twenty-eight assertions in a real browser, all passing, driving the flow the way the client will.
Three of them failed first on the probe's own phrasing rather than the product, which is worth
recording because it nearly read as three defects: two were textContent with no whitespace node
between stacked spans, and one was Button's hoisted duplicate label reading "Pay $375.00 USDPay
$375.00 USD".

**Two things measured rather than assumed, and both were wrong before measuring.** The first cut of
the added-to-cart confirmation was a disabled secondary Button, to avoid inventing a green. It
computes to a dark fill at `opacity: 0.5`, i.e. mid grey, so it read as "you cannot add this",
which is the opposite of what had happened. It is a solid success Badge now, white on #186E36 at
5.94:1. And the Stripe placeholder's dashed border was invisible at `--border-positive-primary`,
which is ink at 8% alpha: right for a hairline between two surfaces, far too quiet to carry a dash
pattern. The dash is the message there, so it takes a real ink at the strong weight.

The owner also caught, by eye, that the corporate address block on `/tos` was cramped. Both gaps
were **zero**, and neither was a token set too small: they were never set at all, because Heading
carries `margin: 0` by house rule and both containers were plain blocks. This is the second time
this week a spacing complaint turned out to be an absent rung rather than a wrong one, and both
times the wrong repair would have been a margin on the heading.

Still open and not guessed at: the owner asked for the contact form removed and the page rebuilt
like the reference's, and there is no screenshot of that page anywhere in the folder. The client's
own 9 Sep sheet specified six named fields, so building over it blind would delete something they
asked for in writing. Waiting on a capture.

### The contact page, same evening

The owner supplied the capture that was missing, and the reference's contact page turns out to be
three labelled rows and nothing else: Address, Phone, E-mail. No form, no captcha, no subject
dropdown. So the form is deleted, along with its Turnstile widget and the CONTACT_SUBJECTS list
that had no other reader. Deleted rather than left unrendered, because an orphan form is exactly
the sort of thing that gets re-imported by accident with nothing to detect it; git has them
at 11caded.

This reverses a written client request, and the record should be plain about that: the 9 Sep
feedback sheet asked for six named fields in the client's own words and order, and they got built.
The owner asked twice for the reference's page instead and then supplied the screenshot. Later,
specific and sighted beats earlier, so it wins, but the client has not been told and should be.

The reference prints a phone number and a support-hours line. CDR has supplied neither in any of
the six legal documents, so that row does not render at all rather than rendering empty. That rule
is older than this page and it already cost three studio inventions on 31 Aug.

One trap worth the entry, and it is one the mother already records about Button: the stacked
layout's row gap did nothing at all, because `margin: 0` sat in the dd's INLINE style and an inline
declaration beats every rule in a hoisted sheet. It looked like the media query was not matching.
The dd's margin lives in the sheet now, where the breakpoint can reach it.

Also worth knowing for the next probe: a screenshot taken straight after `networkidle` on this site
catches the page mid-reveal, and the first two captures of this page came back as an empty panel
with a floating MW mark. Nothing was broken; the HTML was correct in curl the whole time. The probe
waits out the transition now.

## 20 Sep 2026: the site can ship to the client's cPanel

The client wants the code on his own GoDaddy hosting and Vercel gone. A static export was measured
to fail first (`/api/geo`, then llms.txt, robots.txt and the share card), then made to work with
behaviour-neutral changes: the five lookup pages read `?domain=` in the browser
(`DomainFromUrl.tsx`), the generated files are built once, the redirect list moved to
`redirects.json`, the beacon is off in the export. `cpanel/api/geo.php` answers `/api/geo` with
the same five fields from DB-IP Lite through MaxMind's pure-PHP reader, mapping province and state
names back to the codes the approved panel shows. `scripts/export-cpanel.mjs` builds the folder
and refuses it if a Vercel address survives; `scripts/probe-cpanel-parity.mjs` found 32 of 32
pages pixel-identical to staging and passed the Canadian, US and German visitor flows. Two probe
traps recorded in the README: the panel opens on hover, and the address bar updates a beat after
the result on both hosts. Commit `e21b06e`, staging only. Waiting on the client's domain.

## 21 Sep 2026: synced to v6.26.0

Sync unit copied from the mother's blob at v6.26.0 and verified byte-identical; pin bumped to 6.26.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 22 Sep 2026: synced to v6.27.0

Sync unit copied from the mother's blob at v6.27.0 and verified byte-identical; pin bumped to 6.27.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 22 Sep 2026: synced to v6.28.0

Sync unit copied from the mother's blob at v6.28.0 and verified byte-identical; pin bumped to 6.28.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 21 Sep 2026: live on the client's cPanel, and the two phone bugs

`www.corporatedomainregistry.com` answers from his GoDaddy hosting: the README's curls passed on
the real host (home 200, bare domain 301 to www, `/api/geo/` JSON, `/lookup` 308, the mmdb
forbidden, the share card a PNG). The two phone bugs the owner reported were both real, measured
on the live host at 390 wide: the Terms of service tab ran off the strip (322 to 499 in a 358
strip) and the location panel hung 130px off the left edge. Fixed: the tabs share the strip by
their label widths (`RouteTabs.tsx`), the panel measures itself, clamps to the viewport and opens
on a tap as well as a hover (`RegionChip`), and the export copies the dotted prefetch files Apache
had been 404ing a dozen times a page. Proved against staging with `probe-cpanel-parity.mjs`
(PARITY OK), the zip re-cut to the Desktop; his upload is owed, then the phone check on the live
domain. One deviation recorded rather than hidden: the tab fix branches at `max-width: 639px`, a
mid-range breakpoint the mother's rules forbid, and its comment calls it "under --mw-bp-tablet",
which is 768. Backlogged in PROJECT.md; not changed at the wrap because it is on the client's
host and the fix was measured at 390 and 320 only.

## 22 Sep 2026: the phone fixes are on staging and in the zip, not on the client's host

Asked whether the two phone bugs were fixed and to publish. Derived rather than recalled:
`staging` and `main` are one commit (nothing to publish on Vercel, and Vercel production is the
holding page by design); the live host serves the same CSS bundle as the Desktop zip, which read
as "uploaded" for ten minutes and was wrong, because the fixes live in JS and the CSS never
changed. A real browser at 390 settled it: the live host fails both checks with the exact pre-fix
numbers (Terms of service 322..499 in a 358 strip; a tap toggles the panel shut) and staging
passes all of them. The zip cut at 16:44 on the 21st carries the fix (chunk `0b~b4nch9-ajz.js`)
and was never uploaded. The probe is `scripts/probe-phone.mjs` now, with a sentinel that
re-injects the old tab rule and expects an overflow; it earned its place by failing on the live
host first. The 21 Sep entry above and PROJECT.md's backlog line both said the fix was live on the
client's host: the backlog line is corrected, this entry corrects the log. Owed by the owner: the
upload (README "Upload"), then the probe against the live domain.

## 23 Sep 2026: synced to v6.29.0

Sync unit copied from the mother's blob at v6.29.0 and verified byte-identical; pin bumped to 6.29.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 23 Sep 2026: synced to v6.29.1

Sync unit copied from the mother's blob at v6.29.1 and verified byte-identical; pin bumped to 6.29.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 23 Sep 2026: synced to v6.29.2

Sync unit copied from the mother's blob at v6.29.2 and verified byte-identical; pin bumped to 6.29.2; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 25 Sep 2026: the phone fixes go live, the location panel stops overflowing

The owner got cPanel access on 24 Sep and uploaded the 21 Sep zip himself. Derived rather than
recalled: `probe-phone.mjs` against the live host went from four failures to PHONE OK, and the tab
strip fits on one row at 320 to 430 on staging (measured; the live host runs the same build).

Looking at the open panel on the live host found a different bug: the Site row
(`www.corporatedomainregistry.com`) ran 40px past the panel's right edge at 1440. The panel was a
fixed 19rem, sized when the host was the shorter bare domain, and `overflow-wrap: break-word` does
not shrink a grid cell's minimum width, so one unbroken value kept its full width. The phone probe
had passed it: it only runs at 390, where the text just fit, and its "no value clipped" check
compared against the wrong box. Fixed in `ff34143` (`RegionChip.tsx`, fork-owned, not in the sync
unit): the Site row removed at the owner's word, the panel `max-content` capped at 22rem or the
screen less both gutters, values `overflow-wrap: anywhere`, the value column `minmax(0, 1fr)`.
Measured at 320, 390 and 1440 with a short and a 39 character IPv6 answer, on the dev server, the
export and the live host. My first pass at the export used a route pattern that missed
`/api/geo/` (the export asks with the slash), so the IPv6 cases ran on real data and passed for
nothing; the identical widths gave it away and the rerun with the pattern fixed matched the dev
server.

The export was re-cut from the tree before the desktop's seven checkout commits landed, so the v2
zip carries no payment scripts. Portable PHP 8.4.26 was fetched into the scratchpad (sha256
checked) to run the parity probe: PARITY OK, all 18 pages pixel-identical at 1440 and 390.

Wrap with the mother session: the fork is at v6.29.2 against v6.37.0 because every fanout since
v6.30.0 skipped this clone dirty on that one RegionChip edit (the ledgers had called it another
session's; it was this clone's). Committed, rebased onto the desktop's seven commits (no file in
common) and pushed. The mother syncs this fork alone next, then cuts one export for the single
upload. Nothing here is fanned out, exported or stashed at the wrap.

## 25 Sep 2026: synced to v6.37.0

Sync unit copied from the mother's blob at v6.37.0 and verified byte-identical; pin bumped to 6.37.0; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.

## 25 Sep 2026, later: synced to v6.37.0 by the mother session, the v3 export cut and proven

The one-fork fanout (`cd2fb55`) once the tree was clean and pushed; parity 178/178 identical;
staging deployed READY. Export cut without `--payments` to the Desktop, served through the
portable PHP and the fork's router, and proven three ways: `probe-cpanel-parity.mjs` PARITY OK
(every page 0px different against the synced staging at 1440 and 390, the CA, US and DE flows
passing), `probe-phone.mjs` PHONE OK, and `probe-panel.mjs` PANEL OK, the closing session's
1440 and IPv6 panel check folded into `scripts/` before its scratch folder vanished. Home,
register, cart and checkout looked at at both widths. Zip: corporate-domain-registry-site-v3.zip,
60.5 MB, 300 entries, no backslash. The live probes run again after the owner's upload.

## 25 Sep 2026: synced to v6.37.1

Sync unit copied from the mother's blob at v6.37.1 and verified byte-identical; pin bumped to 6.37.1; tsc clean. Written by `scripts/fanout.mjs`, so it records the sync and nothing else: anything worth saying about THIS fork is written by hand.
