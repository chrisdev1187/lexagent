import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load e2e/.env manually (no dotenv dependency required)
const envFile = path.resolve(__dirname, "e2e/.env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim();
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    {
      // Audit suite — chromium-only, no mobile, extended timeout
      name: "audit",
      testMatch: "**/audit/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      retries: 0,
    },
  ],
});
