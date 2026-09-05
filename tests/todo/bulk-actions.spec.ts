import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Bulk actions', () => {
  test.use({ todoFeature: 'Bulk Actions' });

  test('should mark all todos as complete using toggle-all', async ({ todoPage }) => {
    await allure.story('Toggle all to complete');

    await test.step('Add three todos', async () => {
      await todoPage.addTodos('Task 1', 'Task 2', 'Task 3');
    });

    await test.step('Click toggle-all', async () => {
      await todoPage.toggleAll();
    });

    await test.step('Verify all todos are completed', async () => {
      await todoPage.expectTodoCompleted(0);
      await todoPage.expectTodoCompleted(1);
      await todoPage.expectTodoCompleted(2);
    });

    await test.step('Verify count shows 0 items left', async () => {
      await todoPage.expectItemCountText('0 items left');
    });
  });

  test('should unmark all todos when toggle-all is clicked while all are completed', async ({ todoPage }) => {
    await allure.story('Toggle all to uncomplete');

    await test.step('Add and complete all todos', async () => {
      await todoPage.addTodos('Task 1', 'Task 2');
      await todoPage.toggleAll();
    });

    await test.step('Click toggle-all again to uncomplete', async () => {
      await todoPage.toggleAll();
    });

    await test.step('Verify all todos are now active', async () => {
      await todoPage.expectTodoNotCompleted(0);
      await todoPage.expectTodoNotCompleted(1);
    });

    await test.step('Verify count shows all items left', async () => {
      await todoPage.expectItemCountText('2 items left');
    });
  });

  test('should complete remaining active todos when toggle-all is used with mixed state', async ({ todoPage }) => {
    await allure.story('Toggle all with mixed state');

    await test.step('Add three todos and complete one', async () => {
      await todoPage.addTodos('Task 1', 'Task 2', 'Task 3');
      await todoPage.toggleTodo(0);
    });

    await test.step('Click toggle-all', async () => {
      await todoPage.toggleAll();
    });

    await test.step('Verify all three are now completed', async () => {
      await todoPage.expectTodoCompleted(0);
      await todoPage.expectTodoCompleted(1);
      await todoPage.expectTodoCompleted(2);
    });
  });

  test('should remove all completed todos via "Clear completed"', async ({ todoPage }) => {
    await allure.story('Clear completed removes completed items');

    await test.step('Add three todos and complete two', async () => {
      await todoPage.addTodos('Active task', 'Done 1', 'Done 2');
      await todoPage.toggleTodo(1);
      await todoPage.toggleTodo(2);
    });

    await test.step('Click Clear completed', async () => {
      await todoPage.clearCompleted();
    });

    await test.step('Verify only the active todo remains', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, 'Active task');
    });
  });

  test('should not show "Clear completed" button when no todos are completed', async ({ todoPage }) => {
    await allure.story('Clear completed button visibility');

    await test.step('Add active todos only', async () => {
      await todoPage.addTodos('Active 1', 'Active 2');
    });

    await test.step('Verify Clear completed is not visible', async () => {
      await expect(todoPage.clearCompletedButton).not.toBeVisible();
    });
  });

  test('should show "Clear completed" only when at least one todo is completed', async ({ todoPage }) => {
    await allure.story('Clear completed appears on completion');

    await test.step('Add an active todo', async () => {
      await todoPage.addTodo('Task');
    });

    await test.step('Verify Clear completed is hidden', async () => {
      await expect(todoPage.clearCompletedButton).not.toBeVisible();
    });

    await test.step('Complete the todo', async () => {
      await todoPage.toggleTodo(0);
    });

    await test.step('Verify Clear completed is now visible', async () => {
      await expect(todoPage.clearCompletedButton).toBeVisible();
    });

    await test.step('Click Clear completed', async () => {
      await todoPage.clearCompleted();
    });

    await test.step('Verify Clear completed is hidden again', async () => {
      await expect(todoPage.clearCompletedButton).not.toBeVisible();
    });
  });

  test('should update item count correctly after clearing completed todos', async ({ todoPage }) => {
    await allure.story('Counter after clear completed');

    await test.step('Add four todos, complete two', async () => {
      await todoPage.addTodos('Active 1', 'Active 2', 'Done 1', 'Done 2');
      await todoPage.toggleTodo(2);
      await todoPage.toggleTodo(3);
    });

    await test.step('Clear completed', async () => {
      await todoPage.clearCompleted();
    });

    await test.step('Verify counter shows 2 items left', async () => {
      await todoPage.expectItemCountText('2 items left');
    });
  });
});
