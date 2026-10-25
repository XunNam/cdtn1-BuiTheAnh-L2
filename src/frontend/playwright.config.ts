import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests/browser", fullyParallel: false, workers: 1, retries: 0, timeout: 120000,
  reporter: "list", use: { baseURL: process.env.L2_UI_BASE_URL, browserName: "chromium", headless: true, actionTimeout: 15000, trace: "off", video: "off", screenshot: "only-on-failure", viewport: { width: 1280, height: 900 } } });
