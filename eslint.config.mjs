import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  // Next.js rules (React, hooks, Core Web Vitals) + typescript-eslint.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // eslint-config-next already registers jsx-a11y but turns on only a few rules;
  // enable its full recommended set.
  { rules: jsxA11y.flatConfigs.recommended.rules },
];

export default config;
