import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright-tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4177",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4177 --strictPort",
    url: "http://127.0.0.1:4177/e2e/payments-harness.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
