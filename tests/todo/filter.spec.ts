import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Filter todos', () => {
  // Every test here seeds its own data, so the fixture's UI cleanup would be
  // wasted work: seedTodos() overwrites stored todos regardless.
  test.use({ todoFeature: 'Filter Todos', todoStart: 'as-is' });

  test('should show all todos when the "All" filter is active', async ({ todoPage }) => {
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

  test('should show only active (incomplete) todos when "Active" filter is selected', async ({ todoPage }) => {
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

  test('should show only completed todos when "Completed" filter is selected', async ({ todoPage }) => {
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

  test('should reflect the selected filter in the URL hash', async ({ todoPage, page }) => {
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
      await expect(page).toHaveURL(/#\/$|\/todo$/);
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
