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
    await todoPage.goto();

    await todoPage.expectTodoCount(0);
    await todoPage.expectFooterHidden();
    expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
    await todoPage.addTodo('Fresh todo');
    await expect(todoPage.destroyButton(0)).not.toBeVisible();
  });

  test('should clear todos hidden by an empty filtered view', async ({ todoPage }) => {
    await todoPage.addTodos('Hidden first', 'Hidden second');
    await todoPage.filterByCompleted();
    await todoPage.expectTodoCount(0);

    await todoPage.clearTodos();
    await todoPage.clearTodos();

    await todoPage.expectTodoCount(0);
    await todoPage.expectFooterHidden();
    await todoPage.addTodo('Only new item');
    await todoPage.expectTodoCount(1);
    await todoPage.expectTodoText(0, 'Only new item');
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
