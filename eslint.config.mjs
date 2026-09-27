import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // alt-text (A-010): escalate warn -> error, and guard ONLY raw <img>. TS
  // already requires `alt` on Image and Media (more precisely than the lint),
  // so dropping next's img: ["Image"] component check removes the rule as
  // redundant for them AND clears the Card.tsx <Image {...props}> spread
  // false-positive with no per-line disable. elements: ["img"] at error guards
  // any future raw <img> (none today; matters for client forks).
  {
    rules: {
      "jsx-a11y/alt-text": ["error", { elements: ["img"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
