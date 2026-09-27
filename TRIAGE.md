# Triage: what we build now, and what waits

**Project:** Domain services platform
**Brief:** Domain Registration, Transfer and Renewal Platform, version 1.0, 12 August 2026
**Prepared by:** MagentaWeb
**Date:** 19 August 2026, revised 23 August 2026 (draft 2: the bltz.com register)

---

## Draft 2, 23 August: what changed

You told us draft 1 missed the mark and pointed at bltz.com. Draft 2 is that site's shape: eight
pages on one shell, the search field front and centre, register / transfer / renew as three tabs on
one Search page, a pricing table by extension and term, a whois lookup, contact and terms, a cart
that shows what payment will do once Stripe is connected. The table below still describes what is
real and what is sample; the rows for the register flow, the transfer journey, checkout, the
reference code landing, help and the legal shells are folded into those eight pages or wait for the
server, and every old link redirects to its new home.

## Why this document exists

Your brief describes a complete product. It has a public website, a customer portal, an admin
portal, a registrar integration, a payment gateway, a relational database, a job queue and a
reconciliation process. That is the right description of the finished system, and nothing in it has
been dropped.

This first pass builds the part you can look at. A working front end, on screen, in a browser, that
shows what the product feels like to use.

The dividing line is simple. If a page can be shown honestly without a server behind it, we build it
now. If it cannot, we design its entry point so it slots in later without a rebuild, and we list it
here instead of half building it.

Every item from your brief appears below exactly once.

---

## How to read the three buckets

**Draft 1, building now.** Presentational, or fully demonstrable on sample data. You will see these
in the preview link.

**Draft 2, deferred.** Needs a server, a payment processor, real credentials, real registrar access
or an account system before it means anything. Building a shell of these now would show you
something that looks finished and is not.

**Needs a decision.** The brief either does not say, or says two things. These are short questions,
and none of them blocks the work in draft 1.

---

## Draft 1, building now

| From the brief | What you will see | Why it qualifies |
| --- | --- | --- |
| Home and domain search (2.1) | The search field, and all three result states: available, already registered, unable to verify | The interface is the product here. Sample data drives all three states, so you can see each one |
| Search and results page (3) | Result cards with the action that fits each state: register, transfer and manage, view details | Presentational |
| Domain lookup display (2.2) | The full record layout: domain, registrar, status, created, expires, nameservers, last checked | The layout is what needs review. The data behind it is deferred |
| Pricing page (2.3, 3) | Pricing table by extension and term, with registration, transfer, renewal, management, redemption and add-on columns | The structure is buildable now. See the pricing decision below |
| Register domain flow (3) | Every step on screen, ending on a confirmation screen | Interface only, using local state |
| Transfer domain flow (3, 5) | The eight stage transfer journey as the customer experiences it, including what we need from them and when | Presentational. The stages come straight from section 5 of your brief |
| Cart and checkout (3, 7) | Line items, totals, payment method choice including cheque, and a checkout that walks through its steps | Interface with local state only. No payment processor is connected |
| Reference code landing, /r/CODE (2.5) | A sample code resolves to a sample record, preloads the domain and continues into the flow | The journey is demonstrable. The record store is deferred |
| Help and FAQ (3) | Page structure, with transfer and account guidance sections | Structure now, wording once you confirm it |
| Contact (3) | Support form and contact details | Form interface. Submission is deferred |
| Legal and policies (3) | Page shells for terms, privacy, refunds and transfer disclosures | Structure now. The wording is yours to supply |
| Account entry points (8) | Sign in and account links in the header, and the account landing state | The header is built once. See the note below |
| Customer facing UX rules (14) | Last checked timestamps, clear separation of register against transfer against renew, and no screen that claims a completed action | These are presentation rules, and they apply from the first commit |
| Data model as types (9) | The entities from your brief expressed as typed records the front end reads from | Costs nothing now and means the database work later has a shape to match |

---

## Draft 2, deferred

