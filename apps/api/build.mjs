// One file out, with every dependency inside it, so the server needs Node and nothing else:
// no npm install on the droplet, no node_modules to keep in step. The deploy copies dist/.
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
  logLevel: "info",
});
