import { test as base } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage';
import { allure } from 'allure-playwright';

// Re-export so test files only import from this module
export { expect } from '@playwright/test';

type TodoFixtures = {
  todoPage: TodoPage;
  todoFeature: string;
  todoStart: 'empty' | 'as-is';
  todoMetadata: void;
};

/**
 * Extended test fixture that provides a pre-navigated TodoPage for every test.
 * Playwright isolates browser state per test. Subsequent reloads preserve any
 * changes made by the test.
 *
 * `todoStart` controls the starting state:
 * - 'empty'  (default) removes the app's sample todos through the UI, for tests
 *            that need an empty list or that add items themselves.
 * - 'as-is'  skips that cleanup, for describes whose tests call
 *            todoPage.seedTodos(), which overwrites stored data anyway. This
 *            avoids paying for a delete loop that is about to be discarded.
 */
export const test = base.extend<TodoFixtures>({
  todoFeature: ['Todo Management', { option: true }],
  todoStart: ['empty', { option: true }],
  todoMetadata: [async ({ todoFeature }, use) => {
    await allure.epic('Todo Management');
    await allure.feature(todoFeature);
    await allure.owner('QA Team');
    await use();
  }, { auto: true }],
  todoPage: async ({ page, todoStart }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto({ clearData: todoStart === 'empty' });
    await use(todoPage);
  },
});
