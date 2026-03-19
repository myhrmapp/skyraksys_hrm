/**
 * Reviews Page Object Model — Employee Performance Reviews
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class ReviewsPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.reviews;
  }

  async goto() {
    await this.page.goto('/reviews');
    await waitForPageReady(this.page);
  }

  async clickNewReview() {
    await this.page.locator(this.s.newBtn).click();
  }

  async search(term) {
    await this.page.locator(`${this.s.search} input`).fill(term);
  }

  async filterByStatus(status) {
    // TextField select — click then choose option
    await this.page.locator(`${this.s.statusFilter}`).click();
    await this.page.locator(`li[data-value="${status}"]`).click();
  }

  async filterByType(type) {
    await this.page.locator(`${this.s.typeFilter}`).click();
    await this.page.locator(`li[data-value="${type}"]`).click();
  }

  async submitCreate() {
    await this.page.locator(this.s.createSubmitBtn).click();
  }

  async saveEdit() {
    await this.page.locator(this.s.editSaveBtn).click();
  }

  async confirmDelete() {
    await this.page.locator(this.s.deleteConfirmBtn).click();
  }

  async isPageVisible() {
    return this.page.locator(this.s.page).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getReviewCount() {
    return this.page.locator('table tbody tr').count();
  }

  // Aliases used by specs
  async clickEdit() { return this.saveEdit(); }
  async clickDelete() { return this.confirmDelete(); }
}

module.exports = ReviewsPage;
