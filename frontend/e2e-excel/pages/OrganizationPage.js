/**
 * Organization Page Object Model — Departments, Positions, Holidays
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class OrganizationPage {
  constructor(page) {
    this.page = page;
  }

  // ─── Departments ───────────────────────
  async gotoDepartments() {
    await this.page.goto('/departments');
    await waitForPageReady(this.page);
  }

  async searchDept(term) {
    await this.page.locator(`${selectors.department.search} input`).fill(term);
  }

  async clickAddDept() {
    await this.page.locator(selectors.department.addBtn).click();
  }

  async saveDept() {
    await this.page.locator(selectors.department.saveBtn).click();
  }

  async editDept(index = 0) {
    await this.page.locator(selectors.department.editBtn).nth(index).click();
  }

  async deleteDept(index = 0) {
    await this.page.locator(selectors.department.deleteBtn).nth(index).click();
  }

  // ─── Positions ─────────────────────────
  async gotoPositions() {
    await this.page.goto('/positions');
    await waitForPageReady(this.page);
  }

  async clickAddPosition() {
    await this.page.locator(selectors.position.addBtn).click();
  }

  async savePosition() {
    await this.page.locator(selectors.position.saveBtn).click();
  }

  async editPosition(index = 0) {
    await this.page.locator(selectors.position.editBtn).nth(index).click();
  }

  async deletePosition(index = 0) {
    await this.page.locator(selectors.position.deleteBtn).nth(index).click();
  }

  // ─── Holidays ──────────────────────────
  async gotoHolidays() {
    await this.page.goto('/holidays');
    await waitForPageReady(this.page);
  }

  async clickAddHoliday() {
    await this.page.locator(selectors.holiday.addBtn).first().click();
  }

  async saveHoliday() {
    await this.page.locator(selectors.holiday.saveBtn).click();
  }

  async deleteHoliday(index = 0) {
    await this.page.locator(selectors.holiday.deleteBtn).nth(index).click();
  }

  // Aliases used by specs
  async searchDepartment(t) { return this.searchDept(t); }
  async clickAddDepartment() { return this.clickAddDept(); }
  async clickSaveDepartment() { return this.saveDept(); }
  async clickEditDepartment() { return this.editDept(); }
  async clickDeleteDepartment() { return this.deleteDept(); }
  async clickSavePosition() { return this.savePosition(); }
  async clickDeletePosition() { return this.deletePosition(); }
  async clickSaveHoliday() { return this.saveHoliday(); }
}

module.exports = OrganizationPage;
