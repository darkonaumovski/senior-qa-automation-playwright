import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL defaults to localhost:8080 (cypress-example-kitchensink default port).
 * Override via TODO_BASE_URL env var (e.g. in Docker: http://app:8080).
 */
const BASE_URL = process.env.TODO_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['line'],
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: false,
        environmentInfo: {
          BASE_URL,
          NODE_VERSION: process.version,
          OS: process.platform,
        },
        // links.issue.urlTemplate should be set to your repo's issues URL once
        // the repo is created, e.g. 'https://github.com/owner/repo/issues/%s'
      },
    ],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
