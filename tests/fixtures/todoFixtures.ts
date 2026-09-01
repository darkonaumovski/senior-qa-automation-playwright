import { test as base } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage';

// Re-export so test files only import from this module
export { expect } from '@playwright/test';

type TodoFixtures = {
  todoPage: TodoPage;
};

/**
 * Extended test fixture that provides a pre-navigated TodoPage for every test.
 * localStorage is cleared before navigation so each test has an isolated state.
 */
export const test = base.extend<TodoFixtures>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },
});
