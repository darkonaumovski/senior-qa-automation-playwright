import { test as base } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage';
import { allure } from 'allure-playwright';

// Re-export so test files only import from this module
export { expect } from '@playwright/test';

type TodoFixtures = {
  todoPage: TodoPage;
  todoFeature: string;
  todoMetadata: void;
};

/**
 * Extended test fixture that provides a pre-navigated TodoPage for every test.
 * Playwright isolates browser state per test. Setup removes the app's sample
 * todos once; subsequent reloads preserve any changes made by the test.
 */
export const test = base.extend<TodoFixtures>({
  todoFeature: ['Todo Management', { option: true }],
  todoMetadata: [async ({ todoFeature }, use) => {
    await allure.epic('Todo Management');
    await allure.feature(todoFeature);
    await allure.owner('QA Team');
    await use();
  }, { auto: true }],
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },
});
