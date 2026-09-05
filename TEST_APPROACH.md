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
- Whitespace-only input is rejected (see Findings)
- Leading/trailing whitespace is trimmed on save
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

**Out of scope**
- All other pages of the kitchensink application (they are Cypress demo pages, not the product under evaluation)
- Performance / load testing
- Visual regression / pixel comparison
- Accessibility (WCAG audit) – worth adding with more time
- Mobile viewport tests – the TodoMVC CSS is desktop-only by design

---

## Assumptions

1. The application stores state in `localStorage`. Playwright creates an isolated browser context for each test; the shared fixture navigates and removes the application's sample todos through the UI.
2. Tests target `http://localhost:8080` by default. The `TODO_BASE_URL` environment variable overrides this for Docker or remote environments.
3. The filtering mechanism uses URL hashes (`#/`, `#/active`, `#/completed`). This means filter state survives reload without additional persistence logic.

---

## Test data strategy

- All test data is **generated inline** within each test (no external fixtures or seed files needed because `localStorage` is trivially writable).
- The shared fixture calls `goto()` once per test, giving a clean todo list without changing unrelated storage keys or installing persistent initialization scripts.
- Persistence tests use the same fixture and call `reload()` to preserve storage and the selected filter after setup.
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

The report URL will be: `https://<owner>.github.io/<repo>/allure-report/`

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
5. **Allure GitHub Pages history URL** – link the badge in the README once the first CI run completes.
6. **Parallel sharding** – split tests into shards using Playwright's `--shard` flag for large suites in CI.
7. **Contract tests** – verify that `localStorage` schema changes don't silently break persistence.
