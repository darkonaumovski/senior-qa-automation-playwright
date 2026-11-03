# Desktop TodoMVC Playwright suite

Tests the desktop `/todo` application from [cypress-example-kitchensink](https://github.com/cypress-io/cypress-example-kitchensink) in Chromium, Firefox and WebKit. The application revision lives in `.app-commit`; the suite dependencies are locked separately.

## Local setup

Use Node 22.22.2+ (or Node 24.15+), npm, and a JVM for HTML report generation (CI uses Java 17).

```bash
npm ci --ignore-scripts
npx playwright install --with-deps chromium firefox webkit
git clone https://github.com/cypress-io/cypress-example-kitchensink kitchensink
cd kitchensink
git checkout "$(cat ../.app-commit)"
npm ci --ignore-scripts --omit=dev
npm start
```

In another terminal at the suite root:

```bash
APP_SOURCE_DIR=kitchensink npm test
npm run report:generate
npm run report:open
```

PowerShell: `$env:APP_SOURCE_DIR='kitchensink'; npm test`. If using a dedicated app port, set `TODO_BASE_URL` as well. Only declare `APP_SOURCE_DIR` when that clean checkout actually serves the local target.

Commands:

| Command | Behavior |
|---|---|
| `npm test` | All three engines, automatic local worker selection, no local retries |
| `npm run test:smoke` | Current `@smoke` subset in all three engines |
| `npm run test:headed` | Headed, explicitly one worker |
| `npm run test:repeat` | Three repeats, zero retries |
| `npm run typecheck` / `npm run lint` | Static gates |
| `npm run test:harness` | Repeat-input, reporting and provenance contracts |
| `npx playwright test --list` | Current execution inventory |

CI uses one worker per shard and two retries for PR diagnostics. Every retry recovery is listed in the Actions step summary; first-attempt failure traces are retained. The nightly matrix repeats each engine independently with **zero retries**. Manual repeat input accepts only integers 1–10.

## Run evidence and reports

Every invocation gets `.runs/<unique-id>/allure-results/`, a fresh environment panel, static categories from `reporting/categories.json`, and a `run-manifest.json`. `npm run report:generate` generates only the most recent manifested run; optionally select a run with `node scripts/generate-report.mjs <raw-results-directory>`. The selected manifest is validated before generation; incomplete recorded executions are rejected. Explicit paths let you select a particular run. Existing `allure-results/` files are legacy data and are never read by these commands.

Category names are **triage hints**, not diagnoses. Assertion failures can arise from product, test or environment causes.

CI validates both shard identities, attempted executions, raw result counts and their union against this checkout's full browser inventory before generating or publishing. Complete failing runs still publish. Missing or interrupted shards fail the report job, surface an incomplete-run summary, and leave the previous complete Pages report intact. Historical reports: [GitHub Pages](https://darkonaumovski.github.io/senior-qa-automation-playwright/allure-report/).

| Variable | Meaning |
|---|---|
| `TODO_BASE_URL` | Target URL; default `http://localhost:8080` |
| `APP_SOURCE_DIR` | Operator identifies the clean app checkout serving the local URL; checked with Git |
| `APP_REVISION_FILE` | Verified revision evidence written by the controlled image/service entrypoint |
| `APP_COMMIT` | Build override; **does not prove the revision of an arbitrary remote target** |
| `FIREFOX_WINDOWS_SANDBOX_WORKAROUND=1` | Explicit Windows-only opt-in; preserves the rest of the browser environment |
| `CI` | Enables two diagnostic retries and one worker; `--retries=0` overrides retries |

Unverified remote URLs report revision **unknown**. Combined images read the actual baked checkout SHA. Compose reads the SHA from the independently built app service, including build overrides.

## Docker delivery

```bash
docker build -t todo-suite .
docker run --rm -e CI=true -v "${PWD}/.runs:/workspace/.runs" todo-suite --project=chromium --grep @smoke --retries=0
docker compose build
docker compose up -d --wait app
docker compose run --rm tests --project=chromium --grep @smoke --retries=0
docker compose down
```

No arguments to the image or Compose tests service runs the full suite. A one-shot full-stack invocation also propagates the tests service's result: `docker compose up --build --abort-on-container-exit --exit-code-from tests`. Both local app checkouts are excluded from the build context. Compose waits for app health and targets `http://app:8080`; browser artifacts are bind-mounted.

These are the implemented CI delivery commands. This Windows review host has no Docker CLI; see [QA_AUTOMATION_REVIEW.md](QA_AUTOMATION_REVIEW.md) for the distinction between verified local evidence and CI checks awaiting execution.

## Test design and known product defects

A fresh browser context isolates every test. `todoPage` normally removes sample records through the UI. Seeded scenarios use `todoStart: 'as-is'` to avoid unrelated cleanup. Persistence tests create and mutate records through the UI.

The pinned app reseeds two sample todos on an empty reload. `seedTodos([])` therefore rejects empty input. Readiness checks stored data against the selected filter, allowing zero visible rows with nonempty storage, and reports which precondition is unmet.

Accessibility keeps axe's `label` rule enabled. Only the affected revision's individual visible todo checkboxes are excepted; fixed exceptions fail as obsolete. The unnamed editor, unknown-route fallback, missing focus indicators and unreachable row edit/delete controls have separate known-defect checks. The expected-failure marker is applied after unrelated assertions and only on the reviewed revision; an unexpected pass flags an obsolete defect. These checks are visible evidence of upstream defects, not fixes to the application. On the reviewed Windows WebKit build, Tab and Option-Tab skip filter links; that host limitation has a narrowly scoped expected failure after the unrelated journey assertions. Firefox also drops consecutive identical Enter submissions; the identity scenario establishes duplicate titles by editing a second UI-created record. Both observations and their reproductions are recorded in FINDINGS.md.

See [TEST_APPROACH.md](TEST_APPROACH.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md), and the [review and evidence](QA_AUTOMATION_REVIEW.md).
