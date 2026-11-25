import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps `jsx: "preserve"` for Next.js; tests compile JSX themselves.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Router tests run in Node. Component tests opt into jsdom with a
  // `// @vitest-environment jsdom` comment at the top of the file.
  // Only unit tests under src/; the Playwright specs in e2e/ run with `npm run test:e2e`.
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
});
