# Framework architecture

## Findings

The framework has one Page Object (`pages/TodoPage.ts`) and one fixture module
(`tests/fixtures/todoFixtures.ts`); there are no duplicate classes to merge.
The duplicated responsibilities are:

- Three persistence tests construct and navigate `TodoPage` themselves, although
  the shared fixture already does that once per test. Reloading does not rerun a
  test-scoped fixture.
- Seven spec files repeat Allure epic/feature hooks. Feature names are test
  configuration; the shared reporting lifecycle belongs in a fixture.
- Navigation contains its own DOM selectors and deletion logic alongside the
  Page Object's existing item selectors and delete action.
- Persistence tests repeat reload and page-readiness logic.

The old navigation setup also registers a persistent `addInitScript` to seed a
sentinel todo. That script affects later navigations and couples setup to the
application's storage key and record schema. Documentation incorrectly describes
the app as React and setup as clearing localStorage; the checked-out app uses
vanilla JavaScript and seeds two todos when its list is empty.

## Design

```text
tests/todo/*.spec.ts          scenarios, assertions, stories, feature options
          |
tests/fixtures/todoFixtures.ts  one TodoPage lifecycle and reporting setup
          |
pages/TodoPage.ts             selectors, UI actions, navigation/readiness
```

Keep this small framework flat. A base page class, fixture factory, or component
hierarchy would add indirection without another page or reusable component.
Keep the existing fixture import and public Page Object methods compatible.

- `todoPage` supplies a clean, ready page in Playwright's per-test browser context.
- `todoFeature` configures the Allure feature through `test.use()`; an automatic
  fixture applies common reporting labels before the test runs.
- `goto()` navigates and, by default, calls `clearTodos()`. Cleanup uses existing
  UI actions and retrying count assertions. It installs no browser scripts and
  changes no unrelated storage keys.
- `goto({ clearData: false })` navigates without cleanup; `reload()` preserves
  both stored todos and the URL hash and waits for page readiness.
- Persistence scenarios use the same fixture and call `reload()` explicitly.

The application itself reseeds sample todos when an empty list is reloaded.
The framework leaves that application behavior observable.

## Validation

Run `npm run typecheck` and `npm test -- --workers=4 --retries=0` with the app
running at `TODO_BASE_URL` (default `http://localhost:8080`). Existing scenario
names, steps describing tested behavior, and assertions remain covered on both
Chromium and Firefox. Focused lifecycle checks cover navigation with and without
cleanup, hidden items, repeated cleanup, unrelated storage, and the absence of
initialization scripts on later reloads. The original 40 scenarios remain; four
lifecycle scenarios bring the suite to 44 scenarios / 88 browser executions.

Verified locally on 2026-09-05 with Playwright 1.62.1, Node 24.20.0, and the
checked-out kitchensink app:

- Baseline: 80/80 passed on Chromium and Firefox (4 workers, no retries).
- Refactored suite: 88/88 passed on both browsers (4 workers, no retries).
- `npm run typecheck` and `git diff --check` passed.
- A TypeScript AST comparison confirmed all 40 original scenario titles and
  their assertion calls are unchanged.
- All 88 generated Allure results contain the expected epic, owner, and one
  feature label. Existing feature names and per-scenario stories are retained;
  the shared QA Team owner now applies consistently to every scenario.

Neither completed suite run had test failures. The refactor removes duplicated
setup and the persistent initialization-script side effect without weakening
existing assertions or changing application source.
