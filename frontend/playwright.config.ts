import { defineConfig, devices } from "@playwright/test"

const PORT = process.env.PORT ?? "3100"
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["junit", { outputFile: "test-results/playwright-junit.xml" }], ["list"]]
    : [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
    },
  },
})