| From the brief | Why it waits |
| --- | --- |
| Live domain lookup, RDAP or commercial provider (4A) | Needs a server side service and a provider key. A lookup that returns invented data is worse than no lookup |
| Registrar and reseller integration, OpenSRS or equivalent (4B) | Needs an account and sandbox credentials from you |
| Real availability checking (2.1, 16) | Same as above. The interface is built, the answer is not real yet |
| Transfer execution and status polling (5.5, 5.6, 12) | Needs the registrar connection before there is any status to track |
| Auth code and EPP handling (5.4) | This is a secret in transit. It is not something to prototype |
| Registration and renewal logic (6) | Needs the registrar connection to confirm anything |
| Card payment capture (7) | Needs a payment account. No test keys and no fake transactions in a preview |
| Payment webhooks and idempotency (7) | Server side by definition |
| Admin clearing of cheque payments (7) | Part of the admin portal |
| Customer account and portal (8) | Needs accounts, which need a server and stored identity |
| Login, password, MFA (8, 13) | Same. Entry points are designed now so the header does not get rebuilt |
| Orders, billing history, invoices (8) | Needs real orders to list |
| Relational database, migrations, indexes (9) | Draft 1 reads from typed sample records instead |
| Prospect and notice import, CSV or API (10) | Admin function against a database |
| Suppression and opt out flags (10) | Same |
| Admin portal, all ten areas (11) | An admin portal with nothing to administer is a demo of itself |
| Background jobs, expiry refresh, reminders, reconciliation (12) | Needs the database and the provider connections |
| Application API endpoints (13) | Draft 1 has no server to call |
| Security baseline, hashing, roles, rate limiting, secret storage (13) | Applies to the server, which does not exist yet. The front end holds no secrets by construction |
| Staging and production environments, backups, restore test (15.9) | Staging exists for this preview. The rest belongs with the backend |
| Automated tests for lookup, order states, webhooks, transfer mapping (15.11) | Tests for logic that has not been built |
| Acceptance criteria (16) | Every criterion depends on a live provider or a live payment path |

---

## Needs a decision

**1. Pricing figures.** The brief requires a pricing page but states no prices, no extensions and no
terms. We will not invent them. The page ships with its structure visible and every figure marked as
a sample. Send a price list and it becomes real in an hour.

**2. Which extensions you sell.** The pricing table needs a list. The brief does not contain one.

**3. The business name.** The brief never names the company. There is no name, no logo and no brand
in it. The preview carries a neutral placeholder until you tell us what it is.

**4. Currency and tax.** Section 7 requires taxes on orders. It does not say which country or which
rate. Checkout shows a tax line with a sample value until we know.

**5. Legal wording.** Your own brief, section 17, says legal copy is a project owner decision. Terms,
privacy, refunds and transfer disclosures ship as page shells with placeholder text.

**6. Accounts inside checkout.** Section 2.4 has the customer create an account or log in during
checkout, and section 8 describes the portal that account leads to. Accounts are deferred, so draft 1
runs checkout as a guest and marks the account step as arriving later. If you would rather checkout
require an account from day one, that moves accounts up the order and changes the shape of the first
build.

**7. Help and FAQ content.** The page needs questions and answers. The brief describes the topics,
not the wording.

---

## What is sample data, and how you will spot it

Every invented value in the preview is labelled in the interface, not just in the code. Sample prices,
sample lookup results, sample campaign records and sample order histories all carry a visible marker.

This is deliberate. A client who sees invented domain prices and believes them is worse off than a
client who sees a page that is honestly unfinished.

---

## What happens after this

Draft 1 gives you something to react to. Reactions to a real screen are worth more than reactions to a
document, and they arrive earlier, which is the point of building this way.

When the shape is agreed, the deferred list becomes the backend plan. It is already ordered roughly
the way it should be built: lookup first, because everything else depends on knowing a domain's state,
then the registrar connection, then payments, then accounts, then admin.
