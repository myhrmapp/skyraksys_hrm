/**
 * User Management Page Object Model
 * Covers /user-management — Create User tab & Manage Users tab
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class UserManagementPage {
  constructor(page) {
    this.page = page;
    this.s = selectors.userManagement;
  }

  // ─── Navigation ────────────────────────
  async gotoUserManagement() {
    await this.page.goto('/user-management');
    await waitForPageReady(this.page);
  }

  async isPageVisible() {
    return this.page.locator(this.s.page)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  // ─── Tab Switching ─────────────────────
  async clickCreateTab() {
    const tab = this.page.locator(this.s.tabCreate);
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    return false;
  }

  async clickManageTab() {
    const tab = this.page.locator(this.s.tabManage);
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    return false;
  }

  // ─── Create User Form ─────────────────
  async fillEmail(email) {
    const input = this.page.locator(`${this.s.emailInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(email);
      return true;
    }
    return false;
  }

  async fillFirstName(name) {
    const input = this.page.locator(`${this.s.firstNameInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(name);
      return true;
    }
    return false;
  }

  async fillLastName(name) {
    const input = this.page.locator(`${this.s.lastNameInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(name);
      return true;
    }
    return false;
  }

  async selectRole(role) {
    const hidden = this.page.locator(`${this.s.roleSelect}`);
    const wrapper = hidden.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]');
    const clickTarget = wrapper.first();
    if (await clickTarget.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickTarget.scrollIntoViewIfNeeded();
      await clickTarget.click({ force: true });
      await this.page.waitForTimeout(300);
      const option = this.page.getByRole('option', { name: new RegExp(role, 'i') });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        return true;
      }
    }
    return false;
  }

  async fillPassword(password) {
    const input = this.page.locator(`${this.s.passwordInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(password);
      return true;
    }
    return false;
  }

  async fillConfirmPassword(password) {
    const input = this.page.locator(`${this.s.confirmPassInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(password);
      return true;
    }
    return false;
  }

  async clickSubmit() {
    const btn = this.page.locator(this.s.submitBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async isSubmitEnabled() {
    const btn = this.page.locator(this.s.submitBtn);
    return btn.isEnabled({ timeout: 2000 }).catch(() => false);
  }

  // ─── Manage Users Tab ─────────────────
  async searchUsers(term) {
    const input = this.page.locator(`${this.s.searchInput} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async filterByRole(role) {
    const hidden = this.page.locator(`${this.s.roleFilter}`);
    const wrapper = hidden.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]');
    const clickTarget = wrapper.first();
    if (await clickTarget.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickTarget.scrollIntoViewIfNeeded();
      await clickTarget.click({ force: true });
      await this.page.waitForTimeout(300);
      const option = this.page.getByRole('option', { name: new RegExp(role, 'i') });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        return true;
      }
    }
    return false;
  }

  async filterByStatus(status) {
    const hidden = this.page.locator(`${this.s.statusFilter}`);
    const wrapper = hidden.locator('xpath=ancestor::div[contains(@class,"MuiSelect") or contains(@class,"MuiInputBase")]');
    const clickTarget = wrapper.first();
    if (await clickTarget.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickTarget.scrollIntoViewIfNeeded();
      await clickTarget.click({ force: true });
      await this.page.waitForTimeout(300);
      const option = this.page.getByRole('option', { name: new RegExp(status, 'i') });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        return true;
      }
    }
    return false;
  }

  async getUserTableRowCount() {
    const rows = this.page.locator('table tbody tr, .MuiDataGrid-row');
    const count = await rows.count();
    return count;
  }

  async isCreateTabVisible() {
    return this.page.locator(this.s.tabCreate)
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isManageTabVisible() {
    return this.page.locator(this.s.tabManage)
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickEditOnRow(index = 0) {
    const editBtns = this.page.locator('button, [role="button"]').filter({ has: this.page.locator('svg[data-testid="EditIcon"]') });
    if (await editBtns.nth(index).isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtns.nth(index).click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickToggleStatusOnRow(index = 0) {
    const toggleBtns = this.page.locator('button, [role="button"]').filter({ has: this.page.locator('svg[data-testid="BlockIcon"], svg[data-testid="CheckCircleIcon"], svg[data-testid="PersonOffIcon"]') });
    if (await toggleBtns.nth(index).isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleBtns.nth(index).click();
      await this.page.waitForTimeout(500);
      return true;
    }
    // Fallback: look for a status toggle switch
    const switches = this.page.locator('table tbody tr, .MuiDataGrid-row').nth(index).locator('.MuiSwitch-root, input[type="checkbox"]');
    if (await switches.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await switches.first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async confirmDialog() {
    const btn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"], button:has-text("Confirm"), button:has-text("Yes")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async changeUserRole(index, newRole) {
    const edited = await this.clickEditOnRow(index);
    if (!edited) return false;
    await this.selectRole(newRole);
    const saveBtn = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }
}

module.exports = UserManagementPage;
