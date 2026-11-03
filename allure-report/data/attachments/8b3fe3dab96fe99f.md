# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: todo/filter.spec.ts >> known product defect: unknown hash must fall back to All without losing writes
- Location: tests/todo/filter.spec.ts:12:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 7
+ Received  + 7

  Object {
    "after": Object {
-     "rows": Array [
-       "Written on unknown route",
-     ],
+     "rows": Array [],
      "selected": Array [
        "All",
      ],
    },
    "before": Object {
-     "rows": Array [
-       "Written on unknown route",
-     ],
+     "rows": Array [],
      "selected": Array [
        "All",
      ],
    },
-   "errors": Array [],
+   "errors": Array [
+     "this[(\"show\" + (intermediate value))] is not a function",
+     "this[(\"show\" + (intermediate value))] is not a function",
+     "this[(\"show\" + (intermediate value))] is not a function",
+   ],
  }
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - navigation [ref=f1e2]:
    - generic [ref=f1e3]:
      - link "cypress.io" [ref=f1e5] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e6]:
        - list [ref=f1e7]:
          - listitem [ref=f1e8]:
            - button "Commands" [ref=f1e9] [cursor=pointer]
          - listitem [ref=f1e11]:
            - link "Utilities" [ref=f1e12] [cursor=pointer]:
              - /url: /utilities
          - listitem [ref=f1e13]:
            - link "Cypress API" [ref=f1e14] [cursor=pointer]:
              - /url: /cypress-api
        - list [ref=f1e15]:
          - listitem [ref=f1e16]:
            - link "GitHub" [ref=f1e17] [cursor=pointer]:
              - /url: https://github.com/cypress-io/cypress-example-kitchensink
  - generic [ref=f1e18]:
    - generic [ref=f1e19]:
      - generic [ref=f1e20]:
        - heading "todos" [level=1] [ref=f1e21]
        - textbox "What needs to be done?" [active] [ref=f1e22]
      - generic [ref=f1e23]:
        - checkbox "›Mark all as complete" [ref=f1e24]
        - generic [ref=f1e25]: ›Mark all as complete
        - list
      - generic [ref=f1e26]:
        - generic [ref=f1e27]:
          - strong [ref=f1e28]: "1"
          - text: item left
        - list [ref=f1e29]:
          - listitem [ref=f1e30]:
            - link "All" [ref=f1e31] [cursor=pointer]:
              - /url: "#/"
          - listitem [ref=f1e32]:
            - link "Active" [ref=f1e33] [cursor=pointer]:
              - /url: "#/active"
          - listitem [ref=f1e34]:
            - link "Completed" [ref=f1e35] [cursor=pointer]:
              - /url: "#/completed"
    - generic [ref=f1e36]:
      - paragraph [ref=f1e37]: Double-click to edit a todo
      - paragraph [ref=f1e38]:
        - text: Forked from
        - link "TodoMVC" [ref=f1e39] [cursor=pointer]:
          - /url: http://todomvc.com
```

# Test source

```ts
  1   | import { test, expect } from '../fixtures/todoFixtures';
  2   | import { allure } from 'allure-playwright';
  3   | import { TODO_STORAGE_KEY } from '../../pages/TodoPage';
  4   | import { hasReviewedDefects } from '../fixtures/knownDefects';
  5   | 
  6   | function isKnownRouteError(error: Error): boolean {
  7   |   const knownMessage = /this\[.*activeRoute.*\] is not a function/.test(error.message)
  8   |     || error.message === 'this[("show" + (intermediate value))] is not a function';
  9   |   return knownMessage && !!error.stack?.includes('/assets/js/todo/controller.js');
  10  | }
  11  | 
  12  | test('known product defect: unknown hash must fall back to All without losing writes', async ({ page }, testInfo) => {
  13  |   // Deliberately bypass TodoPage readiness and its UI cleanup in a fresh context.
  14  |   const errors: Error[] = [];
  15  |   page.on('pageerror', (error) => errors.push(error));
  16  |   await page.goto('/todo#/unknown');
  17  |   await page.locator('.new-todo').fill('Written on unknown route');
  18  |   await page.locator('.new-todo').press('Enter');
  19  |   const before = {
  20  |     selected: await page.locator('.filters a.selected').allTextContents(),
  21  |     rows: await page.locator('.todo-list li label').allTextContents(),
  22  |   };
  23  |   const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as Array<{ title: string; completed: boolean }>, TODO_STORAGE_KEY);
  24  |   expect(saved.filter((todo) => todo.title === 'Written on unknown route')).toHaveLength(1);
  25  |   await page.reload();
  26  |   const after = {
  27  |     selected: await page.locator('.filters a.selected').allTextContents(),
  28  |     rows: await page.locator('.todo-list li label').allTextContents(),
  29  |   };
  30  |   expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as unknown, TODO_STORAGE_KEY)).toEqual(saved);
  31  |   expect(errors.filter((error) => !isKnownRouteError(error))).toEqual([]);
  32  |   const messages = errors.map((error) => error.message);
  33  |   await testInfo.attach('unknown-route-evidence', { body: JSON.stringify({ before, after, saved, errors: errors.map((error) => ({ message: error.message, stack: error.stack })) }, null, 2), contentType: 'application/json' });
  34  |   await allure.issue('7', 'https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7');
  35  |   test.fail(hasReviewedDefects(testInfo.config.metadata.appCommit), 'Upstream #7: fallback to All must render writes and avoid the route exception');
