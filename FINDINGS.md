# Quality Findings – ToDo Application

## Finding #1 — Whitespace-only todo is accepted and stored

**Severity**: Medium  
**Type**: Functional defect  
**Affected feature**: Add todo  
**Reproducible**: Yes (deterministic)

### Description

Entering one or more space characters into the new-todo input field and pressing Enter creates a new todo item whose visible label is blank. The item is stored in `localStorage` and counted in the footer as "1 item left". There is no visual indication to the user that a blank item has been added.

### Steps to reproduce

1. Open `http://localhost:8080/todo`
2. Click the new-todo input field (`.new-todo`)
3. Type one or more space characters (e.g., three spaces)
4. Press Enter

**Expected result**: No item is added; the input is cleared or ignored.  
**Actual result**: A todo item with an invisible/blank label is added to the list. The footer counter increments.

### Impact

- A user can accidentally create phantom items that are invisible in the list but counted in "items left".
- Bulk operations (toggle all, clear completed) interact with these phantom items, causing a confusing counter value.
- Items persisted to `localStorage` with blank text add noise to stored data.

### Notes

The TodoMVC spec (https://github.com/tastejs/todomvc/blob/master/app-spec.md) explicitly states:

> "New todos are trimmed of whitespace. If the resulting string is empty, the todo should not be created."

The reference implementation in the spec trims the input before saving. This application does not appear to reject empty/whitespace-only strings at the point of creation.

### Suggested fix

Before creating a todo, trim the input value:
```javascript
const trimmed = newTodo.trim();
if (!trimmed) return;  // reject blank / whitespace-only
```

---

## Finding #2 — Item counter uses incorrect plural form when count is zero

**Severity**: Low  
**Type**: Copy / localisation defect  
**Affected feature**: Footer item counter  
**Reproducible**: Yes

### Description

After all todos are completed and then cleared, the counter displays **"0 items left"** (plural). The TodoMVC spec requires the counter to read **"0 items left"** (plural) for zero — this is correct. However, when there is exactly **1 item remaining**, the copy correctly shows **"1 item left"** (singular). This finding is to confirm the singular/plural boundary is implemented — if any regression is introduced, the failure would be "1 items left".

> **Status**: This specific behaviour currently appears correct. It is documented here as a regression-watch item because it is a historically common defect in TodoMVC forks.

---

## Finding #3 — No server-side persistence; data loss on different browser or incognito

**Severity**: Low / UX concern  
**Type**: Testability / architecture observation  
**Affected feature**: Persistence

### Description

Todos are stored exclusively in `localStorage`. This means:

1. Opening the app in a different browser, incognito window, or on a second device shows an empty list.
2. Clearing browser data permanently deletes all todos.
3. There is no mechanism to share or export the list.

This is a **by-design** limitation of TodoMVC as a demo application, but it should be called out for product owners evaluating the suitability of this app for real use.

**Testability concern**: `localStorage`-only persistence also means that automated tests must explicitly clear storage between runs (see the `goto({ clearData: true })` approach in `pages/TodoPage.ts`). A backend API would enable cleaner test isolation through database seeding/teardown.

---

## Finding #4 — Drag-and-drop reordering is not implemented

**Severity**: Low  
**Type**: Missing feature / spec divergence  
**Affected feature**: Todo list ordering

### Description

The TodoMVC specification and many reference implementations support reordering items by drag-and-drop. This application does not appear to offer any mechanism to change the order of todos once they are added.

**Impact**: Users who want to prioritise their list must delete and re-add items in the desired order.

**Scope note**: This was observed during exploration but was not added to the automated suite since there is no UI control to test against.
