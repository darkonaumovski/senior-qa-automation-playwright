# Playwright project review

**83/100 · 3 November 2026 · main at `92ada59`**

I would rely on this suite for routine desktop TodoMVC regression testing. It exercises real user operations across Chromium, Firefox, and WebKit, and it has enough isolation and CI evidence to make failures worth investigating. The largest gap is what a green run can conceal. The accessibility gate passed an unnamed edit field, a broken route can accept writes without rendering them, and the local Allure report can mix results from different runs.

## Scorecard

The rating measures the automation project against its stated scope, the desktop `/todo` experience. The weights reflect my judgment of what makes this suite trustworthy. A product defect costs points here when the suite masks it or leaves an important regression unguarded. Deferred work such as load testing and pixel snapshots carries little weight for this application.

| Dimension | Score | Basis |
|---|---:|---|
| Functional coverage and assertion quality | 21/25 | Thorough core workflows, editing semantics, whitespace and mixed-state bulk actions. Invalid routes, identity-sensitive operations and persistence after edits or deletions have weaker coverage. |
| Playwright design and isolation | 18/20 | A fresh context per test, typed fixtures, deterministic nonempty seeds, retrying assertions and focused lifecycle tests. Readiness and cleanup couple unrelated scenarios to app internals. |
| Reliability and cross-browser execution | 17/20 | Three real browser engines, useful failure artifacts, PR sharding and independent retry-free nightly runs. One WebKit setup timeout occurred locally, and PR retries can absorb intermittent failures. Windows Firefox always runs with two sandbox protections disabled. |
| CI, packaging and reproducibility | 13/15 | App pin, suite lockfile, static gates and an exercised combined image. Gaps include shell interpolation in a manual job, Compose execution and alternate-target revision attribution. |
| Accessibility and user interaction | 6/10 | Three axe surfaces and targeted CSS checks. An overbroad exception hides a real editor defect, and keyboard-only traversal is uncovered. |
| Reporting, documentation and maintenance | 8/10 | Useful steps, strategy, findings and flake investigation. Stale local report data, speculative failure categories and inconsistent setup instructions reduce confidence. |
| **Total** | **83/100** | |

## Evidence and scope

Reviewed the 34 tracked files, including all nine specifications, the fixture and page object, runner and lint configuration, package metadata and lockfile, both Actions workflows, both Dockerfiles, the entrypoint, Compose, ignore rules, reporting assets and project documentation. The two nested application checkouts are external inputs. I verified the clean `kitchensink` checkout matched `.app-commit` (`a89cccc`) and used it for the browser checks. The other checkout was at a different revision.

| Check | Evidence |
|---|---|
| Static checks | `npm run typecheck` and `npm run lint` both exited 0 on Windows with Node 24.20.0 and npm 11.19.0. |
| Discovery | Playwright 1.62.1 listed 58 scenarios in nine files, 174 browser executions. The smoke filter selected 10 scenarios, 30 browser executions. |
| Browser execution | **173 passed, 1 failed in 6.4 minutes.** Chromium 58/58, Firefox 58/58, WebKit 57/58. The pinned app ran on a dedicated loopback port. Playwright used two workers, zero retries, a fresh temporary output directory and the line reporter. The WebKit failure occurred in fixture setup. |
| Isolated WebKit repeat | The case that failed in the full run passed **3/3 in 23.7 seconds** with one worker, three independent repetitions and zero retries. This supports an intermittent setup failure. The change in concurrency and the smaller workload prevent attributing it to worker count alone. |
| Main CI | The push run for this commit passed static checks, pin validation, both browser shards, Docker and report publication. [GitHub Actions run](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/39144041429) |
| Flake detection | The six most recent nightly runs returned for this commit, 29 October through 3 November, all succeeded. The workflow defaults to three repeats per browser, one worker per runner and zero retries. These are six observations, not an estimated flake rate. [3 November run](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/41622790609) |
| Container verification | The local host had no Docker CLI. The verified CI Docker job runs Chromium smoke tests in the combined image and builds the Compose stack. It does not run a browser against the separate Compose app service. |

### What the 58 scenarios exercise

