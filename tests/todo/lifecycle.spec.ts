import { test, expect } from '../fixtures/todoFixtures';
import { TODO_STORAGE_KEY } from '../../pages/TodoPage';

test.describe('Todo page lifecycle', () => {
  test.use({ todoFeature: 'Page Lifecycle' });

  test('should preserve todos on navigation when cleanup is disabled', async ({ todoPage }) => {
    await todoPage.addTodos('Completed task', 'Active task');
    await todoPage.toggleTodo(0);

    await todoPage.goto({ clearData: false });

    await todoPage.expectTodoCount(2);
    await todoPage.expectTodoText(0, 'Completed task');
    await todoPage.expectTodoCompleted(0);
    await todoPage.expectTodoText(1, 'Active task');
    await todoPage.expectTodoNotCompleted(1);
  });

  test('should reset existing todos without clearing unrelated storage', async ({ todoPage, page }) => {
    await todoPage.addTodo('Remove on navigation');
    await page.evaluate(() => localStorage.setItem('unrelated-setting', 'keep'));

    await todoPage.goto();

    await todoPage.expectTodoCount(0);
    await todoPage.expectFooterHidden();
    expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
    await todoPage.addTodo('Fresh todo');
    await expect(todoPage.destroyButton(0)).toBeHidden();
  });

  test('should clear todos hidden by an empty filtered view', async ({ todoPage }) => {
    await todoPage.addTodos('Hidden first', 'Hidden second');
    await todoPage.filterByCompleted();
    await todoPage.expectTodoCount(0);

    await todoPage.clearTodos();

    await todoPage.expectTodoCount(0);
    await todoPage.expectFooterHidden();
    await todoPage.addTodo('Only new item');
    await todoPage.expectTodoCount(1);
    await todoPage.expectTodoText(0, 'Only new item');
  });

  test('should start from seeded data instead of the application sample todos', async ({ todoPage }) => {
    await todoPage.seedTodos(['Seeded active', { title: 'Seeded done', completed: true }]);

    await todoPage.expectTodoCount(2);
    await todoPage.expectTodoText(0, 'Seeded active');
    await todoPage.expectTodoNotCompleted(0);
    await todoPage.expectTodoText(1, 'Seeded done');
    await todoPage.expectTodoCompleted(1);
    await todoPage.expectItemCountText('1 item left');
  });

  test('should leave unrelated storage untouched when seeding', async ({ todoPage, page }) => {
    await page.evaluate(() => localStorage.setItem('unrelated-setting', 'keep'));

    await todoPage.seedTodos(['Seeded item']);

    expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
    expect(await todoPage.storedTitles()).toEqual(['Seeded item']);
  });

  for (const filter of ['active', 'completed'] as const) {
    test(`should reload mixed todos in the ${filter} view`, async ({ todoPage, page }) => {
      await todoPage.seedTodos(['Active task', { title: 'Done task', completed: true }]);
      await page.goto(`/todo#/${filter}`);

      await todoPage.reload();

      await todoPage.expectActiveFilterLink(filter);
      await todoPage.expectTodoCount(1);
      expect(await todoPage.storedTitles()).toEqual(['Active task', 'Done task']);
    });
  }

  test('should reload an empty filtered view with stored todos', async ({ todoPage }) => {
    await todoPage.seedTodos(['Active task']);
    await todoPage.filterByCompleted();

    await todoPage.reload();

    await todoPage.expectActiveFilterLink('completed');
    await todoPage.expectTodoCount(0);
    expect(await todoPage.storedTitles()).toEqual(['Active task']);
  });

  test('should seed todos while preserving a filter that hides some items', async ({ todoPage }) => {
    await todoPage.seedTodos(['Original task']);
    await todoPage.filterByCompleted();

    await todoPage.seedTodos(['New active', { title: 'New done', completed: true }]);

    await todoPage.expectActiveFilterLink('completed');
    await todoPage.expectTodoCount(1);
    await todoPage.expectTodoText(0, 'New done');
    expect(await todoPage.storedTitles()).toEqual(['New active', 'New done']);
  });

  test('should reject seeding an empty list, which the application cannot hold', async ({ todoPage }) => {
    // Documents the constraint behind issue #4: storage set to an empty array
    // makes the app reseed its samples, so emptiness needs clearTodos().
    await expect(todoPage.seedTodos([])).rejects.toThrow(/cannot produce an empty list/);
  });

  test('should allow normal application seeding after storage is removed', async ({ todoPage, page }) => {
    // An init script left by cleanup would inject its sentinel on this reload.
    await page.evaluate((key) => localStorage.removeItem(key), TODO_STORAGE_KEY);

    await todoPage.reload();

    await todoPage.expectTodoCount(2);
    await todoPage.expectTodoText(0, 'Pay electric bill');
    await todoPage.expectTodoText(1, 'Walk the dog');
  });
});
