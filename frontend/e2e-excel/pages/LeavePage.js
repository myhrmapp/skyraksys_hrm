/**
 * Leave Page Object Model — Request, Management, Balance, Types
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class LeavePage {
  constructor(page) {
    this.page = page;
    this.s = selectors.leave;
  }

  // ─── Leave Request (Employee) ───────────
  async gotoRequest() {
    await this.page.goto('/leaves/request');
    await waitForPageReady(this.page);
  }

  async selectLeaveType(type) {
    await this.page.locator(this.s.typeSelect).click();
    await this.page.locator(`li:has-text("${type}")`).click();
  }

  async fillStartDate(date) {
    await this.page.locator(`${this.s.startDate} input`).fill(date);
  }

  async fillEndDate(date) {
    await this.page.locator(`${this.s.endDate} input`).fill(date);
  }

  async fillReason(reason) {
    await this.page.locator(`${this.s.reasonInput} textarea`).first().fill(reason);
  }

  async submitRequest() {
    await this.page.locator(this.s.submitBtn).click();
  }

  async cancelRequest() {
    await this.page.locator(this.s.cancelBtn).click();
  }

  // ─── Leave Management (Admin/HR) ───────
  async gotoManagement() {
    await this.page.goto('/leaves');
    await waitForPageReady(this.page);
  }

  async approveLeave() {
    await this.page.locator(this.s.approveBtn).first().click();
  }

  async rejectLeave() {
    await this.page.locator(this.s.rejectBtn).first().click();
  }

  // ─── Leave Balance ─────────────────────
  async gotoBalance() {
    await this.page.goto('/leaves/balances');
    await waitForPageReady(this.page);
  }

  async initializeBalances() {
    await this.page.locator(this.s.balanceInitBtn).click();
  }

  // ─── Leave Types ───────────────────────
  async gotoTypes() {
    await this.page.goto('/leaves/types');
    await waitForPageReady(this.page);
  }

  async clickAddType() {
    await this.page.locator(this.s.typeAddBtn).click();
  }

  async saveType() {
    await this.page.locator(this.s.typeSaveBtn).click();
  }

  // Aliases used by specs
  async selectType(type) { return this.selectLeaveType(type); }
  async approveFirst() { return this.approveLeave(); }
  async rejectFirst() { return this.rejectLeave(); }
}

module.exports = LeavePage;
