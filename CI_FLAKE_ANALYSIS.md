# WebKit CI flake investigation — 18 October 2026

## Evidence

- [Run 42](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/39109857685), scheduled on 18 October: Chromium and Firefox succeeded. WebKit finished with **170 passed, 1 failed**, with retries disabled.
- [The failing WebKit job](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/39109857685/job/117623443664) failed in `todoFixtures → goto → clearTodos → filterByAll`, before the body of `should add a single todo item` ran.
- The downloaded `flake-traces-webkit-42` trace shows the All link was visible and already selected. The click stalled for 10 seconds at “waiting for element to be visible, enabled and stable”; no click was dispatched. The app and its assets returned HTTP 200, readiness completed, and both sample todos were rendered.
- [The 8 October run](https://github.com/darkonaumovski/senior-qa-automation-playwright/actions/runs/37764357422) had the same WebKit failure, same first test, same setup call, and the same 170/1 result. These were the only failed scheduled runs from 19 September through 18 October. Both used four workers; the first batch also contained the three accessibility scans.

## Diagnosis and changes

The confirmed failure is an unnecessary pointer action in shared fixture setup,
not an add-todo assertion failure. `clearTodos()` clicked All even when the app
had already selected it. Cleanup now skips that click when All is selected,
while still switching from Active/Completed so hidden todos are removed. The
filter interaction tests continue to exercise real clicks.

Concurrent browser startup and accessibility scans are a plausible contributor
to the WebKit actionability stall. The trace does **not** establish CPU starvation
or a specific WebKit engine defect. CI now uses one worker per runner, consistent
with [Playwright's recommendation](https://playwright.dev/docs/ci#workers), to
remove that contention. Browser and shard matrix jobs still run in parallel.
This trades some per-job speed for stability; Linux CI needs to confirm the
mitigation over subsequent scheduled runs.

Timeouts, assertions, browser coverage, and the nightly `--retries=0` policy are
unchanged. `npm run test:repeat` now explicitly disables retries too, including
when invoked with `CI=true`, so local repeat checks cannot silently mask flakes.

The added lifecycle regression verifies that cleanup of mixed todos does not
click an already-selected All filter, clears persisted todos, tolerates a second
cleanup with a hidden footer, and permits adding a fresh item. Existing coverage
checks cleanup from a filtered view with no visible items.

## Validation

- Baseline on Windows: the original WebKit add suite passed 21 executions
  (`--repeat-each=3 --workers=4 --retries=0`). The intermittent Linux stall did
  not reproduce in this local baseline.
- `npm run typecheck` and `npm run lint`: passed.
- Post-change full WebKit suite on Windows, `CI=true`, three repetitions,
  one worker, zero retries: **174 passed (12.3 minutes)**. This includes three
  successful executions of the new cleanup regression.
- Chromium and Firefox add/lifecycle suites on Windows, `CI=true`, one worker,
  zero retries: **38 passed (52.8 seconds)**, including the new regression and
  cleanup from an empty filtered view in both browsers.
- `CI=true npm run test:repeat -- --project=webkit --list --reporter=json`:
  resolved configuration confirms `workers: 1`, `repeatEach: 3`, `retries: 0`.
- `git diff --check`: passed. Tests used the existing app checkout at the
  revision recorded in `.app-commit`. These local results precede Linux CI
  confirmation; check GitHub Actions for runs against the fix commit.

Reproduce the nightly check against the pinned app with:

```bash
CI=true npm run test:repeat -- --project=webkit
```

The original GitHub run records the old commit and will remain red. Re-running
that run alone would not test these changes; validation in GitHub Actions needs
a run against the commit containing the fix.
