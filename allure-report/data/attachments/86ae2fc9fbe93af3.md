# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: todo/add.spec.ts >> Add todo >> known product defect: consecutive identical Enter submissions create distinct records
- Location: tests/todo/add.spec.ts:116:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 1

  Object {
-   "input": "",
+   "input": "Repeated title",
    "rendered": Array [
-     "Repeated title",
      "Repeated title",
    ],
  }
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "cypress.io" [ref=e5] [cursor=pointer]:
        - /url: /
      - generic [ref=e6]:
        - list [ref=e7]:
          - listitem [ref=e8]:
            - button "Commands" [ref=e9] [cursor=pointer]
          - listitem [ref=e11]:
            - link "Utilities" [ref=e12] [cursor=pointer]:
              - /url: /utilities
          - listitem [ref=e13]:
            - link "Cypress API" [ref=e14] [cursor=pointer]:
              - /url: /cypress-api
        - list [ref=e15]:
          - listitem [ref=e16]:
            - link "GitHub" [ref=e17] [cursor=pointer]:
              - /url: https://github.com/cypress-io/cypress-example-kitchensink
  - generic [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - heading "todos" [level=1] [ref=e21]
        - textbox "What needs to be done?" [active] [ref=e22]: Repeated title
      - generic [ref=e23]:
        - checkbox "›Mark all as complete" [ref=e24]
        - generic [ref=e25]: ›Mark all as complete
        - list [ref=e26]:
          - listitem [ref=e27]:
            - generic [ref=e28]:
              - checkbox [ref=e29]
              - generic [ref=e30]: Repeated title
              - text: ×
      - generic [ref=e31]:
        - generic [ref=e32]:
          - strong [ref=e33]: "1"
          - text: item left
        - list [ref=e34]:
          - listitem [ref=e35]:
            - link "All" [ref=e36] [cursor=pointer]:
              - /url: "#/"
          - listitem [ref=e37]:
            - link "Active" [ref=e38] [cursor=pointer]:
              - /url: "#/active"
          - listitem [ref=e39]:
            - link "Completed" [ref=e40] [cursor=pointer]:
              - /url: "#/completed"
    - generic [ref=e41]:
      - paragraph [ref=e42]: Double-click to edit a todo
      - paragraph [ref=e43]:
        - text: Forked from
        - link "TodoMVC" [ref=e44] [cursor=pointer]:
          - /url: http://todomvc.com
```

# Test source

```ts
  35  |     await test.step('Verify all todos appear', async () => {
  36  |       await todoPage.expectTodoCount(3);
  37  |       for (let i = 0; i < items.length; i++) {
  38  |         await todoPage.expectTodoText(i, items[i]);
  39  |       }
  40  |     });
  41  | 
  42  |     await test.step('Verify footer count', async () => {
  43  |       await todoPage.expectItemCountText('3 items left');
  44  |     });
  45  |   });
  46  | 
  47  |   test('should not add an empty todo when Enter is pressed on blank input', async ({ todoPage }) => {
  48  |     await allure.story('Empty input validation');
  49  | 
  50  |     await test.step('Press Enter without typing', async () => {
  51  |       await todoPage.newTodoInput.press('Enter');
  52  |     });
  53  | 
  54  |     await test.step('Verify list remains empty', async () => {
  55  |       await todoPage.expectTodoCount(0);
  56  |       await todoPage.expectFooterHidden();
  57  |     });
  58  |   });
  59  | 
  60  |   test('should not add a todo containing only whitespace', async ({ todoPage }) => {
  61  |     await allure.story('Whitespace input validation');
  62  | 
  63  |     await test.step('Type only spaces and press Enter', async () => {
  64  |       await todoPage.addTodo('   ');
  65  |     });
  66  | 
  67  |     await test.step('Verify no todo was added or stored', async () => {
  68  |       await todoPage.expectTodoCount(0);
  69  |       expect(await todoPage.storedTitles()).toEqual([]);
  70  |     });
  71  |   });
  72  | 
  73  |   test('should trim leading and trailing whitespace from todo text', async ({ todoPage }) => {
  74  |     await allure.story('Whitespace trimming');
  75  | 
  76  |     await test.step('Add todo with surrounding whitespace', async () => {
  77  |       await todoPage.addTodo('  Buy milk  ');
  78  |     });
  79  | 
  80  |     await test.step('Verify text is saved trimmed in the DOM and in storage', async () => {
  81  |       await todoPage.expectTodoCount(1);
  82  |       // Asserted exactly rather than with toHaveText, which normalizes whitespace
  83  |       // and would pass even if the title were stored padded. Model.create() trims.
  84  |       await todoPage.expectExactTodoText(0, 'Buy milk');
  85  |       expect(await todoPage.storedTitles()).toEqual(['Buy milk']);
  86  |     });
  87  |   });
  88  | 
  89  |   test('should handle special characters in todo text', async ({ todoPage }) => {
  90  |     await allure.story('Special characters');
  91  | 
  92  |     const specialText = 'Buy <milk> & "bread" for $5';
  93  | 
  94  |     await test.step('Add a todo with special characters', async () => {
  95  |       await todoPage.addTodo(specialText);
  96  |     });
  97  | 
  98  |     await test.step('Verify text is rendered safely as plain text', async () => {
  99  |       await todoPage.expectTodoCount(1);
  100 |       await todoPage.expectTodoText(0, specialText);
  101 |     });
  102 |   });
  103 | 
  104 |   test('should clear input field after adding a todo', async ({ todoPage }) => {
  105 |     await allure.story('Input cleared after submit');
  106 | 
  107 |     await test.step('Add a todo', async () => {
  108 |       await todoPage.addTodo('Learn Playwright');
  109 |     });
  110 | 
  111 |     await test.step('Verify input is empty', async () => {
  112 |       await expect(todoPage.newTodoInput).toHaveValue('');
  113 |     });
  114 |   });
  115 | 
  116 |   test('known product defect: consecutive identical Enter submissions create distinct records', async ({ todoPage, page, browserName }, testInfo) => {
  117 |     const title = 'Repeated title';
  118 |     await todoPage.newTodoInput.pressSequentially(title);
  119 |     await todoPage.newTodoInput.press('Enter');
  120 |     await todoPage.expectTodoCount(1);
  121 |     await todoPage.expectTodoText(0, title);
  122 |     await expect(todoPage.newTodoInput).toHaveValue('');
  123 |     await todoPage.newTodoInput.pressSequentially(title);
  124 |     await todoPage.newTodoInput.press('Enter');
  125 |     const rendered = await todoPage.todoItems.locator('label').allTextContents();
  126 |     const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as Array<{ id: number; title: string; completed: boolean }>, TODO_STORAGE_KEY);
  127 |     // Inconsistent rendering, colliding IDs and unexpected completion fail normally.
  128 |     expect(saved.map((todo) => todo.title)).toEqual(rendered);
  129 |     expect(new Set(saved.map((todo) => todo.id)).size).toBe(saved.length);
  130 |     expect(saved.every((todo) => !todo.completed)).toBe(true);
  131 |     const input = await todoPage.newTodoInput.inputValue();
  132 |     await testInfo.attach('repeated-enter-evidence', { body: JSON.stringify({ rendered, saved, input }, null, 2), contentType: 'application/json' });
  133 |     test.fail(browserName === 'firefox' && hasReviewedDefects(testInfo.config.metadata.appCommit),
  134 |       'UPSTREAM-FIREFOX-REPEATED-ENTER: the change handler does not create the second identical submission');
> 135 |     expect({ rendered, input }).toEqual({ rendered: [title, title], input: '' });
      |                                 ^ Error: expect(received).toEqual(expected) // deep equality
  136 |   });
  137 | });
  138 | 
```