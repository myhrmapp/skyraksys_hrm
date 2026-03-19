/**
 * Tasks Page Object Model
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class TasksPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.tasks;
  }

  async goto() {
    await this.page.goto('/tasks');
    await waitForPageReady(this.page);
  }

  async search(term) {
    await this.page.locator(`${this.s.search} input`).fill(term);
  }

  async filterByStatus(status) {
    await this.page.locator(this.s.statusFilter).click();
    await this.page.locator(`li[data-value="${status}"]`).click();
  }

  async filterByPriority(priority) {
    await this.page.locator(this.s.priorityFilter).click();
    await this.page.locator(`li[data-value="${priority}"]`).click();
  }

  async getTaskCount() {
    return this.page.locator('table tbody tr').count();
  }

  async changeTaskStatus(rowIndex, newStatus) {
    const row = this.page.locator('table tbody tr').nth(rowIndex);
    await row.locator('select, [role="combobox"]').click();
    await this.page.locator(`li[data-value="${newStatus}"]`).click();
  }

  async isPageVisible() {
    return this.page.locator(this.s.page).isVisible({ timeout: 5000 }).catch(() => false);
  }
}

module.exports = TasksPage;
