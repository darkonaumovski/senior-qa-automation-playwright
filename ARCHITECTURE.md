# Framework architecture

How the suite is put together, and the reasoning behind the parts where a
reviewer might reasonably expect something different.

## Shape

```text
tests/todo/*.spec.ts             scenarios, assertions, feature options
          |
tests/fixtures/todoFixtures.ts   TodoPage lifecycle, reporting labels
          |
pages/TodoPage.ts                selectors, UI actions, seeding, readiness
```

Three layers, deliberately flat. There is one page and one reusable component,
so a base page class, a fixture factory or a component hierarchy would add
indirection with nothing to abstract over. That decision would change the moment
a second page arrives; it is not a claim that layering is wrong in general.

## The page object

`pages/TodoPage.ts` centralizes reusable UI selectors and operations. Focused
accessibility, storage and route-reproduction checks inspect the DOM directly
when that is the behavior or diagnostic evidence under test.

It exposes three kinds of member, and the distinction matters more than it
looks:

- **UI actions** — `addTodo()`, `toggleTodo()`, `editTodo()`, `deleteTodo()`.
  These drive the application the way a user does.
- **Seeding** — `seedTodos()`. Writes stored records directly and reloads.
- **Assertions** — `expectTodoCount()`, `expectTodoText()`, and the two that
  read below the UI, `expectExactTodoText()` and `storedTitles()`.

`expectTodoText()` uses Playwright's `toHaveText`, which normalises whitespace.
That is usually what you want and is wrong for whitespace behaviour
specifically: a normalising assertion returns the same verdict whether or not
the application trims, so it cannot detect a trimming regression in either
direction. `expectExactTodoText()` compares `textContent` character for
character and `storedTitles()` reads the persisted record, so whitespace claims
are checked at both the rendered and stored layers. This is not a hypothetical:
a defect report in this repository's history asserted untrimmed storage and
survived review precisely because the only assertions covering it normalised
whitespace away. See the withdrawal record in [FINDINGS.md](FINDINGS.md).

## Test data: seeded preconditions, UI-driven behaviour

The rule is that **preconditions are seeded and the behaviour under test is
driven through the UI**.

A test needing "three todos, two completed" reaches that state with one
`seedTodos()` call instead of five interactions. Setup stops depending on the
add, toggle and hover-to-reveal destroy affordances, so a regression in the add
field fails the add tests rather than most of the suite at once. It is also
about a quarter faster per test.

The line holds in both directions. `persistence.spec.ts` keeps building state
through the UI and calling `reload()`, because seeding there would reduce the
test to asserting that `localStorage` survives a page load — true of any
browser, and no longer a statement about this application.

`seedTodos([])` throws rather than returning quietly. The application reseeds
two sample todos whenever stored data is empty (`app/assets/js/todo/app.js`) and
its `Store` initialises a missing key to `[]`, so seeding at least one item is
what suppresses the samples. An empty list is reachable only by deleting through
the UI. A helper that silently produced the sample todos when asked for nothing
would be worse than one that refuses. The constraint is filed upstream as
[issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4)
and pinned by tests in `lifecycle.spec.ts`.

## Fixtures

`todoPage` supplies a ready page in Playwright's per-test browser context, which
is what makes tests order-independent: fresh context, fresh storage, no shared
state.

`goto()` navigates and by default calls `clearTodos()`, which removes the sample
todos through the UI. It installs no init scripts and touches no unrelated
storage keys. An earlier design used a persistent `addInitScript` to seed a
sentinel todo; that leaked into every later navigation in the test and coupled
setup to the storage schema, so it was removed.

`todoStart: 'as-is'` lets a spec skip that cleanup. A spec that seeds all of its
own data would otherwise pay for a UI cleanup whose result `seedTodos()`
overwrites immediately.

`todoFeature` sets the Allure feature via `test.use()`, and an automatic fixture
applies the shared labels. Feature names are per-spec configuration; the
reporting lifecycle is shared, so it lives in one place instead of being
repeated as hooks in every spec file.

## Accessibility and CSS state

Axe scans the base list, inline editor and toggle-all surfaces with the label rule active. Only individual visible todo checkbox nodes on the exact affected revision are excepted. Unexpected nodes retain full diagnostics; a repaired checkbox flags an obsolete exception. The unnamed editor has its own narrowly scoped expected-failure assertion. Keyboard checks cover real Tab/Space/Enter interaction and visible filter-link focus; separate known-defect checks retain missing focus and unreachable edit/delete evidence.

Computed CSS assertions cover the toggle-all chevron, destroy-button hover, and completed versus active label decoration and color. General pixel comparisons remain deferred.

## Reliability

Playwright uses fresh contexts and fully parallel scenarios. CI runs one worker per shard with two diagnostic retries. The reporter lists retry recoveries and retains first-attempt failure artifacts. Nightly execution is retry-free, with validated 1–10 repeats. Headed local execution explicitly uses one worker.

The Windows Firefox sandbox workaround requires FIREFOX_WINDOWS_SANDBOX_WORKAROUND=1. It preserves the host environment and never applies to Linux or macOS. A past graphics failure is not proof that sandbox disabling fixes that host problem. Review runs use normal settings and record outcomes honestly.

The app pin lives in .app-commit. Runtime provenance is checked separately: a local operator identifies the clean checkout actually serving the URL, the combined entrypoint reads its baked revision, and Compose fetches the independent service's revision. Unverified remote targets report unknown.

## CI and reporting

Two native browser shards upload separate artifact trees. Their manifests include expected Playwright IDs and every attempt; raw Allure results carry the same IDs. The report job validates both shard identities and the exact inventory before merging or publishing. Complete failing runs publish. Missing, interrupted, skipped or contaminated evidence blocks publication and retains the previous complete report.

Every test invocation gets a unique .runs/<id>/allure-results directory. Static category configuration lives in reporting/ and category names describe triage hints. The report generator selects one validated run. It never reads legacy allure-results files.

The Docker job runs Chromium smoke through both the combined image and separate Compose service, checks health/networking and artifact mounts, deliberately fails a browser assertion to prove exit-code propagation, and checks default and overridden revision attribution. Actual execution evidence and remaining host limitations are recorded in QA_AUTOMATION_REVIEW.md.

## Validation

Run npm run typecheck, npm run lint, npm run test:harness, then the browser matrix with the actual app running. Use npm run test:repeat for retries-disabled repetition and npm run test:docker for the separate service topology. See README.md for exact setup and container commands.
