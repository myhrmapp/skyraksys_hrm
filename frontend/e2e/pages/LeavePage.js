/**
 * Leave Page Object Model — Request, Management, Balance, Types, Accrual
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class LeavePage {
  constructor(page) {
    this.page = page;
    this.s = selectors.leave;
    this.mgmt = selectors.leaveManagement;
    this.bal = selectors.leaveBalance;
  }

  // ─── Leave Request (Employee) ───────────
  async gotoRequest() {
    await this.page.goto('/leave-requests');
    await waitForPageReady(this.page);
  }

  async selectLeaveType(type) {
    // data-testid is on hidden <input> inside MUI Select; click the visible wrapper
    const hiddenInput = this.page.locator(this.s.typeSelect);
    const wrapper = hiddenInput.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]').first();
    if (await wrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(type, 'i') }).first().click();
      await this.page.waitForTimeout(300);
    }
  }

  _toMMDDYYYY(isoDate) {
    // Convert YYYY-MM-DD to MM/DD/YYYY for DatePicker input
    const [y, m, d] = isoDate.split('-');
    return `${m}/${d}/${y}`;
  }

  async fillStartDate(date) {
    // data-testid is on the <input> itself
    const input = this.page.locator(this.s.startDate);
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      const formatted = this._toMMDDYYYY(date);
      await input.click({ clickCount: 3 });
      await input.press('Backspace');
      await input.type(formatted, { delay: 50 });
    }
  }

  async fillEndDate(date) {
    const input = this.page.locator(this.s.endDate);
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      const formatted = this._toMMDDYYYY(date);
      await input.click({ clickCount: 3 });
      await input.press('Backspace');
      await input.type(formatted, { delay: 50 });
    }
  }

  async fillReason(reason) {
    // data-testid is on the <textarea> itself (multiline TextField)
    const textarea = this.page.locator(this.s.reasonInput);
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill(reason);
    }
  }

  async submitRequest() {
    await this.page.locator(this.s.submitBtn).click();
  }

  async cancelRequest() {
    await this.page.locator(this.s.cancelBtn).click();
  }

  async isSubmitEnabled() {
    const btn = this.page.locator(this.s.submitBtn);
    return btn.isEnabled({ timeout: 2000 }).catch(() => false);
  }

  // ─── Employee Leave Requests History ────
  async isEmployeeRequestsTableVisible() {
    return this.page.locator(this.mgmt.requestsTableEmp)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getEmployeeRequestCount() {
    return this.page.locator(`${this.mgmt.requestsTableEmp} tbody tr`).count();
  }

  async isNewRequestButtonVisible() {
    return this.page.locator(this.mgmt.newRequestBtn)
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickNewRequest() {
    await this.page.locator(this.mgmt.newRequestBtn).click();
    await this.page.waitForTimeout(500);
  }

  async getLeaveBalanceCards() {
    const cards = this.page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: /balance|available|total|used/i });
    return cards.count();
  }

  async getRequestStatusChips() {
    const chips = this.page.locator('table .MuiChip-root, .MuiChip-root');
    const count = await chips.count();
    const statuses = [];
    for (let i = 0; i < count; i++) {
      statuses.push((await chips.nth(i).textContent()).trim().toUpperCase());
    }
    return statuses;
  }

  async clickCancelOnFirstPending() {
    const cancelBtn = this.page.locator('button').filter({ hasText: /cancel/i }).first();
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await this.page.waitForTimeout(500);
      // Confirm dialog if any
      const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"]');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      return true;
    }
    return false;
  }

  // ─── Leave Management (Admin/HR/Manager) ───
  async gotoManagement() {
    await this.page.goto('/leave-management');
    await waitForPageReady(this.page);
  }

  async isManagementTableVisible() {
    return this.page.locator(this.mgmt.requestsTable)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getManagementRequestCount() {
    return this.page.locator(`${this.mgmt.requestsTable} tbody tr`).count();
  }

  async searchManagement(term) {
    // data-testid is on the hidden <input> of MUI TextField
    const input = this.page.locator(this.mgmt.search);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
      return true;
    }
    // Fallback: try the visible input wrapper
    const visibleInput = this.page.locator(`${this.mgmt.search}`).locator('xpath=ancestor::div[contains(@class,"MuiTextField")]//input').first();
    if (await visibleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await visibleInput.fill(term);
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async filterManagementByStatus(status) {
    const filterToggle = this.page.locator(this.mgmt.filtersButton);
    if (await filterToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterToggle.click();
      await this.page.waitForTimeout(300);
    }
    // MUI Select — data-testid on hidden input, click ancestor wrapper
    const select = this.page.locator(this.mgmt.statusSelect);
    const wrapper = select.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]').first();
    if (await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"], li').filter({ hasText: new RegExp(status, 'i') }).first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async filterManagementByType(type) {
    const filterToggle = this.page.locator(this.mgmt.filtersButton);
    if (await filterToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterToggle.click();
      await this.page.waitForTimeout(300);
    }
    const select = this.page.locator(this.mgmt.typeSelect);
    const wrapper = select.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]').first();
    if (await wrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wrapper.scrollIntoViewIfNeeded();
      await wrapper.click({ force: true });
      await this.page.locator('[role="option"], li').filter({ hasText: new RegExp(type, 'i') }).first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickManagementTab(tabLabel) {
    const tab = this.page.getByRole('tab', { name: new RegExp(tabLabel, 'i') });
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async approveLeave() {
    const btn = this.page.locator(this.s.approveBtn).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      // Handle confirm dialog
      const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"]');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      return true;
    }
    return false;
  }

  async rejectLeave() {
    const btn = this.page.locator(this.s.rejectBtn).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      // Fill rejection reason if dialog appears
      const reasonField = this.page.locator('textarea, input[name="reason"], input[name="comments"]').first();
      if (await reasonField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonField.fill('Automation test rejection');
      }
      const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"], button:has-text("Reject")').last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      return true;
    }
    return false;
  }

  async isApproveButtonVisible() {
    return this.page.locator(this.s.approveBtn).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isRejectButtonVisible() {
    return this.page.locator(this.s.rejectBtn).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Leave Balance ─────────────────────
  async gotoBalance() {
    await this.page.goto('/admin/leave-balances');
    await waitForPageReady(this.page);
  }

  async isBalancePageVisible() {
    return this.page.locator('table, .MuiDataGrid-root, .MuiCard-root')
      .first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  async initializeBalances() {
    const btn = this.page.locator(this.s.balanceInitBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async searchBalance(term) {
    const input = this.page.locator(this.bal.searchInput);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Leave Types ───────────────────────
  async gotoTypes() {
    await this.page.goto('/admin/leave-types');
    await waitForPageReady(this.page);
  }

  async isTypesPageVisible() {
    return this.page.locator('table, .MuiCard-root')
      .first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAddType() {
    await this.page.locator(this.s.typeAddBtn).click();
    await this.page.waitForTimeout(500);
  }

  async fillTypeName(name) {
    const input = this.page.getByLabel(/leave type name/i);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(name);
    }
  }

  async fillTypeMaxDays(days) {
    const input = this.page.getByLabel(/max days/i);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(String(days));
    }
  }

  async saveType() {
    await this.page.locator(this.s.typeSaveBtn).click();
    // Wait for the dialog to fully close before proceeding (up to 15s for API)
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(async () => {
      // If dialog is still open (e.g. API error), force close with Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    });
    await this.page.waitForTimeout(500);
  }

  async cancelTypeDialog() {
    const btn = this.page.locator(this.s.typeCancelBtn);
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
    }
  }

  async getTypeCount() {
    return this.page.locator('table tbody tr').count();
  }

  async clickEditType(index = 0) {
    const btn = this.page.locator(this.s.typeEditBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickDeleteType(index = 0) {
    // Ensure no dialog is blocking before clicking delete
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(this.s.typeDeleteBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Leave Accrual ─────────────────────
  async gotoAccrual() {
    await this.page.goto('/admin/leave-accrual');
    await waitForPageReady(this.page);
  }

  async isAccrualPageVisible() {
    return this.page.locator('table, .MuiCard-root, .MuiPaper-root')
      .first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAccrualPreviewTab() {
    const tab = this.page.getByRole('tab', { name: /preview/i });
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickRunAccrual() {
    const btn = this.page.locator(this.s.accrualRunBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickCarryForward() {
    const btn = this.page.locator(this.s.accrualCarryForward);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // Aliases used by specs
  async selectType(type) { return this.selectLeaveType(type); }
  async approveFirst() { return this.approveLeave(); }
  async rejectFirst() { return this.rejectLeave(); }
}

module.exports = LeavePage;
