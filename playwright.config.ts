import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const isCI = !!process.env.CI;

/**
 * End-to-end tests run against a production build (`next build` + `next start`).
 * In CI the build is a separate step before this one, so only `next start` runs here.
 * The task store is in memory and shared by all tests, so they run one at a time
 * and each test uses its own unique task titles.
 */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: isCI ? `npm run start -- --port ${PORT}` : `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
