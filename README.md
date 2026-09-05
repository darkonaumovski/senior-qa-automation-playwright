# ToDo Application – Playwright Test Suite

End-to-end Playwright test suite for the **TodoMVC** application served by
[cypress-io/cypress-example-kitchensink](https://github.com/cypress-io/cypress-example-kitchensink).

---

## Contents

| Path | Purpose |
|------|---------|
| `tests/todo/` | Playwright specs (add, complete, delete, edit, filter, bulk, persistence) |
| `pages/TodoPage.ts` | Page Object Model |
| `tests/fixtures/todoFixtures.ts` | Shared page lifecycle and Allure metadata fixtures |
| `ARCHITECTURE.md` | Duplication analysis and refactoring design |
| `playwright.config.ts` | Project config (browsers, reporter, timeouts) |
| `Dockerfile` | Combined image: app + test runner |
| `Dockerfile.app` | App-only image (used by docker-compose) |
| `docker-compose.yml` | Two-service compose setup |
| `.github/workflows/playwright.yml` | CI workflow (test → Allure → GitHub Pages) |
| `TEST_APPROACH.md` | Test priorities, scope, decisions |
| `FINDINGS.md` | Documented defects and observations |

---

## Prerequisites

- **Node.js 20+**
- **npm 10+**
- **Docker + Docker Compose** (for containerised execution)
- **Java 17+** (only for generating the Allure HTML report locally – not needed to run tests)

---

## Quick start – local

### 1. Start the application under test

```bash
git clone https://github.com/cypress-io/cypress-example-kitchensink
cd cypress-example-kitchensink
npm install
npm start
# Application available at http://localhost:8080/todo
```

### 2. Install test dependencies

```bash
# In this repository's root:
npm install
npx playwright install --with-deps chromium firefox
```

### 3. Run the tests

```bash
npm test                        # run all tests headlessly (parallel)
npm run typecheck               # check TypeScript without emitting files
npm run test:headed             # run with browser visible (single worker – see note below)
npm run test:debug              # open Playwright Inspector
npm run test:ui                 # open Playwright UI mode
```

> **Headed mode note**: in headed mode multiple workers share the same virtual display cursor.
> Run with `--workers=1` to avoid hover-state conflicts between parallel tests:
> ```bash
> TODO_BASE_URL=http://localhost:8080 npx playwright test --headed --workers=1
> ```

### 4. Generate and open the Allure report

```bash
npm run report                  # generate + open in browser
# or separately:
npm run report:generate         # writes to ./allure-report/
npm run report:open             # opens the generated report
```

> **Note**: `allure-commandline` requires Java 17+. Install via `sdk install java 17-tem` (SDKMAN) or your OS package manager.

---

## Docker – combined image

A single Docker image containing both the application and the test runner.

```bash
# Build
docker build -t todo-playwright .

# Run (starts app internally, runs tests, exits with test exit code)
docker run --rm todo-playwright

# Extract the Allure results for local report generation
docker run --rm -v "$(pwd)/allure-results:/workspace/allure-results" todo-playwright
```

---

## Docker Compose – two-service setup

```bash
docker compose up --build --abort-on-container-exit
```

This will:
1. Build and start the `app` service (kitchensink on port 8080)
2. Wait until the app passes its health check
3. Build and run the `tests` service against `http://app:8080`
4. Write `allure-results/` to your working directory
5. Exit with the test suite's exit code

To generate the report after compose finishes:

```bash
npm run report:generate && npm run report:open
```

---

## CI / GitHub Actions

The workflow at `.github/workflows/playwright.yml` runs on every push to `main` and on pull requests.

**Steps:**
1. Checkout both this repo and `cypress-example-kitchensink`
2. Start the app in the background
3. Run Playwright tests (Chromium + Firefox, 4 parallel workers)
4. Generate an Allure HTML report (with trend history from the previous run)
5. Upload report and raw results as CI artifacts
6. Deploy the Allure report to **GitHub Pages** (branch `gh-pages`, path `allure-report/`)

**Enable GitHub Pages** (one-time setup):
1. Go to `Settings → Pages`
2. Set Source to **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`
3. The report URL will be: `https://<owner>.github.io/<repo>/allure-report/`

**Artifacts** are retained for 30 days and include:
- `allure-results-<run>` – raw JSON results for re-generating the report
- `allure-report-<run>` – the pre-generated HTML report
- `playwright-traces-<run>` – traces and videos (only on failure)

---

## Reporting solution

**Allure** was chosen for the following reasons:

- Step-level breakdown (`test.step()` is natively picked up)
- Screenshots and videos are attached inline to the failure step
- Built-in **trend graphs** across runs (pass/fail rate, duration, flakiness)
- **Execution history** preserved via the `allure-results/history/` folder copied between CI runs
- Well-supported in the Playwright ecosystem via `allure-playwright`

Failure categories (`allure-results/categories.json`):
- **Infrastructure problems** – network / timeout errors (likely environment flakiness)
- **Product defects** – assertion failures (app behaviour mismatch)
- **Test defects** – all other failures (test code issues)

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TODO_BASE_URL` | `http://localhost:8080` | Base URL of the application under test |
| `CI` | *(unset)* | When set, enables retries (2) and limits parallel workers (4) |

---

## Test structure

```
tests/
└── todo/
    ├── add.spec.ts          – Adding todos (7 tests)
    ├── complete.spec.ts     – Completing / uncompleting (5 tests)
    ├── delete.spec.ts       – Deleting todos (5 tests)
    ├── edit.spec.ts         – Inline editing (6 tests)
    ├── filter.spec.ts       – Filtering views (7 tests)
    ├── bulk-actions.spec.ts – Toggle-all & clear-completed (7 tests)
    ├── persistence.spec.ts  – localStorage persistence (3 tests)
    └── lifecycle.spec.ts    – Page Object cleanup/navigation contracts (4 tests)
```

Total: **44 tests** across two browser projects = **88 test executions** per CI run.

---

## Architecture decisions

| Decision | Rationale |
|----------|-----------|
| Page Object Model | Centralises selectors; tests read as business-level descriptions |
| Custom `todoPage` fixture | Supplies a clean page in a fresh browser context; removes sample todos through the UI |
| Persistence tests share fixture | Setup runs once per test; `todoPage.reload()` preserves storage and the URL hash |
| Allure option fixtures | Specs declare `todoFeature`; shared setup applies reporting labels |
| `test.step()` for steps | Works with both Playwright's built-in trace viewer and Allure |
| `allure-playwright` reporter | Satisfies reporting requirements with zero extra tooling except Java |
| Multi-stage Dockerfile | Separates app build from test runner; keeps final image lean |
| `docker-compose.yml` separate services | More realistic for CI pipelines; tests and app can scale independently |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the analysis and lifecycle contracts.
`goto()` resets the todo list by default; `goto({ clearData: false })` only
navigates. The application reseeds sample todos when an empty list is reloaded.
