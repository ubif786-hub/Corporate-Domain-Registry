// One file out, with every dependency inside it, so the server needs Node and nothing else:
// no npm install on the droplet, no node_modules to keep in step. The deploy copies dist/, which
// also holds the database migrations (dist/migrations/, applied by the API when it starts).
import { cpSync, existsSync, rmSync } from "node:fs";
import { build } from "esbuild";

await build({
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  // Some bundled CommonJS dependencies call require(); give the ESM bundle one.
  banner: { js: "import { createRequire as __cdrRequire } from 'node:module'; const require = __cdrRequire(import.meta.url);" },
  // pg loads its optional native binding only when asked; the bundle never asks.
  external: ["pg-native"],
  logLevel: "info",
});

rmSync("dist/migrations", { recursive: true, force: true });
if (!existsSync("drizzle/meta/_journal.json")) throw new Error("no migrations in drizzle/: run npm run db:generate");
cpSync("drizzle", "dist/migrations", { recursive: true });
