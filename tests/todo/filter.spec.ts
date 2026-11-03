import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';
import { TODO_STORAGE_KEY } from '../../pages/TodoPage';
import { hasReviewedDefects } from '../fixtures/knownDefects';

function isKnownRouteError(error: Error): boolean {
  const knownMessage = /this\[.*activeRoute.*\] is not a function/.test(error.message)
    || error.message === 'this[("show" + (intermediate value))] is not a function';
  return knownMessage && !!error.stack?.includes('/assets/js/todo/controller.js');
}

test('known product defect: unknown hash must fall back to All without losing writes', async ({ page }, testInfo) => {
  // Deliberately bypass TodoPage readiness and its UI cleanup in a fresh context.
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('/todo#/unknown');
  await page.locator('.new-todo').fill('Written on unknown route');
  await page.locator('.new-todo').press('Enter');
  const before = {
    selected: await page.locator('.filters a.selected').allTextContents(),
    rows: await page.locator('.todo-list li label').allTextContents(),
  };
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as Array<{ title: string; completed: boolean }>, TODO_STORAGE_KEY);
  expect(saved.filter((todo) => todo.title === 'Written on unknown route')).toHaveLength(1);
  await page.reload();
  const after = {
    selected: await page.locator('.filters a.selected').allTextContents(),
    rows: await page.locator('.todo-list li label').allTextContents(),
  };
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as unknown, TODO_STORAGE_KEY)).toEqual(saved);
  expect(errors.filter((error) => !isKnownRouteError(error))).toEqual([]);
  const messages = errors.map((error) => error.message);
  await testInfo.attach('unknown-route-evidence', { body: JSON.stringify({ before, after, saved, errors: errors.map((error) => ({ message: error.message, stack: error.stack })) }, null, 2), contentType: 'application/json' });
  await allure.issue('7', 'https://github.com/darkonaumovski/senior-qa-automation-playwright/issues/7');
  test.fail(hasReviewedDefects(testInfo.config.metadata.appCommit), 'Upstream #7: fallback to All must render writes and avoid the route exception');
  expect({ before, after, errors: messages }).toEqual({
    before: { selected: ['All'], rows: saved.map((todo) => todo.title) },
    after: { selected: ['All'], rows: saved.map((todo) => todo.title) },
    errors: [],
  });
});

