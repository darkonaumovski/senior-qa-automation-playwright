# Quality Findings – ToDo Application

Every finding below was verified twice: against the application source and against an
executed assertion. Where a finding was withdrawn, the withdrawal is recorded rather than
deleted, so reviewers can see what was checked.

Application under test: [cypress-example-kitchensink](https://github.com/cypress-io/cypress-example-kitchensink),
`app/assets/js/todo/`.

---

## Finding #1 — Persistence is localStorage-only, which also limits test isolation

**Severity**: Low
**Type**: Architecture observation and testability concern
**Affected feature**: Persistence
**Status**: Open — see `GITHUB_ISSUE_1.md`

### Description

Todos are stored exclusively in `localStorage` under the key `todos-vanillajs`
(`app/assets/js/todo/store.js`). Consequently:

1. A different browser, an incognito window, or a second device shows an empty list.
2. Clearing browser data deletes all todos irrecoverably.
3. There is no way to share, export, or back up a list.

For a demo application this is a reasonable design, but it is worth stating plainly for anyone
assessing the app for real use.

### Testability concern

With no backend there is no seeding or teardown hook, so automated tests must drive state
through the browser. Two consequences shape this suite:

- Reset happens through the UI. `pages/TodoPage.ts` `clearTodos()` deletes items one at a time
  via the destroy button, which costs several actions per test and couples setup to the
  hover-to-reveal delete affordance. A storage-level or API-level reset would be cheaper and
  would not depend on the behaviour under test.
- "Empty" is not a state the application holds. It reseeds two sample todos
  (`Pay electric bill`, `Walk the dog`) whenever it loads with an empty list, so every test
  must clear them before asserting anything about an empty list.

### How this was confirmed

- Source: `store.js` reads and writes only `localStorage`; no network calls exist in `app/assets/js/todo/`.
- Automated coverage: `tests/todo/persistence.spec.ts` pins reload behaviour, and
  `tests/todo/lifecycle.spec.ts` pins the reseeding behaviour so it cannot change silently.

### Suggested improvement

Expose a documented way to set and clear state for testing — even a small
`window.__todoTestApi` shim, or honouring a query parameter that suppresses the sample data.

---

## Finding #2 — No way to reorder todos

**Severity**: Low
**Type**: Missing capability
**Affected feature**: Todo list ordering

### Description

Items always render in creation order and the UI provides no affordance to change it: no drag
handle, no move controls, no sort. A user who wants to reprioritise must delete and re-add
items in the desired order.

This is a product observation, not a specification violation. The
[TodoMVC app specification](https://github.com/tastejs/todomvc/blob/master/app-spec.md) does not
require reordering, so the app is not out of compliance; the gap is only worth raising with a
product owner if prioritisation matters to the intended users.

**Scope note**: not automated, because there is no control to drive.

---

## Withdrawn — New todo titles are stored untrimmed

**Status**: Withdrawn as invalid on verification. Not a defect.

An earlier revision of this document and of `GITHUB_ISSUE_1.md` reported that adding a todo with
leading or trailing whitespace stored the padded title. That report was based on reading
`Controller.prototype.addItem`, which does use `title.trim()` only for its emptiness guard and
then forwards the original `title`:

```javascript
if (title.trim() === '') { return }
self.model.create(title, /* … */)
```

The analysis stopped one layer too early. `Model.prototype.create` trims before persisting
(`app/assets/js/todo/model.js:32`):

```javascript
let newItem = {
  title: title.trim(),
  completed: false,
}
```

The application therefore stores `Buy milk` for input `  Buy milk  `, which is the correct
TodoMVC behaviour. This was confirmed by executing an exact-match assertion on both the
rendered label and the stored record; see the trim test in `tests/todo/add.spec.ts`, which
asserts the trimmed value with `expectExactTodoText()` and `storedTitles()` rather than with
Playwright's `toHaveText` (which normalizes whitespace and so cannot tell the two apart).

A related claim, that whitespace-only input is accepted and counted, was also withdrawn: the
`title.trim() === ''` guard rejects it, and `tests/todo/add.spec.ts` asserts that nothing is
added and nothing is stored.

**Lesson recorded deliberately**: a defect report that cites a root cause must be traced through
every layer that touches the value, and confirmed with an assertion that would actually fail if
the defect were real.
