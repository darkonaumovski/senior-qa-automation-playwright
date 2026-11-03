import categories from './reporting/categories.json';
import { randomUUID } from 'node:crypto';
import { appRevision, firefoxEnvironment } from './scripts/run-support';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL defaults to localhost:8080 (cypress-example-kitchensink default port).
 * Override via TODO_BASE_URL env var (e.g. in Docker: http://app:8080).
 */
const BASE_URL = process.env.TODO_BASE_URL ?? 'http://localhost:8080';

/** Used to turn Allure `issue()` ids into links, and to label the report. */
const REPO_URL = 'https://github.com/darkonaumovski/senior-qa-automation-playwright';

const APP_COMMIT = appRevision(BASE_URL);
process.env.QA_RUN_ID ??= new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
const RUN_ID = process.env.QA_RUN_ID;
const RESULTS_DIR = join(__dirname, '.runs', RUN_ID, 'allure-results');

export default defineConfig({
  testDir: './tests',
  globalSetup: './scripts/fresh-results.ts',
  metadata: { appCommit: APP_COMMIT, runId: RUN_ID, resultsDir: RESULTS_DIR },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Give each browser the runner's resources. WebKit intermittently stalled
  // at startup with four workers; avoid contention while CI still scales
  // across shard/browser matrix jobs. Local worker selection stays automatic.
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['line'],
    ['json', { outputFile: join(__dirname, '.runs', RUN_ID, 'playwright-results.json') }],
    ['./scripts/evidence-reporter.ts'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        detail: true,
        resultsDir: RESULTS_DIR,
        categories,
        suiteTitle: false,
        environmentInfo: {
          BASE_URL,
          NODE_VERSION: process.version,
          OS: process.platform,
          APP_COMMIT,
          RUN_ID,
        },
        links: {
          issue: { urlTemplate: `${REPO_URL}/issues/%s` },
          tms: { urlTemplate: `${REPO_URL}/blob/main/TEST_APPROACH.md#%s` },
        },
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
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: firefoxEnvironment(),
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
