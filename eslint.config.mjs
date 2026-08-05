import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext/wrangler build output -- generated bundles, not source.
    // Without these, a local `opennextjs-cloudflare build` leaves behind
    // artifacts that `npx eslint` then walks into, drowning real
    // findings in tens of thousands of errors from bundled code.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
