import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the TodoMVC application.
 *
 * Selectors are based on the standard TodoMVC CSS class names used
 * by the cypress-example-kitchensink vanilla JavaScript implementation.
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
    this.toggleAllLabel = page.locator('label[for="toggle-all"]');
    this.footer = page.locator('.footer');
    this.main = page.locator('.main');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  /** Navigate and reset the list unless the caller explicitly preserves data. */
  async goto({ clearData = true }: { clearData?: boolean } = {}): Promise<void> {
    await this.page.goto('/todo');
    await this.waitUntilReady();
    if (clearData) {
      await this.clearTodos();
    }
  }

  /** Reload without resetting stored todos or the current filter hash. */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitUntilReady();
  }

  private async waitUntilReady(): Promise<void> {
    await this.newTodoInput.waitFor({ state: 'visible' });
  }

  /** Remove all todos, including items hidden by the selected filter. */
  async clearTodos(): Promise<void> {
    // Opening the All view makes cleanup independent of the current filter.
    if (await this.filterAll.isVisible()) {
      await this.filterByAll();
      await this.expectActiveFilterLink('all');
    }
    for (let count = await this.todoItems.count(); count > 0; count--) {
      await this.deleteTodo(0);
      await this.expectTodoCount(count - 1);
    }
    // Leave newly added items unhovered for visibility assertions.
    await this.page.mouse.move(0, 0);
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
