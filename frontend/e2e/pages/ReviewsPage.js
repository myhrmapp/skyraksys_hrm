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
    await this.page.goto('/employee-reviews');
    await waitForPageReady(this.page);
  }

  async isPageVisible() {
    return this.page.locator(this.s.page).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickNewReview() {
    const btn = this.page.locator(this.s.newBtn);
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  async search(term) {
    const input = this.page.locator(this.s.search).locator('input');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(term);
  }

  // ── MUI Select helper ───────────────────────────────
  async _pickSelectOption(wrapperSelector, dataValue) {
    const wrapper = this.page.locator(wrapperSelector);
    if (!await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) return false;
    const trigger = wrapper.locator('[role="combobox"]').first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ force: true });
    await this.page.waitForTimeout(300);
    // Primary: match by data-value attribute
    const opt = this.page.locator(`li[data-value="${dataValue}"]`);
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    // Fallback: match by visible text
    const textOpt = this.page.locator('[role="option"]')
      .filter({ hasText: new RegExp(dataValue, 'i') }).first();
    if (await textOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textOpt.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    await this.page.keyboard.press('Escape');
    return false;
  }

  async filterByStatus(status) {
    return this._pickSelectOption(this.s.statusFilter, status);
  }

  async filterByType(type) {
    return this._pickSelectOption(this.s.typeFilter, type);
  }

  // ── Create dialog ───────────────────────────────────
  async fillCreateForm({ reviewPeriod, reviewType }) {
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // 1) Employee select — first [role="combobox"] in the dialog
    const empCombo = dialog.locator('[role="combobox"]').first();
    await empCombo.click({ force: true });
    await this.page.waitForTimeout(500);

    // Wait for options to appear and pick first non-placeholder employee
    const opts = this.page.locator('[role="option"]');
    await opts.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const count = await opts.count();
    let picked = false;
    for (let i = 0; i < count; i++) {
      const val = await opts.nth(i).getAttribute('data-value');
      if (val && val !== '') {
        await opts.nth(i).click();
        picked = true;
        break;
      }
    }
    if (!picked) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    // 2) Review Period — plain text field
    if (reviewPeriod) {
      await dialog.getByLabel(/Review Period/i).fill(reviewPeriod);
    }

    // 3) Review Type — only change if not the default 'quarterly'
    if (reviewType && reviewType !== 'quarterly') {
      const typeCombo = dialog.locator('[role="combobox"]').nth(1);
      await typeCombo.click({ force: true });
      await this.page.waitForTimeout(300);
      const typeOpt = this.page.locator(`li[data-value="${reviewType}"]`);
      if (await typeOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeOpt.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
      await this.page.waitForTimeout(300);
    }
  }

  async submitCreate() {
    const btn = this.page.locator(this.s.createSubmitBtn);
    if (await btn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async saveEdit() {
    await this.page.locator(this.s.editSaveBtn).click();
  }

  async confirmDelete() {
    await this.page.locator(this.s.deleteConfirmBtn).click();
  }

  async confirmApprove() {
    const btn = this.page.locator('button:has-text("Confirm"), button:has-text("Approve"), button:has-text("Yes")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async cancelEdit() {
    const btn = this.page.locator('[role="dialog"] button:has-text("Cancel")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    return false;
  }

  // ── Table row action buttons ────────────────────────
  async clickEditOnRow(index = 0) {
    const btn = this.page.locator('button[aria-label*="Edit review"]').nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async clickDeleteOnRow(index = 0) {
    const btn = this.page.locator('button[aria-label*="Delete review"]').nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async clickApproveOnRow(index = 0) {
    const btn = this.page.locator('button[aria-label*="HR approve"]').nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async clickViewOnRow(index = 0) {
    const btn = this.page.locator('button[aria-label*="View review"]').nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async clickSelfAssessOnRow(index = 0) {
    const btn = this.page.locator('button[aria-label*="Submit self assessment"]').nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
    return false;
  }

  async hasReviews() {
    const noData = await this.page.locator('text=No reviews found')
      .isVisible({ timeout: 2000 }).catch(() => false);
    return !noData;
  }

  async getReviewCount() {
    if (!await this.hasReviews()) return 0;
    return this.page.locator('table tbody tr').count();
  }
}

module.exports = ReviewsPage;
