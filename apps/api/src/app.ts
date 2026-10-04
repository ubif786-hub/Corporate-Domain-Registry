// The API: one Express app, one router per feature. Every path answers with and without the
// trailing slash (/api/checkout and /api/checkout/), because the static site asks for the slashed
// form.

import express, { type NextFunction, type Request, type Response } from "express";
import { HttpError, noStore, sendJson } from "./core/http";
import { adminRouter } from "./features/admin/admin.routes";
import { checkoutRouter } from "./features/checkout/checkout.routes";
import { cronRouter } from "./features/cron/cron.routes";
import { domainCheckRouter } from "./features/domain-check/domain-check.routes";
import { geoRouter } from "./features/geo/geo.routes";
import { orderStatusRouter } from "./features/orders/order-status.routes";
import { renewRouter } from "./features/renew/renew.routes";
import { stripeWebhookRouter } from "./features/stripe-webhook/stripe-webhook.routes";
import { whoisRouter } from "./features/whois/whois.routes";

export function createApp(options: { staticDir?: string } = {}) {
  const app = express();
  app.disable("x-powered-by");
  // nginx on the same server is the only proxy trusted, so req.ip is the address nginx saw and a
  // visitor cannot choose it by sending X-Forwarded-For.
  app.set("trust proxy", "loopback");

  app.use(geoRouter);
  app.use(domainCheckRouter);
  app.use(renewRouter);
  app.use(whoisRouter);
  app.use(checkoutRouter);
  app.use(stripeWebhookRouter);
  app.use(orderStatusRouter);
  app.use(adminRouter);
  app.use(cronRouter);

  if (options.staticDir) {
    // Local testing only: serve the static export too, so one process is the whole site.
    // In production nginx serves the pages and sends only /api/ here.
    // Nothing under /api/ is ever a file.
    const files = express.static(options.staticDir, { extensions: ["html"], redirect: true, dotfiles: "ignore" });
    app.use((req, res, next) => (req.path.startsWith("/api/") ? next() : files(req, res, next)));
  }

  app.use((req: Request, _res: Response, next: NextFunction) => next(new HttpError(404, "not_found", "Not found.")));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.code, message: err.message, ...err.extra });
    const e = err as { type?: string; status?: number };
    if (e?.type === "entity.parse.failed") return sendJson(res, 400, { error: "bad_request", message: "The request could not be read." });
    if (e?.type === "entity.too.large") return sendJson(res, 413, { error: "too_large", message: "The request is too large." });
    console.error(`[api] ${req.method} ${req.path}:`, err instanceof Error ? err.stack ?? err.message : err);
    noStore(res);
    res.status(500).json({ error: "server", message: "Something went wrong. Nothing was charged; please try again." });
  });

  return app;
}
