# Test Approach – ToDo Application

## Application under test

**URL**: `http://localhost:8080/todo`  
**Source**: [cypress-io/cypress-example-kitchensink](https://github.com/cypress-io/cypress-example-kitchensink)  
**Implementation**: Vanilla JavaScript TodoMVC

---

## Analysis summary

The application implements the standard TodoMVC feature set:

| Feature | Notes |
|---------|-------|
| Add todo | Pressing Enter on `.new-todo` input |
| Complete / uncomplete | Toggle checkbox per item |
| Delete | Destroy button (visible on hover) |
| Inline editing | Double-click label, confirm with Enter/blur, cancel with Escape |
| Filter | All / Active / Completed via hash routing (`#/`, `#/active`, `#/completed`) |
| Toggle all | Marks/unmarks every todo at once |
| Clear completed | Removes all completed items in one click |
| Counter | "X item(s) left" in footer |
| Persistence | `localStorage` – survives page reload |

---

## Test priorities

### Priority 1 – Core CRUD (must pass)
Every meaningful use of the app depends on being able to create, complete, and delete items. A regression here would be an immediate blocker.

- Add a single todo and verify it appears with correct text
- Add multiple todos
- Toggle completion on and off
- Delete a single item; verify the list contracts correctly

### Priority 2 – Filtering (high value)
Filtering is used in every non-trivial session. Broken filters hide or show wrong data.

- All / Active / Completed views show only the correct subset
- Switching between filters is reliable
- URL hash reflects the selected filter (deep-linkability)
- Counter stays accurate across filter switches

### Priority 3 – Inline editing (medium risk)
Editing is the most interaction-heavy feature and historically the most fragile in TodoMVC implementations (double-click, keyboard shortcuts, trim on save).

- Double-click enters edit mode
- Confirm with Enter saves the change
- Confirm by blur (tab away) saves the change
- Escape reverts without saving
- Clearing text while editing deletes the item

### Priority 4 – Bulk operations (medium value)
- Toggle-all completes / untoggles all items
- Clear completed removes only completed items
- Counter updates correctly after bulk actions

### Priority 5 – Edge cases and data quality (risk mitigation)
- Empty input is rejected
- Whitespace-only input is rejected
- Leading/trailing whitespace is trimmed on add and on edit — asserted exactly, on both the
  rendered label and the stored record, because `toHaveText` normalizes whitespace and would
  pass even if the title were persisted padded
- Special characters are rendered as plain text (XSS-safe)

### Priority 6 – Persistence (completeness)
- Todos survive a `page.reload()`
- Completion state survives a reload
- Selected filter survives a reload (hash-based, so this is inherent)

---

## Scope

**In scope**
- All features of the `/todo` page described above
- Cross-browser: Chromium and Firefox (configured in `playwright.config.ts`)
- Parallel execution per browser project

**Out of scope**, with the risk each exclusion accepts. An exclusion without a
stated consequence is a gap dressed up as a decision.

| Excluded | Why | Residual risk accepted |
|---|---|---|
| All other pages of the kitchensink application | They are Cypress demo pages, not the product under evaluation | None for this assignment. If the suite were ever repurposed as the repo's regression net, everything outside `/todo` would be uncovered. |
| Performance / load testing | Single-user client-side app with no backend; there is no contention to measure | A change that makes rendering slow with several hundred todos would ship unnoticed. The suite asserts correctness, never duration. |
| Visual regression / pixel comparison | Needs a baseline store and a review workflow to be worth anything; without one it produces noise | CSS breakage that leaves the DOM intact passes every test here. The toggle-all chevron and the hover-revealed destroy button are the realistic candidates, since both are styling-dependent affordances the tests reach via the DOM. |
| Accessibility (WCAG audit) | Deliberately deferred rather than done badly; a real audit needs `axe` plus manual keyboard and screen-reader passes | Unknown. This is the largest untested risk area, and the one I would close first: the app has custom checkbox and inline-edit interactions, exactly where a11y defects concentrate. |
| Mobile viewport tests | The TodoMVC CSS is desktop-only by design | Layout defects below the CSS breakpoint are invisible to the suite. Low product impact given the app's intent, but it is an assumption about intent rather than a verified fact. |
| WebKit | Roughly 50% more CI time for an app with no browser-specific behaviour | A WebKit-only rendering or storage defect would not be caught. Judged unlikely because the app uses no vendor-prefixed or recent APIs; the judgement, not the coverage, is what protects us. |

---

## Assumptions

1. The application stores state in `localStorage`. Playwright creates an isolated browser context for each test; the shared fixture navigates and removes the application's sample todos through the UI.
2. Tests target `http://localhost:8080` by default. The `TODO_BASE_URL` environment variable overrides this for Docker or remote environments.
3. The filtering mechanism uses URL hashes (`#/`, `#/active`, `#/completed`). This means filter state survives reload without additional persistence logic.

---

## Test data strategy

- All test data is **generated inline** within each test (no external fixtures or seed files needed because `localStorage` is trivially writable).
- **Preconditions are seeded, behaviour is driven through the UI.** `todoPage.seedTodos()` writes stored todos directly and reloads, so a test that needs "three todos with two completed" gets there in one step instead of five clicks. Interactions that are the subject of a test — adding, toggling, editing, deleting — are always performed through the UI.
- The shared fixture starts each test from an empty list, without changing unrelated storage keys or installing persistent initialization scripts. Specs that seed all of their own data opt out with `test.use({ todoStart: 'as-is' })`, since the cleanup would be discarded a moment later.
- **The application cannot be made to start empty.** It reseeds two sample todos whenever stored data is empty (`app/assets/js/todo/app.js`), and its `Store` initialises a missing key to `[]`. Seeding at least one item is what suppresses the samples; a genuinely empty list still requires deleting through the UI. `seedTodos([])` throws rather than appearing to work. See [issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4).
- Persistence tests deliberately keep adding through the UI and call `reload()`, because seeding would reduce them to asserting that `localStorage` survives a reload.
- No shared state between tests: every test is self-contained and order-independent.

---

## Reporting decision

**Allure** was chosen over Playwright's built-in HTML reporter for the following reasons:

| Requirement | How Allure addresses it |
|-------------|------------------------|
| Test steps easy to understand | `test.step()` calls are rendered as a collapsible tree |
| Failure evidence | Screenshots and videos are attached inline to the failed step |
| Execution history | History is preserved across CI runs via the `allure-results/history/` folder |
| Trends over time | Built-in graphs: pass rate, duration, failure rate per run |
| Available from CI | Report is deployed to **GitHub Pages** on every push to `main` |

Published report: https://darkonaumovski.github.io/senior-qa-automation-playwright/allure-report/

Allure `issue()` ids are linked to this repository's issue tracker via
`links.issue.urlTemplate` in `playwright.config.ts`, so a test that pins a known
defect links straight to it from the report. Each run also records the pinned
`APP_COMMIT` in its environment panel, so a historical result can be attributed
to a specific revision of the application under test.

The `allure-results/categories.json` file categorises failures into:
- **Infrastructure problems** – timeouts / network errors (likely flaky tests)
- **Product defects** – assertion mismatches (app behaviour differs from expectation)
- **Test defects** – other failures (test code issues)

---

## What I would improve with more time

1. **Cross-browser matrix** – add WebKit / Safari and test on mobile viewports.
2. **Accessibility audit** – integrate `axe-playwright` and add a dedicated `a11y.spec.ts`.
3. **Visual regression** – add `@playwright/test` snapshot tests or Chromatic/Percy for CSS drift detection.
4. **Negative-path API tests** – if the app ever adds a backend, test malformed requests.
5. **Parallel sharding** – split tests into shards using Playwright's `--shard` flag for large suites in CI.
6. **Contract tests** – verify that `localStorage` schema changes don't silently break persistence.
7. **Chase down the Firefox-on-Windows instability properly** – it is currently worked around and documented as an environment problem, on the evidence that isolated re-runs pass consistently and Linux CI has never reproduced it. That is a reasonable inference, not a diagnosis, and the honest next step is to confirm it rather than keep the workaround indefinitely.
8. **Add a regression test with the fix for [issue #7](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7)** – the invalid-hash defect is reported but not automated, because a failing test in a green suite obscures a defect rather than documenting it. The test belongs in `filter.spec.ts`, which currently exercises only the three valid hashes.
9. **Broaden the routing and bulk-action coverage** – adding a todo while a filter is active, the toggle-all checkbox's own checked state, and unknown hash routes are all untested. The first two are ordinary gaps; the third is what hid issue #7.
10. **Decouple `seedTodos()` from the storage schema** – it hard-codes the `todos-vanillajs` key and the record shape, which is exactly the coupling [issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4) asks the application to remove. If the app ever exposes a test hook, this helper should move behind it.
