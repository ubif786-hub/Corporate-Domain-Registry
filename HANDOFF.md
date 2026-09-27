# Handoff

<!-- fanout:begin — generated, do not edit by hand -->

**Design system: `v6.37.1`**, fanned out 25 Sep 2026. Sync unit byte-identical to the mother at that tag.

_This block is written by `scripts/fanout.mjs` and carries derived facts only. The prose below it
is hand-written and is NOT updated by a release: if it looks stale, it is, and the fix is for whoever
next works here to rewrite it. `node scripts/project-brief.mjs` in the mother prints how stale._

<!-- fanout:end -->

## START HERE (25 Sep 2026, later: synced to v6.37.0, the v3 export cut and proven; the owner uploads it)

**`www.corporatedomainregistry.com` answers from the client's GoDaddy cPanel, and the owner uploads
to it himself now** (he has cPanel access as of 24 Sep; the Iqbal step is retired). `PROJECT.md`,
"Hosting", is the decision and what is owed; `cpanel/README.md` is the procedure. Nothing here
restates either.

**What is live, measured on 25 Sep 2026** with
`node scripts/probe-phone.mjs https://www.corporatedomainregistry.com` (PHONE OK) and a panel check
at 320, 390 and 1440 with a short and a 39 character IPv6 geo answer (nothing past the panel's edge,
no Site row): the two phone fixes of 21 Sep (`9e8d197`, four tabs on one row, the location panel on
screen and a tap that opens it) and the panel fix (`ff34143`: the Site row removed at the owner's
word, the panel sized by its content, a long value wrapping inside it). The zip he uploaded is
`C:\Users\ali\OneDrive\Desktop\corporate-domain-registry-site-v2.zip`, cut 24 Sep 15:50 from the
tree BEFORE the desktop's seven checkout and payment commits, so it carries no payment scripts.
The v3 export below supersedes it.

**SYNCED to v6.37.0 (`cd2fb55`, the mother session, 25 Sep 2026), parity 178/178 identical, and
the v3 export is cut and proven.** Every fanout from v6.30.0 had skipped this clone on the
RegionChip edit; once it was committed, rebased onto the desktop's seven commits and pushed, the
mother ran `fanout.mjs v6.29.2 v6.37.0` for this fork alone. Then, without `--payments`:
`export-cpanel.mjs` (300 files, 19 pages), `probe-cpanel-parity.mjs` against the synced staging
(PARITY OK, every page 0px different at 1440 and 390, the CA, US and DE flows passing),
`probe-phone.mjs` on the export (PHONE OK) and the new `probe-panel.mjs` on the export (PANEL OK
at 320, 390 and 1440 with a short and a 39-character IPv6 answer), and the home, register, cart
and checkout pages looked at at both widths. The zip is
`C:\Users\ali\OneDrive\Desktop\corporate-domain-registry-site-v3.zip` (60.5 MB, 300 entries, no
backslash). **Owed after the owner uploads it:** `probe-phone.mjs` and `probe-panel.mjs` against
`https://www.corporatedomainregistry.com`, because parity compares the export with staging and a
change both share passes it.

**Cutting the export:** `export-cpanel.mjs` leaves the payment scripts, routes and form out unless
it is given `--payments` (decision 13, `PROJECT.md`). A zip for the client is cut without the
flag, which is the command below.

```
node scripts/export-cpanel.mjs --site https://www.corporatedomainregistry.com --dest "C:/Users/ali/OneDrive/Desktop/corporate-domain-registry-site"
php -S 127.0.0.1:8099 -t out cpanel/local-router.php
node scripts/probe-cpanel-parity.mjs          # must end PARITY OK
powershell -File cpanel/make-zip.ps1 -Dest "C:/Users/ali/OneDrive/Desktop/<name>.zip"
```

PHP is not installed on the laptop: a portable zip from downloads.php.net/~windows/releases
(unpack anywhere, verify the published sha256) is enough. The IP database (127 MB) is not in git;
the export downloads it when `cpanel/api/geo/dbip-city-lite.mmdb` is missing.

**Vercel:** production on Vercel is the holding page (307 to `/coming-soon`) by design, since
production is the client's host; the project retires after the source handover (DS-CPANEL-1 in the
mother's queue). A push to `staging` deploys only the open review link and never touches cPanel.

**The owner's open calls:** a credit line for the IP database (DB-IP Lite, CC BY 4.0) or a paid
lookup instead. The backend (Stripe, whois or registrar API) is the client's to commission from a
developer (decision 13).

Everything before this (the rename to Corporate Domain Registry, the two regions, the sellable
search, the brand stand-in, the two photographs) is in `PROJECT.md` and `SESSION_LOG.md`.
