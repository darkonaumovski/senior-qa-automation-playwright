import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

/**
 * Lint configuration for the suite.
 *
 * The point of linting here is not style — the formatter arguments are not
 * worth a build failure — but the mistakes that make an async test suite lie.
 * `no-floating-promises` is the one that earns its keep: a forgotten `await` on
 * an assertion produces a test that passes regardless of the application's
 * behaviour, which is worse than no test at all. That rule needs type
 * information, hence `recommendedTypeChecked` rather than the cheaper preset.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'allure-report/**',
      'allure-results/**',
      'playwright-report/**',
      'test-results/**',
      'kitchensink/**',
      'cypress-example-kitchensink/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Playwright's own rules, scoped to the specs. They cover the failure modes
  // this suite deliberately avoids — conditionals in tests, focused or skipped
  // tests left behind, and fixed sleeps.
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // A committed test.only silently shrinks the suite to one test while the
      // run still reports green, so it is an error rather than a warning.
      'playwright/no-focused-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      // This suite asserts through the page object, so the rule cannot see the
      // expect() calls and would report every test as assertion-free. Matching
      // the expect* naming convention keeps the rule useful rather than
      // switching it off: a spec that genuinely asserts nothing is still
      // reported, and the pattern does not need updating when a helper is
      // added.
      'playwright/expect-expect': [
        'error',
        { assertFunctionPatterns: ['^expect.*'] },
      ],
    },
  },

  // The config is loaded by Playwright's own loader, not compiled by tsc, and
  // reads .app-commit from disk at startup.
  {
    files: ['eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
