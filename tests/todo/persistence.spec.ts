import { test } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

// Fixture setup runs once; explicit reloads preserve state within each test.
test.describe('Persistence', () => {
  test.use({ todoFeature: 'Persistence' });

  test('should persist todos across a page reload', async ({ todoPage }) => {
    await allure.story('Todos persist after reload');

    await test.step('Add three todos', async () => {
      await todoPage.addTodos('Task 1', 'Task 2', 'Task 3');
    });

    await test.step('Reload the page', async () => {
      await todoPage.reload();
    });

    await test.step('Verify all todos are still present', async () => {
      await todoPage.expectTodoCount(3);
      await todoPage.expectTodoText(0, 'Task 1');
      await todoPage.expectTodoText(1, 'Task 2');
      await todoPage.expectTodoText(2, 'Task 3');
    });
  });

  test('should persist the completed state of todos across a page reload', async ({ todoPage }) => {
    await allure.story('Completed state persists after reload');

    await test.step('Add two todos and complete the first', async () => {
      await todoPage.addTodos('Completed task', 'Active task');
      await todoPage.toggleTodo(0);
    });

    await test.step('Reload the page', async () => {
      await todoPage.reload();
    });

    await test.step('Verify completion state is preserved', async () => {
      await todoPage.expectTodoCompleted(0);
      await todoPage.expectTodoNotCompleted(1);
    });

    await test.step('Verify item count is correct after reload', async () => {
      await todoPage.expectItemCountText('1 item left');
    });
  });

  test('should persist the active filter selection across a page reload', async ({ todoPage }) => {
    await allure.story('Filter selection persists after reload');

    await test.step('Add a todo', async () => {
      await todoPage.addTodo('Sample task');
    });

    await test.step('Switch to Active filter', async () => {
      await todoPage.filterByActive();
    });

    await test.step('Reload the page', async () => {
      await todoPage.reload();
    });

    await test.step('Verify Active filter is still selected', async () => {
      await todoPage.expectActiveFilterLink('active');
    });
  });
});
