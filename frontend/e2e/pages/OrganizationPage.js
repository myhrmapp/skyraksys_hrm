/**
 * Organization Page Object Model — Departments, Positions, Holidays
 * All live under /organization with tabs.
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class OrganizationPage {
  constructor(page) {
    this.page = page;
  }

  // ─── Organization Hub ──────────────────
  async gotoOrganization() {
    await this.page.goto('/organization');
    await waitForPageReady(this.page);
  }

  async isOrgPageVisible() {
    return this.page.locator('[data-testid="organization-settings-page"]')
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickTab(tabLabel) {
    const tab = this.page.getByRole('tab', { name: new RegExp(tabLabel, 'i') });
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Departments ───────────────────────
  async gotoDepartments() {
    await this.page.goto('/organization');
    await waitForPageReady(this.page);
    await this.clickTab('Departments');
  }

  async isDeptPageVisible() {
    return this.page.locator(selectors.department.page)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async searchDept(term) {
    const input = this.page.locator(`${selectors.department.search} input`);
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(term);
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async clickAddDept() {
    const btn = this.page.locator(selectors.department.addBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async fillDeptForm({ name, description, status }) {
    if (name) {
      const nameInput = this.page.locator('#departmentName, input[id="departmentName"]');
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(name);
      } else {
        // Fallback to label
        const fallback = this.page.getByLabel(/department name/i);
        if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
          await fallback.fill(name);
        }
      }
    }
    if (description) {
      const descInput = this.page.getByLabel(/description/i);
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill(description);
      }
    }
    if (status) {
      const statusSelect = this.page.getByLabel(/status/i);
      if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = statusSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(status, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async assignDeptManager(managerName) {
    const autocomplete = this.page.locator('#departmentManager');
    if (await autocomplete.isVisible({ timeout: 3000 }).catch(() => false)) {
      await autocomplete.fill(managerName);
      await this.page.waitForTimeout(500);
      const option = this.page.locator('[role="option"]').filter({ hasText: new RegExp(managerName, 'i') }).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async saveDept() {
    const btn = this.page.locator(selectors.department.saveBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      // Wait for the dialog to fully close before proceeding
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(async () => {
        // Dialog still open (e.g. API error/validation) — force close with Escape
        await this.page.keyboard.press('Escape');
        await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
      });
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async editDept(index = 0) {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(selectors.department.editBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async deleteDept(index = 0) {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(selectors.department.deleteBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async confirmDialog() {
    const confirmBtn = this.page.locator('[data-testid="confirm-dialog-confirm-btn"]');
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async cancelDialog() {
    const cancelBtn = this.page.locator('[data-testid="confirm-dialog-cancel-btn"]');
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }
    // If no cancel button, try Escape to close any open dialog
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    return false;
  }

  async getDeptCount() {
    // Try table rows first
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) return count;
    // Try card layout
    return this.page.locator('.MuiCard-root').filter({ hasText: /department|active|inactive/i }).count();
  }

  // ─── Positions ─────────────────────────
  async gotoPositions() {
    await this.page.goto('/organization');
    await waitForPageReady(this.page);
    await this.clickTab('Positions');
  }

  async isPositionPageVisible() {
    return this.page.locator(selectors.position.page)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAddPosition() {
    const btn = this.page.locator(selectors.position.addBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async fillPositionForm({ title, department, level }) {
    if (title) {
      const titleInput = this.page.getByLabel(/position title|title/i).first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill(title);
      }
    }
    if (department) {
      // MUI Select with data-testid="position-department-select"
      const deptSelect = this.page.locator('[data-testid="position-department-select"]');
      if (await deptSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = deptSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(department, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
    if (level) {
      const levelSelect = this.page.locator('[data-testid="position-level-select"]');
      if (await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const parent = levelSelect.locator('..');
        await parent.click({ force: true });
        await this.page.locator('[role="option"]').filter({ hasText: new RegExp(level, 'i') }).first().click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async savePosition() {
    const btn = this.page.locator(selectors.position.saveBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      // Wait for the dialog to fully close before proceeding
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(async () => {
        // Dialog still open (e.g. API error/validation) — force close with Escape
        await this.page.keyboard.press('Escape');
        await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
      });
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async editPosition(index = 0) {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(selectors.position.editBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async deletePosition(index = 0) {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(selectors.position.deleteBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async getPositionCount() {
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) return count;
    return this.page.locator('.MuiCard-root').filter({ hasText: /position|title/i }).count();
  }

  // ─── Holidays ──────────────────────────
  async gotoHolidays() {
    await this.page.goto('/organization');
    await waitForPageReady(this.page);
    await this.clickTab('Holidays');
  }

  async isHolidayPageVisible() {
    return this.page.locator(selectors.holiday.page)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAddHoliday() {
    const btn = this.page.locator(selectors.holiday.addBtn).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async fillHolidayForm({ name, date }) {
    const dialog = this.page.locator('[role="dialog"]');
    if (name) {
      const nameInput = dialog.getByLabel(/holiday name/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(name);
      }
    }
    if (date) {
      const dateInput = dialog.locator('input[type="date"]');
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(date);
      }
    }
  }

  async saveHoliday() {
    const btn = this.page.locator(selectors.holiday.saveBtn);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      // Wait for the dialog to fully close before proceeding
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(async () => {
        // Dialog still open (e.g. API error/validation) — force close with Escape
        await this.page.keyboard.press('Escape');
        await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
      });
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  async deleteHoliday(index = 0) {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 }).catch(() => {});
    const btn = this.page.locator(selectors.holiday.deleteBtn).nth(index);
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // Aliases used by specs
  async searchDepartment(t) { return this.searchDept(t); }
  async clickAddDepartment() { return this.clickAddDept(); }
  async clickSaveDepartment() { return this.saveDept(); }
  async clickEditDepartment(i) { return this.editDept(i); }
  async clickDeleteDepartment(i) { return this.deleteDept(i); }
  async clickSavePosition() { return this.savePosition(); }
  async clickDeletePosition(i) { return this.deletePosition(i); }
  async clickSaveHoliday() { return this.saveHoliday(); }
}

module.exports = OrganizationPage;
