// Writes the LOCAL stand-in for the client's cdr-config.php, so the payment scripts can be proved
// on this machine before the client uploads anything.
//
//   node scripts/local-cdr-config.mjs --key-var <NAME in .env.local> --webhook-secret-file <path>
//
// The secret key is read from .env.local and the webhook signing secret from a file that
// `stripe listen --print-secret` wrote; NEITHER IS EVER PRINTED. The result goes to the repo root,
// which is the folder ABOVE out/, exactly where cdr-config.php sits above public_html on the host,
// and it is gitignored along with the cdr-orders/ folder the scripts create beside it.
//
// It refuses anything but a TEST key: live keys wait until fulfilment exists (PROJECT.md).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argOf = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const keyVar = argOf("--key-var");
const secretFile = argOf("--webhook-secret-file");
if (!keyVar || !secretFile) {
  console.error("usage: node scripts/local-cdr-config.mjs --key-var <NAME> --webhook-secret-file <path>");
  process.exit(2);
}

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^(['"])(.*)\1$/, "$2")]),
);
const key = env[keyVar];
if (!key) { console.error(`refused: ${keyVar} is not set in .env.local`); process.exit(1); }
if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
  console.error(`refused: ${keyVar} is not a Stripe TEST secret key (it must start sk_test_). Live keys wait for fulfilment.`);
  process.exit(1);
}
const whsec = readFileSync(secretFile, "utf8").trim();
if (!/^whsec_[A-Za-z0-9]+$/.test(whsec)) { console.error("refused: the webhook secret file does not hold a whsec_ value"); process.exit(1); }

const php = (s) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
writeFileSync(
  join(ROOT, "cdr-config.php"),
  `<?php
// LOCAL ONLY, written by scripts/local-cdr-config.mjs. Gitignored. Never uploaded.
return array(
    'stripe_secret_key' => ${php(key)},
    'stripe_webhook_secret' => ${php(whsec)},
    'notify_email' => 'orders@example.test',
    'site_url' => 'http://127.0.0.1:8099',
    'from_email' => 'no-reply@example.test',
    // No mail server on a laptop: notices are written to cdr-orders/outbox/ instead of sent.
    'mail_transport' => 'file',
);
`,
);
console.log(`wrote cdr-config.php (test key from ${keyVar}, webhook secret from the Stripe CLI; values not shown)`);
