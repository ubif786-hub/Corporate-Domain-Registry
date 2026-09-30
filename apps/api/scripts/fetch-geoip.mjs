// Downloads DB-IP's free IP to City Lite database (CC BY 4.0), this month's or last month's.
//
//   node scripts/fetch-geoip.mjs [destination]     default: data/dbip-city-lite.mmdb
//
// On the server: node fetch-geoip.mjs /srv/cdr/geo/dbip-city-lite.mmdb (setup.sh does it, and a
// monthly cron job refreshes it). The file is written beside, then renamed over the old one, so the
// running API never reads half a file; it notices the new file by itself.
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const dest = resolve(process.argv[2] || "data/dbip-city-lite.mmdb");
mkdirSync(dirname(dest), { recursive: true });
const now = new Date();
const months = [0, -1].map((d) => {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + d, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
});
for (const m of months) {
  const url = `https://download.db-ip.com/free/dbip-city-lite-${m}.mmdb.gz`;
  const res = await fetch(url);
  if (!res.ok) continue;
  writeFileSync(dest + ".tmp", gunzipSync(Buffer.from(await res.arrayBuffer())));
  renameSync(dest + ".tmp", dest);
  console.log("IP database:", url, "->", dest);
  process.exit(0);
}
console.error("FAILED: could not download the IP database");
process.exit(1);
