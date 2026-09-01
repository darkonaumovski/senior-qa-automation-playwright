# [Bug] Todo with leading/trailing whitespace is stored with spaces instead of being trimmed

**Labels**: bug, medium priority  
**Component**: Add Todo  
**Reproducible**: 100% – deterministic

---

## Summary

Typing a todo title with leading or trailing whitespace (e.g. `"  Buy milk  "`) creates a todo whose stored text retains the surrounding spaces. The TodoMVC specification explicitly requires trimming before saving.

When the user later edits the item, the edit input pre-fills with the padded value. The title also contributes to subtle rendering oddities (e.g. the text may appear indented in narrow viewports).

---

## Environment

| Detail | Value |
|--------|-------|
| Application | cypress-example-kitchensink `/todo` |
| Browser tested | Chrome 126, Firefox 127 |
| Storage | `localStorage` key `todos-vanillajs` |

---

## Steps to reproduce

1. Open `http://localhost:8080/todo`.
2. Click the `.new-todo` input field.
3. Type **`   Buy milk   `** (three leading spaces, three trailing spaces).
4. Press **Enter**.

**Expected result**: A todo with the title **"Buy milk"** is added (whitespace trimmed before saving).

**Actual result**: A todo with the title **"   Buy milk   "** (including spaces) is stored and rendered. The visible label appears to have invisible leading and trailing spaces.

---

## Root cause

In `app/assets/js/todo/controller.js`, the `addItem` method validates the input but does **not** trim before creating the record:

```javascript
Controller.prototype.addItem = function (title) {
  if (title.trim() === '') {   // ← trim used only for validation …
    return
  }
  self.model.create(title, …)  // ← … but original (un-trimmed) title is saved
}
```

The TodoMVC app specification (https://github.com/tastejs/todomvc/blob/master/app-spec.md) states:

> "New todos are trimmed of whitespace. If the resulting string is empty, the todo should not be created."

---

## Suggested fix

Pass `title.trim()` to `model.create` rather than the raw `title`:

```javascript
Controller.prototype.addItem = function (title) {
  const trimmed = title.trim()
  if (trimmed === '') return
  self.model.create(trimmed, function () { … })
}
```

---

## Impact

- **User experience**: Invisible padding in todo titles is confusing during editing.
- **Data quality**: `localStorage` accumulates todos with invisible whitespace that cannot be detected visually.
- **Counter accuracy**: A whitespace-only todo (e.g. a single space) passes the validation check and is added to the list. This inflates the "items left" counter with a non-deletable-by-inspection phantom item.

---

## Additional notes

The **edit path** (`editItemSave`) does correctly apply `title.trim()` before saving, so fixing the `addItem` path would make the two code paths consistent.

Automated regression test: `tests/todo/add.spec.ts` → _"should trim leading and trailing whitespace from todo text"_ will act as a guard once this fix is applied.
