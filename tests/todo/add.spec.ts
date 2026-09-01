import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Add todo', () => {
  test.beforeEach(async ({}, testInfo) => {
    await allure.epic('Todo Management');
    await allure.feature('Add Todo');
    await allure.owner('QA Team');
  });

  test('should add a single todo item', async ({ todoPage }) => {
    await allure.story('Single todo');

    await test.step('Add a todo', async () => {
      await todoPage.addTodo('Buy groceries');
    });

    await test.step('Verify todo appears in the list', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, 'Buy groceries');
    });

    await test.step('Verify footer shows correct count', async () => {
      await todoPage.expectItemCountText('1 item left');
    });
  });

  test('should add multiple todo items', async ({ todoPage }) => {
    await allure.story('Multiple todos');

    const items = ['Buy groceries', 'Walk the dog', 'Read a book'];

    await test.step('Add three todos', async () => {
      await todoPage.addTodos(...items);
    });

    await test.step('Verify all todos appear', async () => {
      await todoPage.expectTodoCount(3);
      for (let i = 0; i < items.length; i++) {
        await todoPage.expectTodoText(i, items[i]);
      }
    });

    await test.step('Verify footer count', async () => {
      await todoPage.expectItemCountText('3 items left');
    });
  });

  test('should not add an empty todo when Enter is pressed on blank input', async ({ todoPage }) => {
    await allure.story('Empty input validation');

    await test.step('Press Enter without typing', async () => {
      await todoPage.newTodoInput.press('Enter');
    });

    await test.step('Verify list remains empty', async () => {
      await todoPage.expectTodoCount(0);
      await todoPage.expectFooterHidden();
    });
  });

  test('should not add a todo containing only whitespace', async ({ todoPage }) => {
    await allure.story('Whitespace input validation');


    await test.step('Type only spaces and press Enter', async () => {
      await todoPage.addTodo('   ');
    });

    await test.step('Verify no todo was added', async () => {
      await todoPage.expectTodoCount(0);
    });
  });

  test('should trim leading and trailing whitespace from todo text', async ({ todoPage }) => {
    await allure.story('Whitespace trimming');


    await test.step('Add todo with surrounding whitespace', async () => {
      await todoPage.addTodo('  Buy milk  ');
    });

    await test.step('Verify text is saved trimmed', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, 'Buy milk');
    });
  });

  test('should handle special characters in todo text', async ({ todoPage }) => {
    await allure.story('Special characters');

    const specialText = 'Buy <milk> & "bread" for $5';

    await test.step('Add a todo with special characters', async () => {
      await todoPage.addTodo(specialText);
    });

    await test.step('Verify text is rendered safely as plain text', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, specialText);
    });
  });

  test('should clear input field after adding a todo', async ({ todoPage }) => {
    await allure.story('Input cleared after submit');

    await test.step('Add a todo', async () => {
      await todoPage.addTodo('Learn Playwright');
    });

    await test.step('Verify input is empty', async () => {
      await expect(todoPage.newTodoInput).toHaveValue('');
    });
  });
});
