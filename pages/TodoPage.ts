import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the TodoMVC application.
 *
 * Selectors are based on the standard TodoMVC CSS class names used
 * by the cypress-example-kitchensink React implementation.
 */
export class TodoPage {
  readonly page: Page;
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly itemCount: Locator;
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  readonly clearCompletedButton: Locator;
  readonly toggleAllLabel: Locator;
  readonly toggleAllCheckbox: Locator;
  readonly footer: Locator;
  readonly main: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodoInput = page.locator('.new-todo');
    this.todoItems = page.locator('.todo-list li');
    this.itemCount = page.locator('.todo-count');
    this.filterAll = page.locator('.filters a[href="#/"]');
    this.filterActive = page.locator('.filters a[href="#/active"]');
    this.filterCompleted = page.locator('.filters a[href="#/completed"]');
    this.clearCompletedButton = page.locator('.clear-completed');
    this.toggleAllCheckbox = page.locator('#toggle-all');
    this.toggleAllLabel = page.locator('[for="toggle-all"], label[for="toggle-all"]');
    this.footer = page.locator('.footer');
    this.main = page.locator('.main');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  /**
   * Navigate to the todo page and ensure a clean state.
   *
   * The cypress-example-kitchensink app seeds two default todos ("Pay electric
   * bill" and "Walk the dog") whenever it finds localStorage empty.  To bypass
   * this we inject an addInitScript that places a sentinel item before the page
   * initialises; the sentinel prevents the default-seeding branch from running.
   * We then delete every visible item via the UI, leaving a genuinely empty list.
   *
   * Set clearData:false only when the caller wants to preserve existing state
   * (e.g., when navigating to a freshly seeded page intentionally).
   */
  async goto({ clearData = true }: { clearData?: boolean } = {}): Promise<void> {
    if (clearData) {
      // Runs before any app script on each navigation of this page.
      // Only injects the sentinel when storage is truly absent (null) so
      // that reloads in persistence tests with real items are unaffected.
      await this.page.addInitScript(() => {
        const key = 'todos-vanillajs';
        if (window.localStorage.getItem(key) === null) {
          window.localStorage.setItem(
            key,
            JSON.stringify([{ id: 99999999, title: '__pw_seed__', completed: false }]),
          );
        }
      });
    }

    await this.page.goto('/todo');
    await this.newTodoInput.waitFor({ state: 'visible' });

    if (clearData) {
      // Delete every visible item (sentinel + any leftovers) via the UI so
      // that the app's internal state and localStorage both start clean.
      let count = await this.todoItems.count();
      while (count > 0) {
        // dispatchEvent bypasses CSS display:none — the app uses delegated click
        // handlers on .todo-list so the event still reaches the remove handler.
        await this.page.evaluate(() => {
          const btn = document.querySelector(
            '.todo-list li .destroy',
          ) as HTMLElement | null;
          btn?.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true }),
          );
        });
        // Wait for the list to shrink before the next iteration
        await this.page.waitForFunction(
          (n) => document.querySelectorAll('.todo-list li').length < n,
          count,
        );
        count = await this.todoItems.count();
      }
      // Move the cursor away so the `:hover` CSS state does not persist on
      // items added by subsequent test steps.
      await this.page.mouse.move(0, 0);
    }
  }

  // ─── Add ─────────────────────────────────────────────────────────────────────

  async addTodo(text: string): Promise<void> {
    await this.newTodoInput.fill(text);
    await this.newTodoInput.press('Enter');
  }

  async addTodos(...texts: string[]): Promise<void> {
    for (const text of texts) {
      await this.addTodo(text);
    }
  }

  // ─── Item accessors ───────────────────────────────────────────────────────────

  item(index: number): Locator {
    return this.todoItems.nth(index);
  }

  label(index: number): Locator {
    return this.item(index).locator('label');
  }

  toggle(index: number): Locator {
    return this.item(index).locator('.toggle');
  }

  destroyButton(index: number): Locator {
    return this.item(index).locator('.destroy');
  }

  editInput(index: number): Locator {
    return this.item(index).locator('.edit');
  }

  // ─── Complete / uncomplete ────────────────────────────────────────────────────

  async toggleTodo(index: number): Promise<void> {
    await this.toggle(index).click();
  }

  async toggleAll(): Promise<void> {
    // Click the label which triggers the hidden checkbox in all TodoMVC versions
    await this.toggleAllLabel.click();
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  async deleteTodo(index: number): Promise<void> {
    await this.item(index).hover();
    // The destroy button only becomes visible on :hover; wait for it, then click.
    await this.destroyButton(index).waitFor({ state: 'visible' });
    await this.destroyButton(index).click();
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────────

  async startEditing(index: number): Promise<Locator> {
    await this.label(index).dblclick();
    const input = this.editInput(index);
    await input.waitFor({ state: 'visible' });
    return input;
  }

  async editTodo(index: number, newText: string): Promise<void> {
    const input = await this.startEditing(index);
    // fill() clears existing content before typing
    await input.fill(newText);
    await input.press('Enter');
  }

  async editTodoByBlur(index: number, newText: string): Promise<void> {
    const input = await this.startEditing(index);
    await input.fill(newText);
    await input.blur();
  }

  /**
   * Press Escape to cancel an edit that is already in progress.
   * Call this only after startEditing() has been called — it does NOT enter
   * edit mode on its own (the label is hidden while editing is active).
   */
  async cancelEdit(index: number): Promise<void> {
    await this.editInput(index).press('Escape');
  }

  // ─── Filter ───────────────────────────────────────────────────────────────────

  async filterByAll(): Promise<void> {
    await this.filterAll.click();
  }

  async filterByActive(): Promise<void> {
    await this.filterActive.click();
  }

  async filterByCompleted(): Promise<void> {
    await this.filterCompleted.click();
  }

  // ─── Bulk ─────────────────────────────────────────────────────────────────────

  async clearCompleted(): Promise<void> {
    await this.clearCompletedButton.click();
  }

  // ─── Assertion helpers ────────────────────────────────────────────────────────

  async expectTodoCount(count: number): Promise<void> {
    await expect(this.todoItems).toHaveCount(count);
  }

  async expectTodoText(index: number, text: string): Promise<void> {
    await expect(this.label(index)).toHaveText(text);
  }

  async expectTodoCompleted(index: number): Promise<void> {
    await expect(this.item(index)).toHaveClass(/completed/);
  }

  async expectTodoNotCompleted(index: number): Promise<void> {
    await expect(this.item(index)).not.toHaveClass(/completed/);
  }

  async expectItemCountText(expected: string): Promise<void> {
    await expect(this.itemCount).toHaveText(expected);
  }

  async expectFooterVisible(): Promise<void> {
    await expect(this.footer).toBeVisible();
  }

  async expectFooterHidden(): Promise<void> {
    await expect(this.footer).not.toBeVisible();
  }

  async expectActiveFilterLink(filter: 'all' | 'active' | 'completed'): Promise<void> {
    const link = filter === 'all'
      ? this.filterAll
      : filter === 'active'
      ? this.filterActive
      : this.filterCompleted;
    await expect(link).toHaveClass(/selected/);
  }

  async expectEditingMode(index: number): Promise<void> {
    await expect(this.item(index)).toHaveClass(/editing/);
  }
}
