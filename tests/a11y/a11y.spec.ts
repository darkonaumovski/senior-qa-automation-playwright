import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/todoFixtures';
import { hasReviewedDefects } from '../fixtures/knownDefects';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

/** Match individual visible checkbox nodes, never the whole label rule.
 * Preserve unexpected nodes' HTML and failureSummary. Flag repaired exceptions.
 */
async function scan(page: Page, revision: string) {
  const exceptions = hasReviewedDefects(revision)
    ? await page.locator('.todo-list li > .view > input.toggle[type="checkbox"]:first-child:visible').evaluateAll(
      (inputs) => inputs.map((input) => '.todo-list li[data-id="' + input.closest('li')!.getAttribute('data-id') + '"] > .view > input.toggle[type="checkbox"]:first-child'),
    ) : [];
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const remaining = new Set(exceptions);
  const unexpected: Result[] = [];
  for (const violation of results.violations) {
    const nodes = [];
    for (const node of violation.nodes) {
      const selector = node.target.length === 1 && typeof node.target[0] === 'string' ? node.target[0] : '';
      const match = violation.id === 'label' && selector
        ? await page.locator(selector).evaluate((element, allowed) => allowed.find((s) => element.matches(s)), exceptions)
        : undefined;
      if (match) remaining.delete(match);
      else nodes.push(node);
    }
    if (nodes.length) unexpected.push({ ...violation, nodes });
  }
  return { unexpected, obsoleteExceptions: [...remaining] };
}

function expectClean(result: { unexpected: Result[]; obsoleteExceptions: string[] }) {
  expect(result).toEqual({ unexpected: [], obsoleteExceptions: [] });
}

test.describe('Accessibility', () => {
  test.use({ todoFeature: 'Accessibility', todoStart: 'as-is' });

  test('base todo list view has no unexpected WCAG violations', { tag: '@smoke' }, async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Buy groceries', { title: 'Walk the dog', completed: true }]);
    expectClean(await scan(page, String(testInfo.config.metadata.appCommit)));
  });

  test('known product defect: inline editor needs an accessible name', async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Buy groceries']);
    await todoPage.startEditing(0);
    const result = await scan(page, String(testInfo.config.metadata.appCommit));
    const editorNodes = result.unexpected.filter((v) => v.id === 'label')
      .flatMap((v) => v.nodes).filter((node) => node.target.includes('.edit'));
    // Unexpected nodes fail normally, before the narrowly scoped expected failure.
    expect(result.unexpected.flatMap((v) => v.nodes).filter((node) => !editorNodes.includes(node))).toEqual([]);
    expect(result.obsoleteExceptions).toEqual([]);
    test.fail(hasReviewedDefects(testInfo.config.metadata.appCommit), 'UPSTREAM-A11Y-EDIT: visible .edit has no accessible name');
    expect(editorNodes, JSON.stringify(result.unexpected, null, 2)).toEqual([]);
  });

  test('accessibility gate rejects an additional unnamed input', async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Gate control']);
    await page.locator('.todoapp').evaluate((app) => {
      const input = document.createElement('input');
      input.id = 'unexpected-unnamed';
      app.append(input);
    });
    const result = await scan(page, String(testInfo.config.metadata.appCommit));
    expect(result.unexpected.find((v) => v.id === 'label')?.nodes.map((node) => node.target)).toContainEqual(['#unexpected-unnamed']);
    expect(result.obsoleteExceptions).toEqual([]);
    expect(() => expectClean(result)).toThrow('unexpected-unnamed');
  });

  test('accessibility gate flags a repaired checkbox exception as obsolete', async ({ todoPage, page }, testInfo) => {
    await todoPage.seedTodos(['Repaired checkbox']);
    await todoPage.toggle(0).evaluate((input) => input.setAttribute('aria-label', 'Complete Repaired checkbox'));
    const result = await scan(page, String(testInfo.config.metadata.appCommit));
    expect(result.unexpected).toEqual([]);
    expect(result.obsoleteExceptions).toHaveLength(1);
    expect(() => expectClean(result)).toThrow('obsoleteExceptions');
  });

  test('toggle-all control has no detectable WCAG violations', async ({ todoPage, page }) => {
    await todoPage.seedTodos(['Buy groceries', 'Walk the dog']);
    const results = await new AxeBuilder({ page }).include('.toggle-all')
      .include('label[for="toggle-all"]').withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
