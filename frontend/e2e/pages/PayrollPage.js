/**
 * Payroll Page Object Model — Admin Management, Employee Payslips & Template Config
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
    // Avoid redundant navigation if already on the right page
    const url = this.page.url();
    if (!url.includes('/payroll-management')) {
      await this.page.goto('/payroll-management');
    }
    await waitForPageReady(this.page);
  }

  async isManagementPageVisible() {
    return this.page.locator(this.s.managementPage).isVisible({ timeout: 8000 }).catch(() => false);
  }

  async selectTab(index) {
    await this.page.locator(`${this.s.tabs} button`).nth(index).click();
    await waitForPageReady(this.page);
  }

  async getTabCount() {
    return this.page.locator(`${this.s.tabs} button`).count();
  }

  async getActiveTabText() {
    return this.page.locator(`${this.s.tabs} button[aria-selected="true"]`).textContent();
  }

  // Overview tab
  async isOverviewStatsVisible() {
    // Stats cards are in the first tab — check for "Total Payslips", "Draft", "Finalized" etc.
    const cards = this.page.locator(`${this.s.managementPage} .MuiCard-root`);
    const count = await cards.count();
    return count >= 3; // At least Total, Draft, Finalized stats
  }

  async isQuickActionsVisible() {
    const gen = await this.page.locator(this.s.generateBtn).isVisible().catch(() => false);
    const exp = await this.page.locator(this.s.exportBtn).isVisible().catch(() => false);
    const ref = await this.page.locator(this.s.refreshBtn).isVisible().catch(() => false);
    return gen && exp && ref;
  }

  // Generate tab
  async isGenerateTabReady() {
    // Check for validate & generate button visibility (may be disabled if no employees selected)
    const btn = this.page.locator(this.s.validateGenerateBtn);
    return btn.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getEmployeeCheckboxCount() {
    return this.page.locator('input[type="checkbox"]').count();
  }

  // Search & Filters
  async searchPayslip(query) {
    const input = this.page.locator(`${this.s.search} input`);
    await input.fill(query);
    await this.page.waitForTimeout(300);
  }

  async filterByMUISelect(label, value) {
    // Click the MUI Select with the given label
    const select = this.page.getByLabel(label);
    await select.click();
    await this.page.locator(`li[role="option"]`).filter({ hasText: value }).click();
    await this.page.waitForTimeout(300);
  }

  // Quick action buttons
  async clickGenerate() {
    await this.page.locator(this.s.generateBtn).click();
  }

  async clickExport() {
    await this.page.locator(this.s.exportBtn).click();
  }

  async clickRefresh() {
    await this.page.locator(this.s.refreshBtn).click();
    await waitForPageReady(this.page);
  }

  async clickValidateAndGenerate() {
    await this.page.locator(this.s.validateGenerateBtn).click();
  }

  // Bulk operations
  async bulkFinalize() {
    await this.page.locator(this.s.bulkFinalizeBtn).click();
  }

  async bulkMarkPaid() {
    await this.page.locator(this.s.bulkPaidBtn).click();
  }

  async bulkDelete() {
    await this.page.locator(this.s.bulkDeleteBtn).click();
  }

  // Table interactions
  async getPayslipTableRowCount() {
    const rows = this.page.locator('table tbody tr');
    return rows.count();
  }

  async selectFirstTableCheckbox() {
    const checkbox = this.page.locator('table tbody tr:first-child input[type="checkbox"]');
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
      return true;
    }
    return false;
  }

  async selectAllTableCheckboxes() {
    const headerCheckbox = this.page.locator('table thead input[type="checkbox"]');
    if (await headerCheckbox.isVisible().catch(() => false)) {
      await headerCheckbox.click();
      return true;
    }
    return false;
  }

  // Row action buttons (via aria-label)
  async clickViewDetails(index = 0) {
    await this.page.getByRole('button', { name: /View details/i }).nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async clickDownloadPDF(index = 0) {
    await this.page.getByRole('button', { name: /Download PDF/i }).nth(index).click();
  }

  async clickFinalizePayslip(index = 0) {
    await this.page.getByRole('button', { name: /Finalize payslip/i }).nth(index).click();
  }

  async clickEditPayslip(index = 0) {
    await this.page.getByRole('button', { name: /Edit payslip/i }).nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async clickMarkAsPaid(index = 0) {
    await this.page.getByRole('button', { name: /Mark as paid/i }).nth(index).click();
  }

  // View payslip dialog
  async isViewDialogOpen() {
    return this.page.locator('[role="dialog"]').filter({ hasText: 'Payslip Details' })
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async closeViewDialog() {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Payslip Details' });
    await dialog.getByRole('button', { name: /Close/i }).click();
    await this.page.waitForTimeout(300);
  }

  async isViewDialogFieldsPresent() {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Payslip Details' });
    const hasEmployee = await dialog.locator('text=Employee Information').isVisible().catch(() => false);
    const hasPayPeriod = await dialog.locator('text=Pay Period').isVisible().catch(() => false);
    const hasStatus = await dialog.locator('text=Status').isVisible().catch(() => false);
    const hasNetPay = await dialog.locator('text=Net Pay').isVisible().catch(() => false);
    return hasEmployee && hasPayPeriod && hasStatus && hasNetPay;
  }

  // Validation dialog
  async isValidationDialogOpen() {
    return this.page.locator('[role="dialog"]').filter({ hasText: 'Pre-Generation Validation' })
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async closeValidationDialog() {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Pre-Generation Validation' });
    await dialog.getByRole('button', { name: /Cancel/i }).click();
    await this.page.waitForTimeout(300);
  }

  // Edit payslip dialog
  async isEditDialogOpen() {
    return this.page.locator('[role="dialog"]').filter({ hasText: 'Edit Payslip' })
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async fillEditReason(reason) {
    await this.page.locator(`${this.s.editReason} textarea`).first().fill(reason);
  }

  async clickEditSave() {
    await this.page.locator(this.s.editSaveBtn).click();
  }

  async closeEditDialog() {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Edit Payslip' });
    await dialog.getByRole('button', { name: /Cancel/i }).click();
    await this.page.waitForTimeout(300);
  }

  // ─── Employee Payslips ─────────────────
  async gotoMyPayslips() {
    const url = this.page.url();
    if (!url.includes('/employee-payslips')) {
      await this.page.goto('/employee-payslips');
    }
    await waitForPageReady(this.page);
  }

  async isEmployeePageVisible() {
    return this.page.locator(this.s.employeePage).isVisible({ timeout: 8000 }).catch(() => false);
  }

  async isSummaryCardsVisible() {
    const page = this.page.locator(this.s.employeePage);
    const totalPayslips = await page.locator('text=Total Payslips').isVisible().catch(() => false);
    const totalEarnings = await page.locator('text=Total Earnings').isVisible().catch(() => false);
    const avgPay = await page.locator('text=Average Monthly Pay').isVisible().catch(() => false);
    return totalPayslips && totalEarnings && avgPay;
  }

  async isTableColumnsVisible() {
    const headers = ['Pay Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', 'Actions'];
    for (const h of headers) {
      const visible = await this.page.locator(`th`).filter({ hasText: h }).isVisible().catch(() => false);
      if (!visible) return false;
    }
    return true;
  }

  async filterByYear(year) {
    // MUI Select: click the hidden select, then pick from dropdown
    const selectInput = this.page.locator(`${this.s.yearFilter}`);
    // Find the clickable wrapper
    const wrapper = selectInput.locator('xpath=ancestor::div[contains(@class, "MuiFormControl")]');
    const clickTarget = wrapper.locator('[role="combobox"]').first();
    if (await clickTarget.isVisible().catch(() => false)) {
      await clickTarget.click();
    } else {
      // Fallback: click the select itself
      await this.page.getByLabel('Filter by Year').click();
    }
    await this.page.locator(`li[role="option"]`).filter({ hasText: String(year) }).click();
    await this.page.waitForTimeout(300);
  }

  async viewPayslip(index = 0) {
    await this.page.locator(this.s.viewBtn).nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async downloadPayslip(index = 0) {
    await this.page.locator(this.s.downloadBtn).nth(index).click();
  }

  async clickBackButton() {
    await this.page.locator(this.s.backBtn).click();
    await waitForPageReady(this.page);
  }

  async getEmployeePayslipRowCount() {
    return this.page.locator(`${this.s.employeePage} table tbody tr`).count();
  }

  // ─── Payslip Template Configuration ────
  async gotoTemplateConfig() {
    const url = this.page.url();
    if (!url.includes('/admin/payslip-templates')) {
      await this.page.goto('/admin/payslip-templates');
    }
    await waitForPageReady(this.page);
  }

  async isTemplatePageVisible() {
    return this.page.locator(this.s.templatePage).isVisible({ timeout: 8000 }).catch(() => false);
  }

  async isCreateTemplateBtnVisible() {
    return this.page.locator(this.s.templateCreateBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getTemplateCardCount() {
    return this.page.locator(`${this.s.templatePage} .MuiCard-root`).count();
  }

  // ─── Aliases for backward compat ───────
  async search(q) { return this.searchPayslip(q); }
  async clickValidateGenerate() { return this.clickValidateAndGenerate(); }
  async clickBulkFinalize() { return this.bulkFinalize(); }
  async clickBulkMarkPaid() { return this.bulkMarkPaid(); }
  async clickViewFirst() { return this.viewPayslip(0); }
  async clickDownloadFirst() { return this.downloadPayslip(0); }
}

module.exports = PayrollPage;
