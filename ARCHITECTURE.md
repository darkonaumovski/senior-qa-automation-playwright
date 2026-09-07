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

`pages/TodoPage.ts` owns every selector. Specs never touch the DOM, so a markup
change has one place to be fixed, and a spec reads as a description of behaviour
rather than a sequence of clicks.

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

## Reliability

`fullyParallel` with a fresh context per test. CI runs 4 workers with 2 retries;
retries exist to keep pull requests usable, which is also why they cannot be the
only evidence of stability — `.github/workflows/flake-detection.yml` repeats
every test three times with `--retries=0` on a schedule, where a merely-usually-
passing test fails instead of being rescued.

Firefox on Windows needs `MOZ_DISABLE_CONTENT_SANDBOX` and
`MOZ_DISABLE_GMP_SANDBOX`. The subtlety is that `launchOptions.env` *replaces*
the browser environment rather than extending it, so passing only those two
variables strips `SystemRoot`, `TEMP` and `APPDATA` and produces graphics
failures that look like flake. `playwright.config.ts` spreads `process.env` back
in and scopes the whole workaround to `win32`: weakening sandboxing on Linux CI
would buy nothing.

The application under test is pinned by commit in the workflow and both
Dockerfiles. Testing an unpinned upstream means a red build cannot be attributed
to either the suite or the application.

## Validation

```bash
npm run typecheck
npm test                    # app running at TODO_BASE_URL, default :8080
npm run test:repeat         # each test three times, retries disabled
npm run test:docker         # build the image and run the suite inside it
```

CI enforces the first, second and fourth of these on every pull request; the
third runs nightly.