| Area | Scenarios | Assessment |
|---|---:|---|
| Add | 7 | Covers blank input, whitespace-only input, trimming, special characters, input reset and ordering. Exact DOM and storage comparisons can detect whitespace regressions. The special-character case checks one rendered string and is insufficient evidence for the strategy's broader XSS-safe claim. |
| Complete and delete | 5 + 6 | Checks toggling both ways, remaining counts, removal of a middle item, hover visibility and hover color. The “visually distinguish” test checks row classes. Broken strike-through styling could pass. |
| Edit | 6 | Exercises double-click entry, Enter, blur, Escape, blank-to-delete and trimming. The blur helper calls the DOM blur action directly, so it does not exercise tab order. |
| Filters and bulk actions | 7 + 9 | Covers valid routes, empty subsets, immediate removal from Active, mixed completion states and clearing completed rows. Missing combinations include adding under an active filter and independently verifying the bulk checkbox state while toggling individual rows. |
| Persistence | 3 | Builds state through the UI before reloading, then checks titles, completion and filter selection. A regression that resurrects a deleted item or rolls back an edit after reload can escape these tests. |
| Harness lifecycle | 12 | Verifies cleanup, filtered reloads, seed behavior and preservation of unrelated storage. These protect test infrastructure and should be counted separately from product scenarios when communicating coverage. |
| Accessibility | 3 | Scans the base list, inline editing and toggle-all. There is no keyboard-only user journey, and two scans suppress the entire label rule. |

### Engineering choices worth preserving

- **Use the UI for the behavior under test.** Completion and editing scenarios seed preconditions, then exercise the actual controls. Persistence scenarios create their data through the UI. This avoids a circular check that only proves the harness can read back its own seed.
- **Assert at the layer where the defect would appear.** For example, `tests/todo/add.spec.ts:71–85` checks exact rendered and stored whitespace. A normalized text assertion alone would miss a trimming defect. The earlier withdrawn finding in `FINDINGS.md` explains why this distinction matters.
- **Keep recovery evidence.** PR runs retain traces, screenshots and video on failure. The nightly workflow disables retries. The WebKit investigation recorded the failed interaction and added a lifecycle test for cleanup on an already-selected filter. These choices let a reviewer distinguish an app regression from a setup failure.
- **Keep static checks early.** Strict TypeScript and type-aware linting catch a missed asynchronous assertion before the browser matrix runs. The page object centralizes actions without adding a base-class hierarchy for a single page.

## Findings and acceptance criteria

### 1. High · The accessibility gate hides a second unnamed control

`tests/a11y/a11y.spec.ts:29–59` disables the axe `label` rule for the whole page in two scans. The documented exception concerns individual todo checkboxes. I repeated the scan in Chromium with the rule enabled. The base view returned two unnamed checkboxes. After double-clicking the first label, axe also reported **the visible `.edit` input**. As a control experiment, removing the new-todo input's naming attributes in an isolated page added `.new-todo` to the violations. Restoring the suite's rule exclusion returned zero violations on that altered page.

**Acceptance:** keep the rule active. Evaluate its individual failing nodes and allow only the known per-item checkbox exception for this revision. Record the editor defect separately and verify that another unnamed input fails the gate. Add a keyboard-only check that follows focus through a real operation.

### 2. High · The pinned app's dependency risk has changed

The September audit in `FINDINGS.md` recorded one high-severity app finding. A fresh `npm audit --omit=dev` on the pinned checkout reported **seven affected production packages**: one critical, four high and two moderate. npm classified `shell-quote` as critical. The full upstream lockfile, including development tooling, reported 22 affected packages. These counts include transitive relationships. The audit establishes dependency exposure, while exploitability in this particular server still requires investigation. [Critical advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv)

Separately, a fresh full audit of the **test project's own lockfile** reported 13 affected packages, one high and 12 moderate. Its declared dependencies are development tooling, including the lint stack. That is a distinct remediation path from the external server. Both audit commands exited 1 because they returned findings.

**Acceptance:** triage the production dependency paths separately from upstream dev tools, identify a reviewed upstream revision or dependency remediation, rerun the production audit and the three-browser suite, and record any accepted residual exposure. Update the suite tooling through its own lockfile and rerun lint and typecheck. Keep the app revision pin so the result is reproducible.

### 3. High · A known routing defect can leave saved data invisible

`tests/todo/filter.spec.ts:99–119` checks the three supported hashes. In a fresh Chromium context I opened `/todo#/unknown`, entered a unique title and pressed Enter. The browser emitted `this[activeRoute] is not a function`. Storage contained the new title alongside the two sample records, while the DOM still contained only two rows. This independently reproduces the failure described in the repository. It matters because the app appears to ignore a successful write and invites a duplicate submission. [Tracked issue](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7)

**Acceptance:** agree the fallback behavior, then check the resulting view, the newly added row, persistence after reload, and absence of the route exception. Until the upstream fix lands, keep the reproducer visible in a known-defect check. Use a fresh page directly for the invalid route so fixture readiness cannot hide the underlying error.

### 4. Medium · Report generation can mix runs or publish incomplete evidence

