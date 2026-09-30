// The visitor's address -> country, city, region, from DB-IP's IP to City Lite database (CC BY 4.0;
// the site credits it). Not in git: `npm run geoip -w @cdr/api` downloads this month's copy, and the
// path is GEOIP_DB in the settings. Refresh it monthly.
//
// NOTHING HERE THROWS. A missing or unreadable database, or an address it does not know, gives null:
// the page falls back to the default region, and checkout charges USD.

import maxmind, { type CityResponse, type Reader } from "maxmind";

/** DB-IP's City Lite records have MaxMind's City shape: country.iso_code, city.names,
 *  subdivisions[].iso_code and names. */
export type GeoRecord = CityResponse;

let reader: { path: string; db: Reader<GeoRecord> } | null = null;
let failedPath: string | null = null;

async function open(path: string): Promise<Reader<GeoRecord> | null> {
  if (reader?.path === path) return reader.db;
  if (failedPath === path) return null;
  try {
    const db = await maxmind.open<GeoRecord>(path, { watchForUpdates: true, watchForUpdatesNonPersistent: true });
    reader = { path, db };
    failedPath = null;
    return db;
  } catch (e) {
    console.error("[geoip] cannot open the IP database:", e instanceof Error ? e.message : e);
    failedPath = path;
    // Try again in ten minutes, in case the monthly refresh was half-way through.
    setTimeout(() => { if (failedPath === path) failedPath = null; }, 600_000).unref();
    return null;
  }
}

export async function lookupIp(path: string, ip: string | null): Promise<GeoRecord | null> {
  if (!ip || !maxmind.validate(ip)) return null;
  const db = await open(path);
  if (!db) return null;
  try {
    return db.get(ip);
  } catch {
    return null;
  }
}
