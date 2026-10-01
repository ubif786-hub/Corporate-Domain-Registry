# The API

Express 5 on Node 22. Seven endpoints under `/api/`, all answering with and without the trailing
slash:

| Endpoint | What it does |
| --- | --- |
| `GET /api/geo/` | the visitor's country, city and region, for the header chip |
| `GET /api/domain-check/?domain=` | availability at Tucows and the price ladder in the visitor's currency |
| `POST /api/checkout/` | re-checks every domain, writes the order, starts a Stripe Checkout Session (card held, not charged) |
| `POST /api/stripe-webhook/` | Stripe says the customer paid; the order is registered at Tucows, then captured or released |
| `GET /api/order-status/?order=&t=` | the done page's progress; also picks up a late webhook and keeps the order moving |
| `/api/admin/` | the client's order list, one order in full, CSV export (signed in with `ADMIN_TOKEN`) |
| `GET /api/cron/?token=` | runs the sweep now (it also runs every 5 minutes inside the process) |

## Layout: one folder per feature

```
src/
  server.ts              starts the app, the 5-minute sweep, graceful shutdown
  app.ts                 the Express app: one router per feature, 404 and error handling
  core/                  what every feature uses
    config.ts            the settings file (CDR_CONFIG), re-read when it changes
    db.ts                PostgreSQL: the pool, migrations on first use, 503 when it is down
    http.ts              HttpError, JSON replies, 405s, work that runs after the reply
    visitor.ts           the visitor's IP, country and currency
    rate-limit.ts        per-visitor limits (Tucows agreement 3.2)
    mail.ts              Resend, an outbox folder, or the log
    money.ts, time.ts
  integrations/          the outside systems, nothing shop-specific
    opensrs/             Tucows: the XML envelope, lookup, register, order status, balance
    stripe/              REST calls with idempotency keys, webhook signature check
    geoip/               the DB-IP City Lite database
  features/
    geo/                 GET /api/geo/
    domain-check/        GET /api/domain-check/
    checkout/            POST /api/checkout/: validation, the order, the Stripe session
    orders/              the tables (order.schema.ts), the order store, the fulfilment state machine,
                         the emails, GET /api/order-status/
    stripe-webhook/      POST /api/stripe-webhook/
    admin/               /api/admin/: routes, HTML views, CSV
    cron/                the sweep and GET /api/cron/
```

A feature's `*.routes.ts` is its HTTP surface; `*.service.ts` holds the logic; the routes never talk
to Tucows or Stripe directly except through `integrations/`.

## The rules that matter

- **Orders live in PostgreSQL.** Every order change is one transaction with the order's row locked
  (`updateOrder`), and one driver per order is a PostgreSQL advisory lock (`withDriveLock`), so
  concurrent webhooks, polls and sweeps queue up instead of overwriting each other. Change
  functions stay quick and never call Tucows or Stripe while the row is locked.
- **Never register twice.** A line is written as `registering` before Tucows is asked. A lost reply
  leaves it `registering` or `unknown`, and the next pass asks Tucows (`GET_ORDERS_BY_DOMAIN`)
  before sending anything again.
- **Charge only what registered.** The card is authorised at checkout and captured after
  registration, for the registered share only (a promotion keeps its proportion). Nothing
  registered releases the hold. A hold still open on day six is settled and flagged for review.
- **Test with test, live with live.** A live Tucows account with a test Stripe key, or the reverse,
  keeps checkout shut.
- **Secrets stay in the settings file.** Never in git, a log, an email or a chat.

## Database

Three tables: `orders`, `order_lines` (one row per domain), `order_log` (each order's history),
defined in `src/features/orders/order.schema.ts` with Drizzle. The rest of the code works with one
`Order` object; `order.store.ts` maps it to rows and back.

After changing a schema file:

```
npm run db:generate          # writes the SQL migration into drizzle/; commit it with the schema
```

The API applies new migrations itself when it starts (the build copies `drizzle/` to
`dist/migrations/`). Never edit a migration that has reached the server; add a new one.

## Settings

`config.sample.env` lists every setting. On the server the file is `/srv/cdr/cdr.env`. Locally:

```
cp config.sample.env cdr.env          # gitignored; fill in test keys
npm run geoip                          # the IP database into data/ (set GEOIP_DB=data/dbip-city-lite.mmdb)
CDR_CONFIG=cdr.env npm run dev         # from apps/api
```

Checkout and orders need `DATABASE_URL` pointing at a PostgreSQL database the role can create
tables in, for example `postgresql://cdr@127.0.0.1:5432/cdr`. Without it the API still serves
search, and the order endpoints answer 503.

## Tests

The end-to-end harness lives outside this repository (`research/tools/shop-tests` in the project
workspace): a throwaway PostgreSQL 16, a stand-in Tucows and Stripe, the library checks, the
scenario checks (partial capture, all-fail release, async registry, lost reply, promotion, missing
webhook, Tucows hold, CAD, amount mismatch, emails, admin search and CSV, sweep, the rows in the
tables, eight drivers at once registering each domain exactly once), and a browser walking search
to done page.
