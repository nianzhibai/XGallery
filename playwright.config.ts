import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3005";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx tsx e2e/support/server.ts",
    url: baseURL,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    timeout: 60_000,
  },
});
