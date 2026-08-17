import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These react-hooks v7 rules are React Compiler-readiness lints (this
      // project does not enable the React Compiler - no `reactCompiler` flag
      // in next.config.ts). They flag legitimate, idiomatic patterns this
      // app relies on throughout: live-ticking timers reading Date.now()
      // inside intervals/effects (the whole premise of the app is a live
      // money counter), the "latest ref" callback pattern, and the standard
      // client-only localStorage-hydration-on-mount pattern. Left on, they
      // report on code with no actual runtime bug.
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
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
