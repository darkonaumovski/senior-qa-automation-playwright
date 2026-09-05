import { test } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Complete todo', () => {
  test.use({ todoFeature: 'Complete Todo' });

  test('should mark a todo as complete by clicking its checkbox', async ({ todoPage }) => {
    await allure.story('Mark complete');

    await test.step('Add a todo', async () => {
      await todoPage.addTodo('Write tests');
    });

    await test.step('Toggle the todo to complete', async () => {
      await todoPage.toggleTodo(0);
    });

    await test.step('Verify todo has completed styling', async () => {
      await todoPage.expectTodoCompleted(0);
    });

    await test.step('Verify item count shows 0 items left', async () => {
      await todoPage.expectItemCountText('0 items left');
    });
  });

  test('should unmark a completed todo as active', async ({ todoPage }) => {
    await allure.story('Unmark complete');

    await test.step('Add and complete a todo', async () => {
      await todoPage.addTodo('Write tests');
      await todoPage.toggleTodo(0);
    });

    await test.step('Toggle it back to active', async () => {
      await todoPage.toggleTodo(0);
    });

    await test.step('Verify todo is no longer completed', async () => {
      await todoPage.expectTodoNotCompleted(0);
    });

    await test.step('Verify item count is back to 1', async () => {
      await todoPage.expectItemCountText('1 item left');
    });
  });

  test('should update item count when todos are completed', async ({ todoPage }) => {
    await allure.story('Counter updates on completion');

    await test.step('Add three todos', async () => {
      await todoPage.addTodos('Task A', 'Task B', 'Task C');
    });

    await test.step('Complete two of them', async () => {
      await todoPage.toggleTodo(0);
      await todoPage.toggleTodo(1);
    });

    await test.step('Verify count shows 1 item left', async () => {
      await todoPage.expectItemCountText('1 item left');
    });
  });

  test('should visually distinguish completed todos from active ones', async ({ todoPage }) => {
    await allure.story('Visual state distinction');

    await test.step('Add two todos', async () => {
      await todoPage.addTodos('Done task', 'Pending task');
    });

    await test.step('Complete only the first todo', async () => {
      await todoPage.toggleTodo(0);
    });

    await test.step('Verify first is completed, second is not', async () => {
      await todoPage.expectTodoCompleted(0);
      await todoPage.expectTodoNotCompleted(1);
    });
  });

  test('should show 0 items left when all todos are completed', async ({ todoPage }) => {
    await allure.story('All completed counter');

    await test.step('Add and complete all todos', async () => {
      await todoPage.addTodos('Task 1', 'Task 2');
      await todoPage.toggleTodo(0);
      await todoPage.toggleTodo(1);
    });

    await test.step('Verify counter shows 0 items left', async () => {
      await todoPage.expectItemCountText('0 items left');
    });
  });
});
