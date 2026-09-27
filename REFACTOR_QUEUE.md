# Refactor queue: domain-services

Deferred work that belongs to THIS project only. Anything that belongs to the design system or the
fleet goes in the mother's `REFACTOR_QUEUE.md` instead (and during FREEZE-1, a component change goes
under FREEZE-1 there). Every commit that surfaces a future item adds it here in the same commit.
Entries are closed, not deleted.

### CDR-PRICE-1: measure what every extension costs against the ladder (23 Sep 2026)

**Priority** P1 · **Status** PARKED: out of scope, the client's decision to commission (PROJECT.md decision 13). Was blocked on the OpenSRS sandbox key.
**Scope** PROJECT.md decision 12 D1. Run `GET_PRICE` with `all_periods=1` for every row of
`EXTENSIONS`, for `new`, `renewal` and `transfer`, and set each cost beside the flat ladder. The
ladder's ten-year price is $43 a year; a new gTLD whose wholesale cost is higher sells at a loss.
The owner decides per extension: drop it, or ask the client to price it separately.
**Why deferred** Needs the sandbox key.
**Linked** CDR-FULFIL-1.

### CDR-FULFIL-1: register, renew or transfer through OpenSRS once Stripe says paid (23 Sep 2026)

**Priority** P1 · **Status** PARKED: out of scope, the client's decision to commission (PROJECT.md decision 13).
**Scope** PROJECT.md decision 12. From the paid order the webhook records: before charging,
`LOOKUP` re-checks availability and `GET_PRICE` enforces the D1 cost guard; after payment,
`SW_REGISTER` (`reg_type` new or transfer, `handle=save` per D5) or `RENEW` (which needs the
domain to be in CDR's account and its current expiry year, so D4's renew-or-transfer choice is
made on the server). The contact set is the one registrant, copied to admin and billing, with
`custom_tech_contact=0`; `custom_nameservers=0` (D8); a generated `reg_username`/`reg_password`
(D10); the phone converted to OpenSRS's `+CC.NNNN` form, which needs a calling-code table because
the checkout stores E.164. A response of 250 (asynchronous registry) or a failure is emailed to
CDR, and a failed order is refunded through Stripe. OpenSRS webhooks (signed, set up in the
control panel in a fixed order) can replace polling later. The buyer is told to expect the
registrant verification email.
**Why deferred** The owner's order: Stripe first, test mode only, and live keys wait for this.
**Linked** CDR-PRICE-1, CDR-LIVE-1.

### CDR-LIVE-1: what going live needs, in order (23 Sep 2026)

**Priority** P2 · **Status** PARKED with CDR-FULFIL-1 (PROJECT.md decision 13).
**Scope** Stripe live keys and a live webhook endpoint in the client's config file; the OpenSRS
live key, and the cPanel server's outbound IP added to the OpenSRS IP access rules (on shared
hosting that IP is shared with other accounts on the same server); default nameservers set in
the OpenSRS panel (D8); funds deposited (USD only; 3% on card, none on ACH); a test purchase of a
cheap domain end to end; then `handle` moves from `save` to `process` after a few clean weeks (D5).
**Why deferred** Payment and fulfilment are coupled: no live charge before registration exists.
**Linked** CDR-FULFIL-1.

### CDR-RDAP-1: the whois page reads RDAP instead of the CSV snapshot (23 Sep 2026)

**Priority** P2 · **Status** the owner's call whether it is in scope: a read-only lookup, no money and no personal data, so decision 13 does not decide it.
**Scope** PROJECT.md decision 12 D11. A PHP script under `api/` asks `https://rdap.org/domain/<name>`
(it 302s to the registry's own RDAP server; gTLDs and `.ca` both answer), follows the redirect,
normalises the JSON to the fields the page already renders and caches each answer on disk.
rdap.org is one volunteer's service capped at 10 requests per 10 seconds with no SLA, so the
fallback is IANA's bootstrap file (`data.iana.org/rdap/dns.json`), cached daily, and the registry
asked directly. Contact fields arrive redacted, which the page already says. The 243 KB snapshot
and its fixtures then retire.
**Why deferred** After the checkout; the owner's order.
**Linked** PROJECT.md "The whois data".

### CDR-CA-1: selling `.ca` (23 Sep 2026)

**Priority** P3 · **Status** waiting on the client (PROJECT.md decision 7; D6 says not at launch).
**Scope** Every `.ca` registration and transfer needs CIRA's `legal_type` (Canadian Presence
category), a `lang` of EN or FR, a Canadian province, and an org name unless the category is an
individual's. The checkout gains those fields only when the cart holds a `.ca`.
**Why deferred** The client has not said whether CDR sells it.
**Linked** CDR-FULFIL-1.

### CDR-TLD-1: `.nyc` is offered on /search and refused at checkout (23 Sep 2026)

**Priority** P2 · **Status** PARKED with the checkout (PROJECT.md decision 13): nothing is refused until something is sold.
**Scope** `EXTENSIONS` in `src/data/site.ts` lists `.nyc` under the new extensions, and OpenSRS
needs `tld_data` (a New York residency nexus) to register it, so `catalog.json` refuses it before
payment. The visitor can add it to the cart and is only told at checkout. More generally, search
prices ANY typed extension on the flat ladder, so every entry in `notSoldOnline` can reach the
cart. Options: drop `.nyc` from the cards, and have search say "contact us" for a refused extension
before it reaches the cart (a SearchPanel change, fork-owned).
**Why deferred** A visible change to /search, so the owner decides; the refusal before payment
already prevents a charge.
**Linked** catalog.json `notSoldOnline`; CDR-CA-1.

### CDR-PRIVACY-1: the privacy policy should say where order records live (23 Sep 2026)

**Priority** P2 · **Status** PARKED with the checkout (PROJECT.md decision 13): no order records exist until it ships.
**Scope** PROJECT.md decision 12 D12. Paid orders, with the registrant's name, address, phone and
email, are kept as files above `public_html` on the client's shared hosting. The policy should
state that, and a retention period; the owner proposes the period to the client.
**Why deferred** Legal copy is the client's.
**Linked** PROJECT.md "Traps", the whois PII case.
