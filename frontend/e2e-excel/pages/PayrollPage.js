/**
 * Payroll Page Object Model — Admin Management & Employee Payslips
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class PayrollPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.payroll;
  }

  // ─── Admin Payroll Management ──────────
  async gotoManagement() {
    await this.page.goto('/payroll');
    await waitForPageReady(this.page);
  }

  async selectTab(index) {
    await this.page.locator(`${this.s.tabs} button`).nth(index).click();
    await waitForPageReady(this.page);
  }

  async clickGenerate() {
    await this.page.locator(this.s.generateBtn).click();
  }

  async clickExport() {
    await this.page.locator(this.s.exportBtn).click();
  }

  async clickRefresh() {
    await this.page.locator(this.s.refreshBtn).click();
  }

  async searchPayslip(query) {
    await this.page.locator(`${this.s.search} input`).fill(query);
  }

  async clickValidateAndGenerate() {
    await this.page.locator(this.s.validateGenerateBtn).click();
  }

  async bulkFinalize() {
    await this.page.locator(this.s.bulkFinalizeBtn).click();
  }

  async bulkMarkPaid() {
    await this.page.locator(this.s.bulkPaidBtn).click();
  }

  // ─── Employee Payslips ─────────────────
  async gotoMyPayslips() {
    await this.page.goto('/payslips');
    await waitForPageReady(this.page);
  }

  async filterByYear(year) {
    await this.page.locator(this.s.yearFilter).click();
    await this.page.locator(`li[data-value="${year}"]`).click();
  }

  async viewPayslip(index = 0) {
    await this.page.locator(this.s.viewBtn).nth(index).click();
  }

  async downloadPayslip(index = 0) {
    await this.page.locator(this.s.downloadBtn).nth(index).click();
  }

  // Aliases used by specs
  async search(q) { return this.searchPayslip(q); }
  async clickValidateGenerate() { return this.clickValidateAndGenerate(); }
  async clickBulkFinalize() { return this.bulkFinalize(); }
  async clickBulkMarkPaid() { return this.bulkMarkPaid(); }
  async clickViewFirst() { return this.viewPayslip(0); }
  async clickDownloadFirst() { return this.downloadPayslip(0); }
}

module.exports = PayrollPage;
