# Review checklist: Corporate Domain Registry

The client-facing review list for the build handed to the owner on 4 Sep 2026 (the owner sends it
to Iqbal Khan; replies are tracked against it here). Committed 5 Sep 2026 after living only in a
chat for a day. The review link is the open staging address,
https://domain-services-git-staging-magenta-web.vercel.app (FORK_PROTOCOL.md in the mother,
"Staging and production"); the public production address shows the holding page until launch.

Please click through the list below and note anything that looks wrong or missing. A few things
are intentionally incomplete and are marked as such.

## Home page

- [ ] One search field, headed "Enter your domain to get started."
- [ ] Two cards below the search: **Register a Domain** and **Renew Your Domain**. Transfer is still
      available; it appears when you search a domain that is already registered.
- [ ] Header shows the region selector and the cart only.

## Domain search (`/search`, also reachable at `/register`, `/transfer`, `/renew`)

- [ ] You are never asked to pick a service before searching. One field, and the result decides.
- [ ] Search a domain that is **available**: it offers registration, with a term selector.
- [ ] Search a domain that is **already registered**: it offers renewal or transfer, with a term
      selector.
- [ ] The term selector runs **1 to 10 years** and re-prices as you change it.
- [ ] Add a domain to the cart from a result; the cart count updates.

## Cart (`/cart`)

- [ ] Line items show the domain, what you are buying, the term and the price.
- [ ] Changing the term re-prices that line.
- [ ] You can remove a single item, and clear the whole cart.
- [ ] "Continue to payment" is **intentionally disabled**. Card payment and the live registry
      connection are the next stage of work. Nothing is charged and no domain is registered from
      this preview.

## Terms of service (`/tos`)

- [ ] The page opens as six closed sections: Registration Agreement, Disclaimer, Privacy Policy,
      Dispute Policy, Expired Registration Recovery Policy, ICANN Materials.
- [ ] Opening each one shows that document's full title, effective date and numbered sections.
- [ ] Each document also has its own web address, so it can be linked or cited directly.
- [ ] The corporate address block for Canada and the United States appears below.
- [ ] **Please confirm the legal text is still current.** It was transcribed word for word from the
      files supplied on 28 August. If anything has been revised since, send the updated file.

## Other pages

- [ ] Whois lookup (`/whois`) and Contact (`/contact`) both load.
- [ ] Check the site on a phone as well as a computer.

## Known and intentional at this stage

- Prices shown are **sample figures**, not final.
- Domain availability comes from a **snapshot database**, not a live registry connection, so some
  domains will correctly report "unable to verify."
- There is no sign-in, because there is no account system yet.

## What we still need from the client

- [ ] Final price list, and which extensions to offer
- [ ] The correct business phone number. Three different numbers currently appear and we cannot
      confirm which is right
- [ ] Which reseller or registrar account is being set up (the agreement anticipates Tucows via
      OpenSRS)
- [ ] Logo and brand mark. The site currently carries a placeholder

## Replies

None recorded yet. Add each reply under the item it answers, dated.
