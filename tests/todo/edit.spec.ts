import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

test.describe('Edit todo', () => {
  // Items are seeded; every edit interaction stays, since editing is the
  // behaviour under test.
  test.use({ todoFeature: 'Edit Todo', todoStart: 'as-is' });

  test('should enter edit mode when double-clicking a todo label', async ({ todoPage }) => {
    await allure.story('Enter edit mode');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Original text']);
    });

    await test.step('Double-click the label', async () => {
      await todoPage.startEditing(0);
    });

    await test.step('Verify the item is in editing mode', async () => {
      await todoPage.expectEditingMode(0);
    });

    await test.step('Verify the edit input is visible and pre-filled', async () => {
      await expect(todoPage.editInput(0)).toBeVisible();
      await expect(todoPage.editInput(0)).toHaveValue('Original text');
    });
  });

  test('should save edited text when pressing Enter', async ({ todoPage }) => {
    await allure.story('Save with Enter');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Original text']);
    });

    await test.step('Edit the todo and confirm with Enter', async () => {
      await todoPage.editTodo(0, 'Updated text');
    });

    await test.step('Verify the updated text is displayed', async () => {
      await todoPage.expectTodoText(0, 'Updated text');
    });

    await test.step('Verify edit mode is exited', async () => {
      await expect(todoPage.item(0)).not.toHaveClass(/editing/);
    });
  });

  test('should save edited text when focus leaves the input (blur)', async ({ todoPage }) => {
    await allure.story('Save on blur');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Original text']);
    });

    await test.step('Edit the todo and confirm by blurring', async () => {
      await todoPage.editTodoByBlur(0, 'Saved by blur');
    });

    await test.step('Verify text was saved', async () => {
      await todoPage.expectTodoText(0, 'Saved by blur');
    });
  });

  test('should revert to original text when pressing Escape', async ({ todoPage }) => {
    await allure.story('Cancel with Escape');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Original text']);
    });

    await test.step('Start editing and press Escape', async () => {
      const input = await todoPage.startEditing(0);
      await input.fill('This should be discarded');
      // Press Escape directly on the active edit input (label is hidden during edit)
      await todoPage.cancelEdit(0);
    });

    await test.step('Verify original text is restored', async () => {
      await todoPage.expectTodoText(0, 'Original text');
    });

    await test.step('Verify edit mode is exited', async () => {
      await expect(todoPage.item(0)).not.toHaveClass(/editing/);
    });
  });

  test('should delete a todo when its edited text is cleared and Enter is pressed', async ({ todoPage }) => {
    await allure.story('Delete by clearing edit');

    await test.step('Seed two todos', async () => {
      await todoPage.seedTodos(['Keep me', 'Delete me']);
    });

    await test.step('Edit the second todo and clear its text', async () => {
      await todoPage.editTodo(1, '');
    });

    await test.step('Verify the second todo is removed', async () => {
      await todoPage.expectTodoCount(1);
      await todoPage.expectTodoText(0, 'Keep me');
    });
  });

  test('should trim whitespace when saving an edited todo', async ({ todoPage }) => {
    await allure.story('Trim whitespace on edit save');

    await test.step('Seed a todo', async () => {
      await todoPage.seedTodos(['Original']);
    });

    await test.step('Edit and add surrounding whitespace', async () => {
      await todoPage.editTodo(0, '  Updated  ');
    });

    await test.step('Verify whitespace was trimmed on save', async () => {
      // Asserted exactly: toHaveText would normalize the whitespace away.
      await todoPage.expectExactTodoText(0, 'Updated');
      expect(await todoPage.storedTitles()).toEqual(['Updated']);
    });
  });
});
