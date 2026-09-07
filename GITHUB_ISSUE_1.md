# [Testability] No supported way to set or clear todo state, and the app reseeds sample todos

**Labels**: testability, enhancement, low priority
**Component**: Todo persistence (`app/assets/js/todo/store.js`, `model.js`)
**Reproducible**: 100% – deterministic

---

## Summary

The ToDo application keeps all state in `localStorage` and offers no supported hook for setting
or clearing that state. It also reseeds two sample todos whenever it loads with an empty list.
Together these mean every automated test has to reach into browser internals or drive the UI
just to reach a known starting state, which makes suites slower and couples test setup to the
very behaviour under test.

---

## Environment

| Detail | Value |
|--------|-------|
| Application | cypress-example-kitchensink `/todo` |
| Browsers verified | Chromium 143, Firefox (both via Playwright 1.62.1) |
| Storage | `localStorage`, key `todos-vanillajs` |
| Relevant source | `app/assets/js/todo/store.js`, `app/assets/js/todo/model.js` |

---

## Steps to reproduce

1. Open `http://localhost:8080/todo` in a clean browser profile.
2. Observe that two todos already exist: **Pay electric bill** and **Walk the dog**.
3. Delete both so the list is empty.
4. Reload the page.

**Expected result**: the list stays empty, or there is a documented way to start empty.
**Actual result**: the two sample todos are recreated. An empty list is not a state the
application will hold.

---

## Why this matters for testing

An automated suite needs a known starting state per test. With no seeding hook, the options are:

1. **Drive the UI** — delete every item through the destroy button. This is what this suite does
   (`pages/TodoPage.ts` `clearTodos()`). It is honest but costs several actions per test, and it
   makes setup depend on hover-to-reveal delete behaviour, so a regression in delete breaks
   every unrelated test's setup.
2. **Write `localStorage` directly** — faster, but it hard-codes the storage key and the record
   schema into the tests, so an internal storage change silently breaks the suite.
3. **Install an init script** — reliable, but it persists across navigations and leaks into
   assertions about the app's own seeding behaviour.

All three trade correctness against cost. A supported hook would remove the trade-off.

---

## Suggested improvement

Any one of these would be sufficient:

- Honour a query parameter such as `/todo?seed=none` that skips the sample data.
- Expose a small documented test surface, for example `window.__todoTestApi.reset()`.
- Document the storage key and record schema as a stable contract, so option 2 above becomes a
  supported integration point rather than a guess.

---

## Impact

- **Test cost**: every test pays a multi-action reset before it can assert anything.
- **Test coupling**: setup depends on the delete affordance, so one UI regression cascades into
  unrelated failures.
- **Product**: unrelated to testing, users on a second browser or after clearing site data see
  an empty list with no export or backup path. Worth a product decision, not just a test one.

---

## Automated coverage

- `tests/todo/lifecycle.spec.ts` pins the reseeding behaviour and asserts that cleanup leaves
  unrelated `localStorage` keys untouched and installs no persistent init script.
- `tests/todo/persistence.spec.ts` covers reload persistence of items, completion state and the
  selected filter.
