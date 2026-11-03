import type { Page } from '@playwright/test';
import type { TodoPage } from '../../pages/TodoPage';
import { test, expect } from '../fixtures/todoFixtures';
import { hasReviewedDefects } from '../fixtures/knownDefects';

async function tryTabTo(page: Page, selector: string): Promise<boolean> {
  // A bounded traversal uses real Tab events and never forces DOM focus.
  await page.bringToFront();
  const keys = page.context().browser()?.browserType().name() === 'webkit' ? ['Tab', 'Alt+Tab'] : ['Tab'];
  for (const key of keys) {
    for (let count = 0; count < 40; count++) {
      if (await page.locator(selector).evaluate((element) => element === document.activeElement)) return true;
      await page.keyboard.press(key);
    }
  }
  return false;
}

async function tabTo(page: Page, selector: string) {
  if (await tryTabTo(page, selector)) return;
  throw new Error('Keyboard could not reach ' + selector + ' in 40 Tabs');
}

async function filterJourney(todoPage: TodoPage, page: Page): Promise<boolean> {
  if (!await tryTabTo(page, '.filters a[href="#/active"]')) return false;
  // These assertions run before any known-defect marker, so other failures stay red.
  await expect(todoPage.filterActive).toBeFocused();
  await expect(todoPage.filterActive).not.toHaveCSS('outline-style', 'none');
  await expect(todoPage.filterActive).not.toHaveCSS('outline-width', '0px');
  await page.keyboard.press('Enter');
  await todoPage.expectTodoCount(1);
  await todoPage.expectTodoText(0, 'Existing task');
  await tabTo(page, '.filters a[href="#/completed"]');
  await page.keyboard.press('Enter');
  await todoPage.expectTodoText(0, 'Keyboard task');
  await todoPage.expectActiveFilterLink('completed');
  return true;
}

test.describe('Keyboard interaction', () => {
  test.use({ todoFeature: 'Accessibility', todoStart: 'as-is' });

  test('keyboard journey adds, completes and filters a todo with visible link focus', async ({ todoPage, page, browserName }, testInfo) => {
    // Reloaded preconditions retain the app's natural input autofocus. A removed
    // cleanup button leaves Firefox at the document's end, outside this journey.
    await todoPage.seedTodos(['Existing task']);
    await tabTo(page, '.new-todo');
    await page.keyboard.type('Keyboard task');
    await page.keyboard.press('Enter');
    await todoPage.expectTodoText(1, 'Keyboard task');
    await tabTo(page, '.todo-list li:nth-child(2) .toggle');
    await page.keyboard.press('Space');
    await todoPage.expectTodoCompleted(1);
    const reachable = await filterJourney(todoPage, page);
    await testInfo.attach('keyboard-filter-navigation', { body: JSON.stringify({ reachable, browserName, platform: process.platform, focus: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 300)) }), contentType: 'application/json' });
    test.fail(browserName === 'webkit' && process.platform === 'win32' && hasReviewedDefects(testInfo.config.metadata.appCommit),
      'WINDOWS-WEBKIT-KEYBOARD: Tab and Option-Tab skip filter links; bounded real-key reproducer retained');
    expect(reachable, 'Filter links must be reachable by keyboard').toBe(true);
  });

  test('known product defect: input and checkbox need visible keyboard focus', async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Focus task']);
    await tabTo(page, '.new-todo');
    const input = await todoPage.newTodoInput.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    });
    await tabTo(page, '.todo-list .toggle');
    await expect(todoPage.toggle(0)).toBeFocused();
    const checkbox = await todoPage.toggle(0).evaluate((element) => {
      const style = getComputedStyle(element);
      const proxy = getComputedStyle(element.nextElementSibling!);
      return (style.opacity !== '0' && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
        || (proxy.outlineStyle !== 'none' && parseFloat(proxy.outlineWidth) > 0);
    });
    test.fail(hasReviewedDefects(testInfo.config.metadata.appCommit), 'UPSTREAM-KEYBOARD-FOCUS: new input outline is 0; focused row checkbox is transparent with no proxy focus style');
    expect({ input, checkbox }).toEqual({ input: true, checkbox: true });
  });

  test('known product defect: row edit and delete controls need keyboard access', async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Keyboard access task']);
    await page.mouse.move(0, 0);
    await tabTo(page, '.new-todo');
    const visited: Array<{ html: string; toggle: boolean; edit: boolean; destroy: boolean }> = [];
    const keys = browserKeyChoices(page);
    for (const key of keys) {
    for (let count = 0; count < 35; count++) {
      await page.keyboard.press(key);
      visited.push(await page.evaluate(() => {
        const element = document.activeElement!;
        return {
          html: element.outerHTML.slice(0, 300),
          toggle: element.matches('.todo-list .toggle'),
          edit: element.matches('.todo-list .edit, .todo-list label[tabindex]'),
          destroy: element.matches('.todo-list .destroy'),
        };
      }));
    }
    }
    await testInfo.attach('keyboard-tab-order', { body: JSON.stringify(visited, null, 2), contentType: 'application/json' });
    expect(visited.some((entry) => entry.toggle)).toBe(true);
    test.fail(hasReviewedDefects(testInfo.config.metadata.appCommit), 'UPSTREAM-KEYBOARD-ACCESS: edit requires dblclick; display:none destroy has no keyboard reveal');
    expect({ edit: visited.some((entry) => entry.edit), delete: visited.some((entry) => entry.destroy) })
      .toEqual({ edit: true, delete: true });
  });
});

function browserKeyChoices(page: Page): string[] {
  return page.context().browser()?.browserType().name() === 'webkit' ? ['Tab', 'Alt+Tab'] : ['Tab'];
}
