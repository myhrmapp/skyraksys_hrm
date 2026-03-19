/**
 * Employee Page Object Model — List, Form, Profile
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady } = require('../fixtures/test-fixtures');

class EmployeePage {
  constructor(page) {
    this.page = page;
    this.s = selectors.employee;
  }

  // ─── List ───────────────────────────────
  async gotoList() {
    await this.page.goto('/employees');
    await waitForPageReady(this.page);
  }

  async search(term) {
    await this.page.locator(`${this.s.listSearch} input`).fill(term);
  }

  async filterByStatus(status) {
    await this.page.locator(this.s.listFilterStatus).click();
    await this.page.locator(`li[data-value="${status}"]`).click();
  }

  async filterByDepartment(dept) {
    await this.page.locator(this.s.listFilterDept).click();
    await this.page.locator(`li:has-text("${dept}")`).click();
  }

  async clickAddEmployee() {
    await this.page.locator(this.s.listAddBtn).click();
  }

  async clickExport() {
    await this.page.locator(this.s.listExportBtn).click();
  }

  async getTableRowCount() {
    return this.page.locator(`${this.s.table} tbody tr`).count();
  }

  async clickEmployeeRow(index = 0) {
    await this.page.locator(`${this.s.table} tbody tr`).nth(index).click();
  }

  // ─── Form ──────────────────────────────
  async gotoCreate() {
    await this.page.goto('/employees/create');
    await waitForPageReady(this.page);
  }

  async fillPersonalInfo(data) {
    const fields = {
      firstName: this.s.fieldFirstName,
      lastName:  this.s.fieldLastName,
      email:     this.s.fieldEmail,
      phone:     this.s.fieldPhone,
      nationality: this.s.fieldNationality,
      address:   this.s.fieldAddress,
      city:      this.s.fieldCity,
      state:     this.s.fieldState,
      pinCode:   this.s.fieldPinCode,
    };

    for (const [key, selector] of Object.entries(fields)) {
      if (data[key]) {
        await this.page.locator(`${selector} input`).fill(String(data[key]));
      }
    }
  }

  async clickNextTab() {
    await this.page.locator(this.s.formNextBtn).click();
  }

  async clickPrevTab() {
    await this.page.locator(this.s.formPrevBtn).click();
  }

  async clickSubmit() {
    await this.page.locator(this.s.formSubmitBtn).click();
  }

  async clickCancel() {
    await this.page.locator(this.s.formCancelBtn).click();
  }

  async selectTab(tabName) {
    const tabMap = {
      personal:   this.s.tabPersonal,
      employment: this.s.tabEmployment,
      emergency:  this.s.tabEmergency,
      statutory:  this.s.tabStatutory,
    };
    await this.page.locator(tabMap[tabName]).click();
  }

  // ─── Profile ───────────────────────────
  async clickBackFromProfile() {
    await this.page.locator(this.s.profileBackBtn).click();
  }

  async clickEditFromProfile() {
    await this.page.locator(this.s.profileEditBtn).click();
  }

  // Aliases used by specs
  async clickAdd() { return this.clickAddEmployee(); }
  async gotoTab(name) { return this.selectTab(name); }
}

module.exports = EmployeePage;
