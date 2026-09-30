// GET /api/geo/ — where the visitor appears to be, for the header chip and its location panel.
//
// FIVE FIELDS: country (ISO two-letter, which picks the region, the logo and the currency), city,
// region, ip, host. Anything that cannot be resolved is null, and the page treats null as "unknown"
// and falls back to the default region. NOTHING HERE FAILS AT THE VISITOR: a missing database or a
// private address answers 200 with nulls.
//
// SHOWING SOMEBODY THEIR OWN IP IS NOT A DISCLOSURE, KEEPING IT WOULD BE. No logging, no storage,
// no cookies, and no-store so the answer never sits in a cache.

import { Router } from "express";
import type { GeoResponse } from "@cdr/shared";
import { tryConfig } from "../../core/config";
import { allow, sendJson } from "../../core/http";
import { visitorIp } from "../../core/visitor";
import { lookupIp } from "../../integrations/geoip/geoip";

const CA: Record<string, string> = { Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS", Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC", "Québec": "QC", Saskatchewan: "SK", Yukon: "YT" };
const US: Record<string, string> = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY" };

const nameOf = (node: { names?: object } | undefined): string | null => {
  const names = node?.names as Record<string, string> | undefined;
  if (!names) return null;
  return names.en || Object.values(names)[0] || null;
};

/** The panel shows the subdivision CODE ("ON", "FL"). The free database carries the NAME, so
 *  Canada's and the United States' are mapped back to codes; elsewhere the name reads better. */
const regionCode = (country: string | null, name: string | null): string | null => {
  if (!name) return null;
  if (country === "CA" && CA[name]) return CA[name];
  if (country === "US" && US[name]) return US[name];
  return name;
};

export const geoRouter = Router();

geoRouter.all("/api/geo", allow("GET"), async (req, res) => {
  const ip = visitorIp(req);
  const host = req.get("host");
  const out: GeoResponse = { country: null, city: null, region: null, ip, host: host ? host.replace(/[^A-Za-z0-9.:\-[\]]/g, "") : null };
  const rec = await lookupIp(tryConfig()?.geoipDb ?? "/srv/cdr/geo/dbip-city-lite.mmdb", ip);
  if (rec) {
    if (rec.country?.iso_code) out.country = rec.country.iso_code.toUpperCase();
    // The database appends a district in brackets ("Toronto (Old Toronto)"); the panel shows a city.
    const city = nameOf(rec.city);
    out.city = city ? city.replace(/\s*\([^)]*\)\s*$/, "").trim() : null;
    const sub = rec.subdivisions?.[0];
    if (sub) out.region = sub.iso_code || regionCode(out.country, nameOf(sub));
  }
  sendJson(res, 200, out);
});
