// Who is asking, and from where.
//
// THE VISITOR'S ADDRESS IS req.ip. app.ts trusts only the loopback proxy (nginx on the same
// server), so Express takes the address nginx saw, not whatever a visitor writes into
// X-Forwarded-For. A forged header cannot change the currency, the rate limit or the address
// recorded with the order.

import { isIP } from "node:net";
import type { Request } from "express";
import { currencyForCountry, type Currency } from "@cdr/shared";
import { lookupIp } from "../integrations/geoip/geoip";
import { tryConfig } from "./config";

export function visitorIp(req: Request): string | null {
  const ip = (req.ip ?? "").replace(/^::ffff:/, "");
  return isIP(ip) ? ip : null;
}

const DEFAULT_DB = "/srv/cdr/geo/dbip-city-lite.mmdb";

export async function visitorCountry(req: Request): Promise<string | null> {
  const rec = await lookupIp(tryConfig()?.geoipDb ?? DEFAULT_DB, visitorIp(req));
  const code = rec?.country?.iso_code;
  return code ? code.toUpperCase() : null;
}

/** Canada pays in CAD, everyone else in USD: the same rule as the header chip, decided from the
 *  same IP database, so the page and the charge agree. */
export async function visitorCurrency(req: Request): Promise<Currency> {
  return currencyForCountry(await visitorCountry(req));
}
