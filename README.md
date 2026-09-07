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
| `ARCHITECTURE.md` | How the suite is put together and why |
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
# Pin to the same commit CI and the Docker images use, so local results are
# comparable with CI results. See APP_COMMIT in .github/workflows/playwright.yml.
git checkout a89cccc91045a0a36ce559cd716aebc31fa302a8
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

The workflow at `.github/workflows/playwright.yml` runs on every push to `main` and on pull requests, as three jobs.

**`static`** — `tsc --noEmit`. Runs first and gates the other two, so a compile
error costs seconds rather than a full browser run.

**`test`** — the suite itself:
1. Checkout this repo, and `cypress-example-kitchensink` at the pinned `APP_COMMIT`
2. Start the app in the background and wait for `/todo` to respond
3. Run Playwright tests (Chromium + Firefox, 4 parallel workers, 2 retries)
4. Generate an Allure HTML report (with trend history from the previous run)
5. Upload report and raw results as CI artifacts
6. Deploy the Allure report to **GitHub Pages** (branch `gh-pages`, path `allure-report/`)

**`docker`** — builds the combined image and runs the suite through
`docker compose`, so the Docker deliverable is exercised rather than merely
reviewed. This is what catches the failure mode where the image builds but the
suite cannot actually run inside it.

The application under test is pinned by commit in three places that must stay in
step: `APP_COMMIT` in this workflow, and the `APP_COMMIT` build args in
`Dockerfile` and `Dockerfile.app`. Without a pin the suite tests whatever
upstream `master` happens to be, and a red build cannot be attributed to either
side.

### Flake detection

`.github/workflows/flake-detection.yml` runs nightly and on demand. It executes
every test three times per browser with `--retries=0`, because the main
workflow's retries are there to keep pull requests usable and will happily
conceal a test that only usually passes. A green pull request says the change
works; this job is what says the suite is trustworthy.

```bash
npm run test:repeat             # the same idea locally
```

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
    ├── add.spec.ts          – Adding todos
    ├── complete.spec.ts     – Completing / uncompleting
    ├── delete.spec.ts       – Deleting todos
    ├── edit.spec.ts         – Inline editing
    ├── filter.spec.ts       – Filtering views
    ├── bulk-actions.spec.ts – Toggle-all & clear-completed
    ├── persistence.spec.ts  – localStorage persistence
    └── lifecycle.spec.ts    – Page Object seeding/cleanup contracts
```

Every spec runs against both browser projects, so the executed total is twice
the test count. Counts are deliberately not written down here: they drift the
moment a test is added, and a stale number in a README is worse than no number.
Run `npx playwright test --list` for the current figure, or read it off the
[published report](https://darkonaumovski.github.io/senior-qa-automation-playwright/allure-report/).

---

## Architecture decisions

| Decision | Rationale |
|----------|-----------|
| Page Object Model | Centralises selectors; tests read as business-level descriptions |
| Custom `todoPage` fixture | Supplies a clean page in a fresh browser context; removes sample todos through the UI |
| `seedTodos()` for preconditions | Writes stored todos and reloads, so setup costs one step instead of several clicks and does not depend on the add, toggle or destroy affordances. Behaviour under test is still driven through the UI. Cannot produce an empty list — see [issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4) |
| `todoStart: 'as-is'` opt-out | Lets a spec that seeds all of its own data skip the fixture's UI cleanup, which `seedTodos()` would overwrite a moment later anyway |
| Persistence tests share fixture | Setup runs once per test; `todoPage.reload()` preserves storage and the URL hash |
| Allure option fixtures | Specs declare `todoFeature`; shared setup applies reporting labels |
| `test.step()` for steps | Works with both Playwright's built-in trace viewer and Allure |
| `allure-playwright` reporter | Satisfies reporting requirements with zero extra tooling except Java |
| Multi-stage Dockerfile | Separates app build from test runner; keeps final image lean |
| `docker-compose.yml` separate services | More realistic for CI pipelines; tests and app can scale independently |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the structure and lifecycle contracts.
`goto()` resets the todo list by default; `goto({ clearData: false })` only
navigates. The application reseeds sample todos when an empty list is reloaded.

---

## Known limitations

Stated plainly, because a reviewer will otherwise find them and wonder whether
they were noticed.

| Limitation | Detail |
|---|---|
| Firefox instability on Windows hosts | Under full parallelism on a managed Windows host, individual Firefox tests fail intermittently with graphics errors, varying between runs and passing consistently in isolation. `playwright.config.ts` documents and works around the environment cause. Linux CI has not reproduced it. If you see it locally, run Firefox with `--workers=1`. |
| Coverage is UI-level only | No API, accessibility, visual-regression or performance coverage. See the exclusions in [TEST_APPROACH.md](TEST_APPROACH.md), which state the residual risk each exclusion leaves. |
| Two browser projects | Chromium and Firefox. WebKit is not run; it would roughly add 50% to CI time for an application with no browser-specific behaviour. |
| The app cannot start empty | It reseeds two sample todos whenever stored data is empty, so `seedTodos([])` throws rather than pretending to work. See [issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4). |
| Allure needs a JVM | `allure-commandline` requires Java 17+ to generate the HTML report locally. Running the tests does not. |
