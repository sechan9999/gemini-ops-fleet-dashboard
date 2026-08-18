import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    ignoreHTTPSErrors: true,
  },
  reporter: [["list"]],
});
