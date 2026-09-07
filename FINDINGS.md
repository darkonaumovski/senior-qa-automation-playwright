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
**Status**: Open (product side) — filed as [issue #4](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/4); full write-up in `GITHUB_ISSUE_1.md`. PR #5 shipped the harness-side mitigation (`seedTodos()`) and its `Closes #4` reference auto-closed the issue on merge, which was wrong: the request is for the *application* to support setting and clearing state, and that is unresolved. The issue has been reopened so the tracker agrees with this document.

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

## Finding #2 — An unrecognised filter hash silently kills the view while writes keep succeeding

**Severity**: Medium
**Type**: Functional defect (unhandled error, silent UI/data desync)
**Affected feature**: Filter routing
**Status**: Open — filed as [issue #7](https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7)

### Description

The router takes the hash segment as a method name with no allowlist. `Controller.setView`
reads `locationHash.split('/')[1]` (`controller.js:63`) and passes it through
`_updateFilterState` to `_filter`, which capitalises it and dispatches
(`controller.js:255,264`):

```javascript
let activeRoute = this._activeRoute.charAt(0).toUpperCase() + this._activeRoute.substr(1)
// …
this[`show${activeRoute}`]()
```

For `#/garbage` that resolves to `this.showGarbage`, which does not exist, so the call throws
`TypeError`. `setView` is bound to `hashchange`, so a user typing or following a bad URL
reaches it.

The damage is not the exception — it is what the page looks like afterwards. **Nothing appears
broken.** The list still shows its rows, the counter still reads correctly, and a filter link is
still highlighted, because `_updateCount()` runs before the throw. But the render path is dead:
subsequent writes persist and are never displayed.

### Steps to reproduce

1. Open `/todo` with two todos present.
2. Set the URL hash to `#/garbage`.
3. Add a todo through the input.

**Expected**: either the unknown route is ignored and the All view is shown, or it is handled
visibly. Either way, an added todo appears.

**Actual**: the console shows `TypeError: this[`show${activeRoute}`] is not a function`
(Chromium renders this as `this[activeRoute] is not a function`), and the added todo is written
to `localStorage` but never rendered. A user sees their entry vanish while it is in fact saved.

### How this was confirmed

Executed against the pinned application (`a89cccc`) in Chromium, capturing `pageerror`:

```
before: {"rows":2,"count":"2 items left","stored":2}
after:  {"rows":2,"count":"2 items left","selectedFilter":1}
pageerrors: [ 'this[activeRoute] is not a function' ]
after adding a todo -> rows rendered: 2
after adding a todo -> stored records: 3
```

Three records stored, two rendered: the desync is real, not inferred from reading the source.

### Suggested improvement

Validate the route against the three known values in `setView` and fall back to `All`, rather
than trusting the hash to name a method.

**Scope note**: not yet automated. `tests/todo/filter.spec.ts` covers only the three valid
hashes; a regression test belongs with the fix, and adding a failing test to a green suite would
obscure rather than document the defect.

---

## Finding #3 — Todo identifiers are generated from a millisecond clock, so they are not guaranteed unique

**Severity**: Low (latent; not reachable through the UI)
**Type**: Robustness defect
**Affected feature**: Persistence and item identity

### Description

`Store.prototype.save` assigns identifiers from the clock (`store.js:103`):

```javascript
updateData.id = new Date().getTime()
```

Two records created within the same millisecond therefore share an id. Both `save(id)` and
`remove(id)` scan for the first match and `break` (`store.js:90-96,120-125`), so once two
records collide, an edit or delete aimed at the second one silently hits the first.

### How this was confirmed, and what was *not* confirmed

The consequence is real. Seeding two records with the same id and clicking the toggle on the
**second** row marked the **first** row complete:

```json
[ { "id": 111, "title": "FIRST row",  "completed": true  },
  { "id": 111, "title": "SECOND row", "completed": false } ]
```

**The trigger did not reproduce through the UI.** Adding 40 todos as fast as Playwright can
drive the input produced 42 records with 42 distinct ids, because a single add costs well over a
millisecond. This is therefore reported as a latent robustness defect and explicitly **not** as
a user-facing bug: reaching it requires creating records faster than one per millisecond, which
means a bulk import, a restore-from-backup, or programmatic seeding rather than typing.

Recorded this way deliberately. The consequence is demonstrated and the trigger is not, and
saying so is the difference between this finding and the withdrawn one below.

### Suggested improvement

Derive ids from a counter or a random component rather than the clock alone, and make the
lookups in `save`/`remove` reject a duplicate id instead of taking the first match.

---

## Finding #4 — No way to reorder todos

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
