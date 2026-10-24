import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config. The default assumes a dev server already running at
 * localhost:3000 against a seeded DB (`npm run seed`). CI starts its own
 * server via the `webServer` block below.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // the suite shares a DB; run sequentially to avoid flakes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000/api/health',
        timeout: 180_000,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
