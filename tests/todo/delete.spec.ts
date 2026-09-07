import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Delete todo', () => {
  // Items are seeded, but every destroy click stays: deleting is the behaviour
  // under test here.
  test.use({ todoFeature: 'Delete Todo', todoStart: 'as-is' });

  test('should delete a todo by clicking the destroy button', async ({ todoPage }) => {
    await allure.story('Delete single todo');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Buy groceries']);
    });

    await test.step('Delete the todo', async () => {
      await todoPage.deleteTodo(0);
    });

    await test.step('Verify list is empty', async () => {
      await todoPage.expectTodoCount(0);
    });

    await test.step('Verify footer is hidden when list is empty', async () => {
      await todoPage.expectFooterHidden();
    });
  });

  test('should delete one todo from a list of many', async ({ todoPage }) => {
    await allure.story('Delete from list');

    await test.step('Seed three todos', async () => {
      await todoPage.seedTodos(['Task A', 'Task B', 'Task C']);
    });

    await test.step('Delete the middle todo', async () => {
      await todoPage.deleteTodo(1);
    });

    await test.step('Verify only two todos remain with correct text', async () => {
      await todoPage.expectTodoCount(2);
      await todoPage.expectTodoText(0, 'Task A');
      await todoPage.expectTodoText(1, 'Task C');
    });
  });

  test('should delete a completed todo', async ({ todoPage }) => {
    await allure.story('Delete completed todo');

    await test.step('Seed an already completed todo', async () => {
      await todoPage.seedTodos([{ title: 'Completed task', completed: true }]);
    });

    await test.step('Delete the completed todo', async () => {
      await todoPage.deleteTodo(0);
    });

    await test.step('Verify the list is empty', async () => {
      await todoPage.expectTodoCount(0);
    });
  });

  test('should show destroy button only on hover', async ({ todoPage }) => {
    await allure.story('Destroy button visibility');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Hover me']);
    });

    await test.step('Verify destroy button is not visible by default', async () => {
      // The button exists in the DOM but is invisible until hover
      await expect(todoPage.destroyButton(0)).not.toBeVisible();
    });

    await test.step('Hover over item and verify button appears', async () => {
      await todoPage.item(0).hover();
      await expect(todoPage.destroyButton(0)).toBeVisible();
    });
  });

  test('should delete all todos one by one and empty the list', async ({ todoPage }) => {
    await allure.story('Delete all todos');

    await test.step('Seed two todos', async () => {
      await todoPage.seedTodos(['First', 'Second']);
    });

    await test.step('Delete the first todo', async () => {
      await todoPage.deleteTodo(0);
      await todoPage.expectTodoCount(1);
    });

    await test.step('Delete the remaining todo', async () => {
      await todoPage.deleteTodo(0);
      await todoPage.expectTodoCount(0);
    });

    await test.step('Verify footer is hidden', async () => {
      await todoPage.expectFooterHidden();
    });
  });
});