test.describe('Filter todos', () => {
  // Every test here seeds its own data, so the fixture's UI cleanup would be
  // wasted work: seedTodos() overwrites stored todos regardless.
  test.use({ todoFeature: 'Filter Todos', todoStart: 'as-is' });

  for (const filter of ['active', 'completed'] as const) {
    test(`should add an active todo while the ${filter} filter is selected`, async ({ todoPage }) => {
      await todoPage.seedTodos(['Existing active', { title: 'Existing done', completed: true }]);
      await todoPage.page.goto(`/todo#/${filter}`);
      await todoPage.expectActiveFilterLink(filter);
      await todoPage.addTodo('Added under filter');
      await expect(todoPage.todoItems.locator('label')).toHaveText(
        filter === 'active' ? ['Existing active', 'Added under filter'] : ['Existing done'],
      );
      await todoPage.expectItemCountText('2 items left');
      await todoPage.filterByAll();
      await expect(todoPage.todoItems.locator('label')).toHaveText(['Existing active', 'Existing done', 'Added under filter']);
      await todoPage.expectTodoNotCompleted(2);
    });
  }

  test('should show all todos when the "All" filter is active', { tag: '@smoke' }, async ({ todoPage }) => {
    await allure.story('All filter');

    await test.step('Seed two todos with the second completed', async () => {
      await todoPage.seedTodos(['Active task', { title: 'Completed task', completed: true }]);
    });

    await test.step('Navigate to Active then back to All', async () => {
      await todoPage.filterByActive();
      await todoPage.filterByAll();
    });

    await test.step('Verify all todos are shown', async () => {
      await todoPage.expectTodoCount(2);
    });

    await test.step('Verify "All" filter link is marked selected', async () => {
      await todoPage.expectActiveFilterLink('all');
    });
  });

  test('should show only active (incomplete) todos when "Active" filter is selected', { tag: '@smoke' }, async ({ todoPage }) => {
    await allure.story('Active filter');

    await test.step('Seed three todos with the third completed', async () => {
      await todoPage.seedTodos(['Active 1', 'Active 2', { title: 'Completed', completed: true }]);
    });

    await test.step('Switch to Active filter', async () => {
      await todoPage.filterByActive();
    });

    await test.step('Verify only active todos are visible', async () => {
      await todoPage.expectTodoCount(2);
      await todoPage.expectTodoText(0, 'Active 1');
      await todoPage.expectTodoText(1, 'Active 2');
    });

    await test.step('Verify "Active" filter is marked selected', async () => {
      await todoPage.expectActiveFilterLink('active');
    });
  });

  test('should show only completed todos when "Completed" filter is selected', { tag: '@smoke' }, async ({ todoPage }) => {
    await allure.story('Completed filter');

    await test.step('Seed three todos with the first two completed', async () => {
      await todoPage.seedTodos([
        { title: 'Done 1', completed: true },
        { title: 'Done 2', completed: true },
        'Active',
      ]);
    });

    await test.step('Switch to Completed filter', async () => {
      await todoPage.filterByCompleted();
    });

    await test.step('Verify only completed todos are visible', async () => {
      await todoPage.expectTodoCount(2);
      await todoPage.expectTodoText(0, 'Done 1');
      await todoPage.expectTodoText(1, 'Done 2');
    });

    await test.step('Verify "Completed" filter is marked selected', async () => {
      await todoPage.expectActiveFilterLink('completed');
    });
  });

  test('should update the Active view in real-time when a visible todo is completed', async ({ todoPage }) => {
    await allure.story('Real-time active filter update');

    await test.step('Seed two active todos', async () => {
      await todoPage.seedTodos(['Task A', 'Task B']);
    });

    await test.step('Switch to Active filter', async () => {
      await todoPage.filterByActive();
    });

    await test.step('Complete one visible todo', async () => {
      await todoPage.toggleTodo(0);
    });

    await test.step('Verify only the remaining active todo is shown', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, 'Task B');
    });
  });

  test('should reflect the selected filter in the URL hash', { tag: '@smoke' }, async ({ todoPage, page }) => {
    await allure.story('URL hash routing');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Sample']);
    });

    await test.step('Navigate to Active and verify URL', async () => {
      await todoPage.filterByActive();
      await expect(page).toHaveURL(/#\/active$/);
    });

    await test.step('Navigate to Completed and verify URL', async () => {
      await todoPage.filterByCompleted();
      await expect(page).toHaveURL(/#\/completed$/);
    });

    await test.step('Navigate to All and verify URL', async () => {
      await todoPage.filterByAll();
      await expect(page).toHaveURL(/#\/$/);
    });
  });

  test('should show zero todos in Active filter when all are completed', async ({ todoPage }) => {
    await allure.story('Empty active filter');

    await test.step('Seed two completed todos', async () => {
      await todoPage.seedTodos([
        { title: 'Task 1', completed: true },
        { title: 'Task 2', completed: true },
      ]);
    });

    await test.step('Switch to Active filter', async () => {
      await todoPage.filterByActive();
    });

    await test.step('Verify no todos are shown', async () => {
      await todoPage.expectTodoCount(0);
    });
  });

  test('should show zero todos in Completed filter when none are completed', async ({ todoPage }) => {
    await allure.story('Empty completed filter');

    await test.step('Seed active todos only', async () => {
      await todoPage.seedTodos(['Task 1', 'Task 2']);
    });

    await test.step('Switch to Completed filter', async () => {
      await todoPage.filterByCompleted();
    });

    await test.step('Verify no todos are shown', async () => {
      await todoPage.expectTodoCount(0);
    });
  });
});