> 36  |   expect({ before, after, errors: messages }).toEqual({
      |                                               ^ Error: expect(received).toEqual(expected) // deep equality
  37  |     before: { selected: ['All'], rows: saved.map((todo) => todo.title) },
  38  |     after: { selected: ['All'], rows: saved.map((todo) => todo.title) },
  39  |     errors: [],
  40  |   });
  41  | });
  42  | 
  43  | test.describe('Filter todos', () => {
  44  |   // Every test here seeds its own data, so the fixture's UI cleanup would be
  45  |   // wasted work: seedTodos() overwrites stored todos regardless.
  46  |   test.use({ todoFeature: 'Filter Todos', todoStart: 'as-is' });
  47  | 
  48  |   for (const filter of ['active', 'completed'] as const) {
  49  |     test(`should add an active todo while the ${filter} filter is selected`, async ({ todoPage }) => {
  50  |       await todoPage.seedTodos(['Existing active', { title: 'Existing done', completed: true }]);
  51  |       await todoPage.page.goto(`/todo#/${filter}`);
  52  |       await todoPage.expectActiveFilterLink(filter);
  53  |       await todoPage.addTodo('Added under filter');
  54  |       await expect(todoPage.todoItems.locator('label')).toHaveText(
  55  |         filter === 'active' ? ['Existing active', 'Added under filter'] : ['Existing done'],
  56  |       );
  57  |       await todoPage.expectItemCountText('2 items left');
  58  |       await todoPage.filterByAll();
  59  |       await expect(todoPage.todoItems.locator('label')).toHaveText(['Existing active', 'Existing done', 'Added under filter']);
  60  |       await todoPage.expectTodoNotCompleted(2);
  61  |     });
  62  |   }
  63  | 
  64  |   test('should show all todos when the "All" filter is active', { tag: '@smoke' }, async ({ todoPage }) => {
  65  |     await allure.story('All filter');
  66  | 
  67  |     await test.step('Seed two todos with the second completed', async () => {
  68  |       await todoPage.seedTodos(['Active task', { title: 'Completed task', completed: true }]);
  69  |     });
  70  | 
  71  |     await test.step('Navigate to Active then back to All', async () => {
  72  |       await todoPage.filterByActive();
  73  |       await todoPage.filterByAll();
  74  |     });
  75  | 
  76  |     await test.step('Verify all todos are shown', async () => {
  77  |       await todoPage.expectTodoCount(2);
  78  |     });
  79  | 
  80  |     await test.step('Verify "All" filter link is marked selected', async () => {
  81  |       await todoPage.expectActiveFilterLink('all');
  82  |     });
  83  |   });
  84  | 
  85  |   test('should show only active (incomplete) todos when "Active" filter is selected', { tag: '@smoke' }, async ({ todoPage }) => {
  86  |     await allure.story('Active filter');
  87  | 
  88  |     await test.step('Seed three todos with the third completed', async () => {
  89  |       await todoPage.seedTodos(['Active 1', 'Active 2', { title: 'Completed', completed: true }]);
  90  |     });
  91  | 
  92  |     await test.step('Switch to Active filter', async () => {
  93  |       await todoPage.filterByActive();
  94  |     });
  95  | 
  96  |     await test.step('Verify only active todos are visible', async () => {
  97  |       await todoPage.expectTodoCount(2);
  98  |       await todoPage.expectTodoText(0, 'Active 1');
  99  |       await todoPage.expectTodoText(1, 'Active 2');
  100 |     });
  101 | 
  102 |     await test.step('Verify "Active" filter is marked selected', async () => {
  103 |       await todoPage.expectActiveFilterLink('active');
  104 |     });
  105 |   });
  106 | 
  107 |   test('should show only completed todos when "Completed" filter is selected', { tag: '@smoke' }, async ({ todoPage }) => {
  108 |     await allure.story('Completed filter');
  109 | 
  110 |     await test.step('Seed three todos with the first two completed', async () => {
  111 |       await todoPage.seedTodos([
  112 |         { title: 'Done 1', completed: true },
  113 |         { title: 'Done 2', completed: true },
  114 |         'Active',
  115 |       ]);
  116 |     });
  117 | 
  118 |     await test.step('Switch to Completed filter', async () => {
  119 |       await todoPage.filterByCompleted();
  120 |     });
  121 | 
  122 |     await test.step('Verify only completed todos are visible', async () => {
  123 |       await todoPage.expectTodoCount(2);
  124 |       await todoPage.expectTodoText(0, 'Done 1');
  125 |       await todoPage.expectTodoText(1, 'Done 2');
  126 |     });
  127 | 
  128 |     await test.step('Verify "Completed" filter is marked selected', async () => {
  129 |       await todoPage.expectActiveFilterLink('completed');
  130 |     });
  131 |   });
  132 | 
  133 |   test('should update the Active view in real-time when a visible todo is completed', async ({ todoPage }) => {
  134 |     await allure.story('Real-time active filter update');
  135 | 
  136 |     await test.step('Seed two active todos', async () => {
```