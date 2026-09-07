import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL defaults to localhost:8080 (cypress-example-kitchensink default port).
 * Override via TODO_BASE_URL env var (e.g. in Docker: http://app:8080).
 */
const BASE_URL = process.env.TODO_BASE_URL ?? 'http://localhost:8080';

/** Used to turn Allure `issue()` ids into links, and to label the report. */
const REPO_URL = 'https://github.com/darkonaumovski/senior-qa-automation-playwright';

/**
 * Commit of the application under test. CI and the Dockerfiles pin this, so
 * recording it in the report makes a result attributable to a specific app
 * revision rather than to whatever master happened to be that day.
 */
const APP_COMMIT = process.env.APP_COMMIT ?? 'unpinned (local run)';

/**
 * Firefox launch options.
 *
 * Some managed Windows hosts cannot start Firefox content processes unless the
 * content and GMP sandboxes are disabled. That workaround is scoped to Windows:
 * weakening sandboxing everywhere, including Linux CI, buys nothing.
 *
 * launchOptions.env *replaces* the browser's environment rather than extending
 * it, so process.env has to be spread back in. Passing only the MOZ_* variables
 * strips SystemRoot, TEMP and APPDATA, which makes Firefox unstable on Windows
 * with graphics failures such as "RenderCompositorSWGL failed mapping default
 * framebuffer".
 */
function firefoxLaunchOptions(): { env?: Record<string, string> } {
  if (process.platform !== 'win32') {
    return {};
  }

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.MOZ_DISABLE_CONTENT_SANDBOX = '1';
  env.MOZ_DISABLE_GMP_SANDBOX = '1';

  return { env };
}

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
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
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
          APP_COMMIT,
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
        launchOptions: firefoxLaunchOptions(),
      },
    },
  ],
});
