// Build-time parse of the real token contract (promoted from the HQ scaffold, owner
// 7 Jul, so the kit pages every fork ships can derive their token lists the same way).
// Server-only (reads the filesystem at build); only NAMES come from this parse; the
// TokenRow rows read each token's computed value in the browser, so theme and dials
// stay live. tokens.css is READ here, never written. Ships in the sync unit: a fork
// carries tokens.css at the same path, so the parse works identically there.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Strip /* ... */ comments FIRST. The known gotcha: the audit block at the top of tokens.css
// contains lines like "--text-positive-primary:    OK", which a naive declaration regex would
// pick up as token definitions. Comments gone, every remaining "--name:" is a real LHS.
function parseCustomPropertyNames(css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const seen = new Set<string>();
  const ordered: string[] = [];
  // A declaration LHS: "--name:". var(--x) usages are followed by ")" not ":", and selectors
  // are not "--"-prefixed, so this matches definitions only. First-occurrence order is kept.
  const re = /(--[a-zA-Z0-9-]+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ordered.push(m[1]);
    }
  }
  return ordered;
}

// The DECLARED value of each token as tokens.css wrote it, first declaration wins (the :root
// block comes first in the sheet; a dial's or a theme's override is a later block). What the
// style guide's surface register prints beside a type, space or typeface token (v6.36.0, the
// reference boards' "[tokens.css]" brackets): the sheet's own text, not the browser's substituted
// calc chain, and known at build, so the server renders it with no client read.
function parseDeclaredValues(css: string): Record<string, string> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Record<string, string> = {};
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    if (!(m[1] in out)) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}

const tokensCssPath = join(process.cwd(), "src/app/tokens.css");
const tokensCss = readFileSync(tokensCssPath, "utf8");

export const TOKEN_NAMES: string[] = parseCustomPropertyNames(tokensCss);
export const TOKEN_DECLARED: Record<string, string> = parseDeclaredValues(tokensCss);

// The single source a kit page reports against: rendered token entries must equal this.
export const TOKEN_SOURCE_COUNT = TOKEN_NAMES.length;

// Brand-local tokens: names DEFINED in the fork's brand.css that do not exist in
// tokens.css. brand.css also RE-defines ramp tokens that already live in tokens.css
// (the accent ramp overrides); those are not new names and are excluded here. The
// result is exactly the tokens a fork adds on top of the system: --brand-rule,
// --raw-copper, --brand-mark-dark, and the like. The mother ships a comment-only
// brand.css, so its brand-local set is empty. Read at build like tokens.css; a fork
// carries brand.css at the same path, so the parse works identically there.
const brandCssPath = join(process.cwd(), "src/app/brand.css");
const brandNames: string[] = existsSync(brandCssPath)
  ? parseCustomPropertyNames(readFileSync(brandCssPath, "utf8"))
  : [];
const systemSet = new Set(TOKEN_NAMES);
export const BRAND_LOCAL_NAMES: string[] = brandNames.filter((n) => !systemSet.has(n));

// The exhaustive inventory list: every system token plus the fork's brand-local
// additions, in source order (system first, brand-local last). What the /style-guide
// full inventory renders, so nothing a fork defines stays hidden in code.
export const ALL_TOKEN_NAMES: string[] = [...TOKEN_NAMES, ...BRAND_LOCAL_NAMES];