`package.json:17` supplies `--clean` to Allure when generating the HTML output. The raw input directory persists between local runs. This checkout already contained **1,246 result JSON files** for a suite with 174 browser executions. Its existing HTML summary reported 173 tests, and its start and finish timestamps spanned about 17 days. Also, `playwright.config.ts:91` uses `outputFolder` although the installed Allure reporter reads `resultsDir`. The default directory happens to match. The tracked `environment.properties` can contain metadata from a prior run.

In CI, `.github/workflows/playwright.yml:194–213,273–288` merges what was downloaded and deploys on main without checking that both shards supplied results. A missing shard can produce a partial report if generation succeeds. The final status check runs after publication. The categories in `allure-results/categories.json` also infer a product defect from a few assertion names, although a stale selector can produce the same failure.

**Acceptance:** keep category configuration outside volatile output, isolate each run's raw results, set the supported reporter option and generate run metadata anew. Before updating Pages, verify both shards supplied results for the expected matrix. Preserve complete reports of failing tests. If a shard is absent, expose the run as incomplete and retain the previous complete publication. Treat category names as triage hints until a failure is diagnosed.

### 5. Medium · A manual workflow input is inserted into shell source

`.github/workflows/flake-detection.yml:17–20,89–97` interpolates `repeat_each` directly into a shell command. A user authorized to dispatch the workflow can supply shell syntax as well as a count. This is a manually triggered input, with a different exposure from arbitrary pull-request text.

**Acceptance:** pass the input through a step environment variable, validate a bounded positive integer, and quote the variable when invoking Playwright. A valid count should still work. An out-of-range count or shell expression should fail before invoking the runner.

### 6. Medium · Setup can turn one behavior change into many failures

`pages/TodoPage.ts:83–105` waits for a nonempty storage array and calculates the expected row count from the route. That accurately models the pinned app's sample seeding. If the product later supports a legitimately empty startup, every spec using this fixture can time out before its own assertions. Likewise, the default cleanup deletes every sample through hover and click. A broken destroy control can make unrelated add and persistence cases fail in fixture setup. The `as-is` fixture option already reduces this dependency for seeded scenarios.

**Observed in this review:** WebKit timed out after 30 seconds setting up `todoPage` for `tests/todo/lifecycle.spec.ts:110`. The locator resolved the first row, then waited for it to be visible and stable during `deleteTodo()` at `pages/TodoPage.ts:215`. The test's first intended operation was to seed over those same records. It never reached its filter assertions. The error context and trace establish the failing action. They do not establish whether the browser, host load or pointer action caused the stall.

**Acceptance:** use the existing `as-is` option for lifecycle cases that immediately replace all data, keeping default cleanup covered by its dedicated tests. Repeat the case across all three browsers and compare first-attempt setup failures. Use a readiness signal compatible with a valid empty list when the app exposes one. For product coverage, prioritize a duplicate-title case that edits or deletes one specific row and verifies both rows after a reload.

### 7. Medium · Container provenance and the documented setup can drift

The combined Dockerfile checks out its build-time app override in stage one, but the runner config reads the repository pin unless the runtime also supplies `APP_COMMIT`. A standalone image built against another SHA can report the default SHA. Similarly, a manual Actions run with an external base URL still reports the locally checked-out pin for a server of unknown revision. The build context excludes `cypress-example-kitchensink/` but omits the existing `kitchensink/` clone, and `Dockerfile:73` copies the entire context. This can add a second app checkout to a local build.

The quick start installs Chromium and Firefox, then runs all three projects (`README.md:60–68`). It calls the headed script single-worker while `package.json:12` sets no worker limit. The strategy still lists two browsers. Compose service health, networking and bind mounts receive build-only CI coverage.

**Acceptance:** record the actual revision in the built image and use an explicit unknown revision for an unverified external target. Exclude both checkout paths, align the install and headed commands with the config, and run one Compose smoke test against the separate service with its exit code propagated.

## Remediation order

1. **First pull request:** narrow the axe exception and add the editor reproduction. Triage the critical upstream serving dependency in parallel. Both issues have current, reproducible evidence.
2. **Next CI change:** separate raw results by run, verify shard completeness, and validate the nightly repeat input. Prove the reporting fix with consecutive full and smoke runs and a simulated missing shard.
3. **Next product regression work:** encode the invalid route outcome, edit/delete persistence and a keyboard-only workflow. Keep existing deterministic seeds and UI-driven persistence setup.
4. **Next maintenance pass:** reconcile browser setup and headed workers, verify Compose at runtime, and check that the Allure app revision matches the service actually exercised.
