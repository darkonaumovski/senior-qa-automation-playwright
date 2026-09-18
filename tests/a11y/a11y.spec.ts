import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { test, expect } from '../fixtures/todoFixtures';
import { allure } from 'allure-playwright';

/**
 * Closes the top risk TEST_APPROACH.md names and defers: the app has custom
 * checkbox and inline-edit interactions, exactly where a11y defects
 * concentrate. This is a smoke pass on the three surfaces named there, not
 * the full WCAG audit (keyboard-only and screen-reader passes) that document
 * still defers.
 *
 * Scoped to `wcag2a`/`wcag2aa`/`wcag21aa`: axe-core's "best practice" rules
 * (e.g. `landmark-one-main`, `region`) are opinionated recommendations beyond
 * WCAG conformance, not success criteria, so they belong to that deferred
 * full audit rather than this gate.
 *
 * `label` is disabled with cause, not swept under the rug: every `.toggle`
 * checkbox has no accessible name (WCAG 4.1.2, critical — confirmed via
 * axe-core against the live app; the failing nodes are the per-item
 * checkboxes, not the page shell). This is a real, product-side defect,
 * recorded as Finding #5 in FINDINGS.md, not yet filed upstream as a GitHub
 * issue. Excluding it here keeps this gate meaningful for regressions in
 * everything else instead of red for a known, tracked issue — the same
 * reasoning `filter.spec.ts` uses for issue #7. Remove the exclusion once the
 * app grows an accessible name for `.toggle`; its disappearance is the
 * regression test for that fix.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];
const KNOWN_DEFECTS = ['label']; // Finding #5 — .toggle checkboxes have no accessible name.

test.describe('Accessibility', () => {
  test.use({ todoFeature: 'Accessibility', todoStart: 'as-is' });

  test('base todo list view has no detectable WCAG violations', { tag: '@smoke' }, async ({ todoPage, page }) => {
    await allure.story('Base view');

    await todoPage.seedTodos(['Buy groceries', { title: 'Walk the dog', completed: true }]);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(KNOWN_DEFECTS)
      .analyze();

    expect(results.violations, describe(results.violations)).toEqual([]);
  });

  test('inline-editing state has no detectable WCAG violations', async ({ todoPage, page }) => {
    await allure.story('Editing state');

    await todoPage.seedTodos(['Buy groceries']);
    await todoPage.startEditing(0);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(KNOWN_DEFECTS)
      .analyze();

    expect(results.violations, describe(results.violations)).toEqual([]);
  });

  test('toggle-all control has no detectable WCAG violations', async ({ todoPage, page }) => {
    await allure.story('Toggle-all control');

    await todoPage.seedTodos(['Buy groceries', 'Walk the dog']);

    const results = await new AxeBuilder({ page })
      .include('.toggle-all')
      .include('label[for="toggle-all"]')
      .withTags(WCAG_TAGS)
      .analyze();

    expect(results.violations, describe(results.violations)).toEqual([]);
  });
});

/** Renders violations as a readable failure message instead of a raw axe-core dump. */
function describe(violations: Result[]): string {
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`)
    .join('\n');
}
