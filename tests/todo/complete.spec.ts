import { test } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Complete todo', () => {
  // Items are seeded, but the toggle clicks stay: completing a todo is the
  // behaviour under test here, not a precondition.
  test.use({ todoFeature: 'Complete Todo', todoStart: 'as-is' });

  test('should mark a todo as complete by clicking its checkbox', async ({ todoPage }) => {
    await allure.story('Mark complete');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Write tests']);
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

    await test.step('Seed an already completed todo', async () => {
      await todoPage.seedTodos([{ title: 'Write tests', completed: true }]);
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

    await test.step('Seed three active todos', async () => {
      await todoPage.seedTodos(['Task A', 'Task B', 'Task C']);
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

    await test.step('Seed two active todos', async () => {
      await todoPage.seedTodos(['Done task', 'Pending task']);
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

    await test.step('Seed two active todos', async () => {
      await todoPage.seedTodos(['Task 1', 'Task 2']);
    });

    await test.step('Complete both todos', async () => {
      await todoPage.toggleTodo(0);
      await todoPage.toggleTodo(1);
    });

    await test.step('Verify counter shows 0 items left', async () => {
      await todoPage.expectItemCountText('0 items left');
    });
  });
});
