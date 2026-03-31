/**
 * Employee Page Object Model — List, Form, Profile, Delete, Edit
 * Covers all employee CRUD operations for all roles.
 */
const selectors = require('../lib/object-repository');
const { waitForPageReady, API_URL } = require('../fixtures/test-fixtures');

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

  /** Switch from card view (default) to list/table view */
  async switchToListView() {
    const toggle = this.page.locator(this.s.viewToggleList || '[data-testid="employee-list-view-toggle-list"]');
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  /** Switch to card view */
  async switchToCardView() {
    const toggle = this.page.locator(this.s.viewToggleCards || '[data-testid="employee-list-view-toggle-cards"]');
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  /** Ensure we are in table/list view before table operations */
  async ensureTableView() {
    const tableVisible = await this.page.locator(this.s.table).isVisible({ timeout: 1500 }).catch(() => false);
    if (!tableVisible) {
      await this.switchToListView();
      await this.page.locator(this.s.table).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
  }

  /** Ensure we are in card view */
  async ensureCardView() {
    const cardBtn = this.page.locator(this.s.cardDeleteBtn || '[data-testid="employee-card-delete-btn"]').first();
    const isCard = await cardBtn.isVisible({ timeout: 1500 }).catch(() => false);
    if (!isCard) {
      await this.switchToCardView();
      await this.page.waitForTimeout(500);
    }
  }

  async search(term) {
    const input = this.page.locator(`${this.s.listSearch} input`);
    await input.clear();
    await input.fill(term);
    await this.page.waitForTimeout(600); // debounce
  }

  async clearSearch() {
    await this.page.locator(`${this.s.listSearch} input`).clear();
    await this.page.waitForTimeout(600);
  }

  async filterByStatus(status) {
    await this.page.locator(this.s.listFilterStatus).click();
    await this.page.locator(`li[data-value="${status}"]`).click();
    await this.page.waitForTimeout(500);
  }

  async filterByDepartment(dept) {
    // Departments are loaded asynchronously from API
    // Wait for the network idle to ensure departments API response is received
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000);
    await this.page.locator(this.s.listFilterDept).click();
    await this.page.waitForTimeout(500);
    // MUI Select renders options in a listbox popover
    const option = this.page.locator(`[role="option"]:has-text("${dept}")`);
    const optionExists = await option.isVisible({ timeout: 5000 }).catch(() => false);
    if (optionExists) {
      await option.click();
    } else {
      // Fallback: close dropdown and pick any non-"All" option if available
      const anyOption = this.page.locator('[role="option"]').nth(1);
      const anyExists = await anyOption.isVisible({ timeout: 2000 }).catch(() => false);
      if (anyExists) {
        await anyOption.click();
      } else {
        // No departments available — press Escape to close
        await this.page.keyboard.press('Escape');
      }
    }
    await this.page.waitForTimeout(500);
  }

  async clickAddEmployee() {
    await this.page.locator(this.s.listAddBtn).click();
    await waitForPageReady(this.page);
  }

  async clickExport() {
    await this.page.locator(this.s.listExportBtn).click();
  }

  async getTableRowCount() {
    await this.ensureTableView();
    return this.page.locator(`${this.s.table} tbody tr`).count();
  }

  async isTableVisible() {
    await this.ensureTableView();
    return this.page.locator(this.s.table).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async isAddButtonVisible() {
    return this.page.locator(this.s.listAddBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isExportButtonVisible() {
    return this.page.locator(this.s.listExportBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  /** Click view action for an employee row by index */
  async clickViewEmployee(index = 0) {
    await this.ensureTableView();
    const viewBtn = this.page.locator(this.s.tableViewBtn || '[data-testid="employee-table-view-btn"]').nth(index);
    await viewBtn.click();
    await waitForPageReady(this.page);
  }

  /** Click edit action for an employee row by index */
  async clickEditEmployee(index = 0) {
    await this.ensureTableView();
    const editBtn = this.page.locator(this.s.tableEditBtn || '[data-testid="employee-table-edit-btn"]').nth(index);
    await editBtn.click();
    await waitForPageReady(this.page);
  }

  /** Click delete action for an employee card by index (card view has delete, table view does not) */
  async clickDeleteEmployee(index = 0) {
    await this.ensureCardView();
    const deleteBtn = this.page.locator(this.s.cardDeleteBtn || '[data-testid="employee-card-delete-btn"]').nth(index);
    await deleteBtn.click();
  }

  /** Confirm delete in the dialog */
  async confirmDelete() {
    await this.page.locator(this.s.deleteConfirmBtn).click();
  }

  /** Cancel delete in the dialog */
  async cancelDelete() {
    await this.page.locator(this.s.deleteCancelBtn).click();
  }

  /** Check if delete dialog is visible */
  async isDeleteDialogVisible() {
    return this.page.locator(this.s.deleteConfirmBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickEmployeeRow(index = 0) {
    await this.ensureTableView();
    await this.page.locator(`${this.s.table} tbody tr`).nth(index).click();
  }

  /** Get employee name text from a table row */
  async getEmployeeNameFromRow(index = 0) {
    await this.ensureTableView();
    const row = this.page.locator(`${this.s.table} tbody tr`).nth(index);
    return row.locator('td').first().textContent();
  }

  // ─── Form ──────────────────────────────
  async gotoCreate() {
    await this.page.goto('/employees/create');
    await waitForPageReady(this.page);
  }

  async gotoEdit(employeeId) {
    await this.page.goto(`/employees/${employeeId}/edit`);
    await waitForPageReady(this.page);
  }

  async fillPersonalInfo(data) {
    const fields = {
      firstName:   this.s.fieldFirstName,
      lastName:    this.s.fieldLastName,
      email:       this.s.fieldEmail,
      phone:       this.s.fieldPhone,
      employeeId:  this.s.fieldEmployeeId,
      nationality: this.s.fieldNationality,
      city:        this.s.fieldCity,
      state:       this.s.fieldState,
      pinCode:     this.s.fieldPinCode,
    };

    for (const [key, selector] of Object.entries(fields)) {
      if (data[key]) {
        const input = this.page.locator(`${selector} input`);
        await input.clear();
        await input.fill(String(data[key]));
      }
    }

    // Address field is a multiline TextField — renders as <textarea>
    if (data.address) {
      const textarea = this.page.locator(`${this.s.fieldAddress} textarea`).first();
      await textarea.clear();
      await textarea.fill(String(data.address));
    }

    // Date of birth (date input)
    if (data.dateOfBirth) {
      await this.page.locator(`${this.s.fieldDateOfBirth} input`).fill(data.dateOfBirth);
    }

    // Gender (Select dropdown via inputProps data-testid)
    if (data.gender) {
      const genderSelect = this.page.locator(`${this.s.fieldGender}`).locator('..');
      // For MUI Select rendered via inputProps, we need the parent FormControl
      const formControl = this.page.locator('[id="gender"]').locator('..');
      await formControl.click();
      await this.page.locator(`li[data-value="${data.gender}"]`).click();
    }

    // Marital status
    if (data.maritalStatus) {
      const formControl = this.page.locator('[id="maritalStatus"]').locator('..');
      await formControl.click();
      await this.page.locator(`li[data-value="${data.maritalStatus}"]`).click();
    }
  }

  async fillEmploymentInfo(data) {
    // Hire date
    if (data.hireDate) {
      await this.page.locator(`${this.s.fieldHireDate} input`).fill(data.hireDate);
    }

    // Department (MUI Select)
    if (data.department) {
      await this.page.locator('[id="departmentId"]').locator('..').click();
      await this.page.locator(`li:has-text("${data.department}")`).click();
      await this.page.waitForTimeout(300); // Wait for position cascading update
    }

    // Position (MUI Select)
    if (data.position) {
      await this.page.locator('[id="positionId"]').locator('..').click();
      await this.page.locator(`li:has-text("${data.position}")`).click();
    }

    // Manager (MUI Select)
    if (data.manager) {
      await this.page.locator('[id="managerId"]').locator('..').click();
      await this.page.locator(`li:has-text("${data.manager}")`).click();
    }

    // Employment type
    if (data.employmentType) {
      await this.page.locator('[id="employmentType"]').locator('..').click();
      await this.page.locator(`li[data-value="${data.employmentType}"]`).click();
    }

    // Work location
    if (data.workLocation) {
      const input = this.page.locator(`${this.s.fieldWorkLocation} input`);
      await input.clear();
      await input.fill(data.workLocation);
    }

    // Probation period
    if (data.probationPeriod) {
      const input = this.page.locator(`${this.s.fieldProbationPeriod} input`);
      await input.clear();
      await input.fill(String(data.probationPeriod));
    }

    // Notice period
    if (data.noticePeriod) {
      const input = this.page.locator(`${this.s.fieldNoticePeriod} input`);
      await input.clear();
      await input.fill(String(data.noticePeriod));
    }
  }

  async fillEmergencyContact(data) {
    if (data.emergencyName) {
      const input = this.page.locator(`${this.s.fieldEmergencyName} input`);
      await input.clear();
      await input.fill(data.emergencyName);
    }
    if (data.emergencyPhone) {
      const input = this.page.locator(`${this.s.fieldEmergencyPhone} input`);
      await input.clear();
      await input.fill(data.emergencyPhone);
    }
  }

  async fillStatutoryBanking(data) {
    const fields = {
      aadharNumber: this.s.fieldAadharNumber,
      panNumber:    this.s.fieldPanNumber,
      uanNumber:    this.s.fieldUanNumber,
      pfNumber:     this.s.fieldPfNumber,
      esiNumber:    this.s.fieldEsiNumber,
      bankName:     this.s.fieldBankName,
      bankAccount:  this.s.fieldBankAccount,
      bankIfsc:     this.s.fieldBankIfsc,
      bankBranch:   this.s.fieldBankBranch,
    };

    for (const [key, selector] of Object.entries(fields)) {
      if (data[key]) {
        const input = this.page.locator(`${selector} input`);
        await input.clear();
        await input.fill(String(data[key]));
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
    const locator = this.page.locator(tabMap[tabName]);
    if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locator.click();
    }
  }

  /** Check if the submit button is visible (used for role verification) */
  async isSubmitButtonVisible() {
    return this.page.locator(this.s.formSubmitBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  /** Get a form field value */
  async getFieldValue(fieldTestId) {
    const input = this.page.locator(`[data-testid="${fieldTestId}"] input`);
    if (await input.count() > 0) return input.inputValue();
    // Fallback for textarea fields (e.g., address)
    const textarea = this.page.locator(`[data-testid="${fieldTestId}"] textarea`).first();
    if (await textarea.count() > 0) return textarea.inputValue();
    return '';
  }

  /** Check if a success alert is visible after submit */
  async isSuccessAlertVisible() {
    return this.page.locator('.MuiAlert-standardSuccess, [role="alert"]').filter({ hasText: /success|created|updated/i })
      .isVisible({ timeout: 8000 }).catch(() => false);
  }

  /** Check if an error alert is visible */
  async isErrorAlertVisible() {
    return this.page.locator('.MuiAlert-standardError, [role="alert"]').filter({ hasText: /error|fail|invalid/i })
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  /** Handle unsaved changes dialog — stay or leave */
  async handleUnsavedDialog(action = 'stay') {
    if (action === 'stay') {
      await this.page.locator(this.s.unsavedStayBtn).click();
    } else {
      await this.page.locator(this.s.unsavedLeaveBtn).click();
    }
  }

  // ─── Profile ───────────────────────────
  async clickBackFromProfile() {
    await this.page.locator(this.s.profileBackBtn).click();
  }

  async clickEditFromProfile() {
    await this.page.locator(this.s.profileEditBtn).click();
    await waitForPageReady(this.page);
  }

  async isProfileHeaderVisible() {
    return this.page.locator(this.s.profileHeader).isVisible({ timeout: 8000 }).catch(() => false);
  }

  async isEditButtonVisibleOnProfile() {
    return this.page.locator(this.s.profileEditBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }
  /** Check if profile is in edit mode (save button visible in header or footer) */
  async isProfileInEditMode() {
    const headerSave = this.page.locator(this.s.profileSaveBtn || '[data-testid="employee-profile-save-btn"]');
    const footerSave = this.page.locator(this.s.profileFooterSaveBtn || '[data-testid="employee-profile-footer-save-btn"]');
    return (
      await headerSave.isVisible({ timeout: 3000 }).catch(() => false) ||
      await footerSave.isVisible({ timeout: 3000 }).catch(() => false)
    );
  }

  /** Save changes in profile inline edit mode */
  async saveProfileEdit() {
    const footerSave = this.page.locator(this.s.profileFooterSaveBtn || '[data-testid="employee-profile-footer-save-btn"]');
    if (await footerSave.isVisible({ timeout: 2000 }).catch(() => false)) {
      await footerSave.click();
    } else {
      const headerSave = this.page.locator(this.s.profileSaveBtn || '[data-testid="employee-profile-save-btn"]');
      await headerSave.click();
    }
    await this.page.waitForTimeout(2000);
  }

  /** Cancel profile inline edit mode */
  async cancelProfileEdit() {
    const footerCancel = this.page.locator(this.s.profileFooterCancelBtn || '[data-testid="employee-profile-footer-cancel-btn"]');
    if (await footerCancel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await footerCancel.click();
    } else {
      const headerCancel = this.page.locator(this.s.profileCancelBtn || '[data-testid="employee-profile-cancel-btn"]');
      await headerCancel.click();
    }
  }
  // ─── My Profile ────────────────────────
  async gotoMyProfile() {
    // Use profile menu trigger in the layout header
    const trigger = this.page.locator('[data-testid="layout-profile-menu-trigger"]');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    await this.page.waitForTimeout(300);

    const viewProfile = this.page.locator('[data-testid="layout-menu-view-profile"]');
    await viewProfile.waitFor({ state: 'visible', timeout: 5000 });
    await viewProfile.click();
    await waitForPageReady(this.page);
  }

  async isMyProfilePageVisible() {
    return this.page.locator(this.s.myProfilePage).isVisible({ timeout: 8000 }).catch(() => false);
  }

  // ─── API helpers for test data setup/cleanup ────
  async createEmployeeViaAPI(data = {}) {
    try {
      // Use relative URLs (via frontend proxy) so browser cookies are sent
      const deptRes = await this.page.request.get('/api/departments');
      if (!deptRes.ok()) {
        console.error(`[createEmployeeViaAPI] Failed to fetch departments: ${deptRes.status()}`);
        return null;
      }
      const deptBody = await deptRes.json();
      const depts = deptBody.data || deptBody;
      const dept = Array.isArray(depts) ? depts[0] : null;

      const posRes = await this.page.request.get('/api/positions');
      if (!posRes.ok()) {
        console.error(`[createEmployeeViaAPI] Failed to fetch positions: ${posRes.status()}`);
        return null;
      }
      const posBody = await posRes.json();
      const positions = posBody.data || posBody;
      const pos = Array.isArray(positions) ? positions[0] : null;

      if (!dept || !pos) {
        console.error('[createEmployeeViaAPI] No departments or positions found');
        return null;
      }

      const ts = Date.now();
      // Filter out undefined values from data to avoid overriding defaults
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== null)
      );
      const payload = {
        firstName: cleanData.firstName || 'E2ETest',
        lastName: cleanData.lastName || 'Employee',
        email: cleanData.email || `e2e.${ts}.${Math.random().toString(36).slice(2, 6)}@skyraksys-test.com`,
        password: cleanData.password || 'Test@12345',
        phone: cleanData.phone || '9000000001',
        hireDate: cleanData.hireDate || '2025-01-01',
        departmentId: dept?.id,
        positionId: pos?.id,
        status: 'Active',
        gender: cleanData.gender || 'Male',
        dateOfBirth: cleanData.dateOfBirth || '1990-01-01',
        nationality: cleanData.nationality || 'Indian',
        employmentType: cleanData.employmentType || 'Full-time',
        ...cleanData,
      };

      const res = await this.page.request.post('/api/employees', {
        data: payload,
        failOnStatusCode: false,
      });

      if (!res.ok()) {
        const errBody = await res.text();
        console.error(`[createEmployeeViaAPI] POST failed (${res.status()}): ${errBody}`);
        return null;
      }

      const body = await res.json();
      return body.data || body.employee || null;
    } catch (err) {
      console.error(`[createEmployeeViaAPI] Exception: ${err.message}`);
      return null;
    }
  }

  async deleteEmployeeViaAPI(id) {
    if (!id) return;
    await this.page.request.delete(`/api/employees/${id}`, { failOnStatusCode: false });
  }

  // Aliases
  async clickAdd() { return this.clickAddEmployee(); }
  async gotoTab(name) { return this.selectTab(name); }

  // ─── Additional filter methods ─────────
  async filterByEmploymentType(type) {
    await this.page.locator(this.s.listFilterEmploymentType).click();
    await this.page.locator(`li[data-value="${type}"]`).click();
    await this.page.waitForTimeout(500);
  }

  async filterByWorkLocation(location) {
    await this.page.locator(this.s.listFilterWorkLocation).click();
    await this.page.locator(`li[data-value="${location}"]`).click();
    await this.page.waitForTimeout(500);
  }

  // ─── Create User Login Account ─────────
  async clickCreateLoginFromCard(index = 0) {
    await this.ensureCardView();
    const btn = this.page.locator(this.s.cardCreateLoginBtn).nth(index);
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  async clickCreateLoginFromTable(index = 0) {
    await this.ensureTableView();
    const btn = this.page.locator(this.s.tableCreateLoginBtn).nth(index);
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  async isCreateUserDialogVisible() {
    return this.page.locator(this.s.createUserSubmitBtn).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async fillCreateUserDialog(data = {}) {
    if (data.password) {
      const pwInput = this.page.locator(`${this.s.createUserPassword} input`);
      await pwInput.clear();
      await pwInput.fill(data.password);
    }
    if (data.role) {
      await this.page.locator(this.s.createUserRole).click();
      await this.page.locator(`li[data-value="${data.role}"]`).click();
    }
  }

  async submitCreateUserDialog() {
    await this.page.locator(this.s.createUserSubmitBtn).click();
    await this.page.waitForTimeout(1500);
  }

  async cancelCreateUserDialog() {
    await this.page.locator(this.s.createUserCancelBtn).click();
  }

  // ─── Manage Login (navigate to user account page) ────
  async clickManageLoginFromCard(index = 0) {
    await this.ensureCardView();
    const btn = this.page.locator(this.s.cardManageLoginBtn).nth(index);
    await btn.click();
    await waitForPageReady(this.page);
  }

  async clickManageLoginFromTable(index = 0) {
    await this.ensureTableView();
    const btn = this.page.locator(this.s.tableManageLoginBtn).nth(index);
    await btn.click();
    await waitForPageReady(this.page);
  }

  // ─── User Account Management page ─────
  async isUserAccountPageVisible() {
    // Page shows Quick Actions heading or user account buttons
    return this.page.locator(this.s.userAcctResetPasswordBtn)
      .isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickResetPassword() {
    await this.page.locator(this.s.userAcctResetPasswordBtn).click();
    await this.page.waitForTimeout(1000);
  }

  async clickLockAccount() {
    await this.page.locator(this.s.userAcctLockBtn).click();
    await this.page.waitForTimeout(1000);
  }

  async clickSendWelcomeEmail() {
    await this.page.locator(this.s.userAcctWelcomeEmailBtn).click();
    await this.page.waitForTimeout(1000);
  }

  async clickForceLogout() {
    await this.page.locator(this.s.userAcctForceLogoutBtn).click();
    await this.page.waitForTimeout(1000);
  }

  // ─── Statutory / Banking form helpers ──
  async fillSalaryInfo(data) {
    if (data.currency) {
      await this.page.locator(this.s.salaryCurrency).click();
      await this.page.locator(`li[data-value="${data.currency}"]`).click();
    }
    if (data.payFrequency) {
      await this.page.locator(this.s.salaryPayFrequency).click();
      await this.page.locator(`li[data-value="${data.payFrequency}"]`).click();
    }
    // Basic salary (id-based since no data-testid on the TextField)
    if (data.basicSalary) {
      const input = this.page.locator('#salary\\.basicSalary, [name="salary.basicSalary"]').first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.clear();
        await input.fill(String(data.basicSalary));
      }
    }
  }

  // ─── Photo upload ──────────────────────
  async isPhotoUploadVisible() {
    return this.page.locator(this.s.photoUploadBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Payslip button ───────────────────
  async isPayslipButtonVisible() {
    return this.page.locator(this.s.profilePayslipBtn).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickViewPayslip() {
    await this.page.locator(this.s.profilePayslipBtn).click();
    await this.page.waitForTimeout(500);
  }

  // ─── Delete button visibility ──────────
  async isDeleteButtonVisibleOnCard() {
    await this.ensureCardView();
    return this.page.locator(this.s.cardDeleteBtn).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ─── Cascading dropdown check ──────────
  async isDepartmentSelectVisible() {
    return this.page.locator(this.s.fieldDepartment).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isPositionSelectVisible() {
    return this.page.locator(this.s.fieldPosition).isVisible({ timeout: 3000 }).catch(() => false);
  }

  async selectDepartment(deptName) {
    await this.page.locator(this.s.fieldDepartment).click();
    await this.page.locator(`li:has-text("${deptName}")`).click();
    await this.page.waitForTimeout(500);
  }

  async getPositionHelperText() {
    const helper = this.page.locator(`${this.s.fieldPosition}`).locator('..').locator('p.MuiFormHelperText-root');
    if (await helper.isVisible({ timeout: 2000 }).catch(() => false)) {
      return helper.textContent();
    }
    return '';
  }

  // ─── Salary: fill all allowances/deductions/benefits/tax ──
  async fillFullSalaryInfo(data) {
    // Basic salary fields (currency, payFrequency, basicSalary, effectiveFrom)
    await this.fillSalaryInfo(data);

    // Allowances
    const allowanceFields = ['hra', 'transport', 'medical', 'food', 'communication', 'special', 'other'];
    for (const key of allowanceFields) {
      if (data[`allowance_${key}`] !== undefined) {
        const input = this.page.locator(`[name="salary.allowances.${key}"], #salary\\.allowances\\.${key}`).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.clear();
          await input.fill(String(data[`allowance_${key}`]));
        }
      }
    }

    // Deductions
    const deductionFields = ['pf', 'professionalTax', 'incomeTax', 'esi', 'other'];
    for (const key of deductionFields) {
      if (data[`deduction_${key}`] !== undefined) {
        const input = this.page.locator(`[name="salary.deductions.${key}"], #salary\\.deductions\\.${key}`).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.clear();
          await input.fill(String(data[`deduction_${key}`]));
        }
      }
    }

    // Benefits
    const benefitFields = ['bonus', 'incentive', 'overtime'];
    for (const key of benefitFields) {
      if (data[`benefit_${key}`] !== undefined) {
        const input = this.page.locator(`[name="salary.benefits.${key}"], #salary\\.benefits\\.${key}`).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.clear();
          await input.fill(String(data[`benefit_${key}`]));
        }
      }
    }

    // Tax info (CTC, takeHome)
    if (data.ctc !== undefined) {
      const ctc = this.page.locator('[name="salary.taxInformation.ctc"], #salary\\.taxInformation\\.ctc').first();
      if (await ctc.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ctc.clear();
        await ctc.fill(String(data.ctc));
      }
    }
    if (data.takeHome !== undefined) {
      const th = this.page.locator('[name="salary.taxInformation.takeHome"], #salary\\.taxInformation\\.takeHome').first();
      if (await th.isVisible({ timeout: 2000 }).catch(() => false)) {
        await th.clear();
        await th.fill(String(data.takeHome));
      }
    }
  }

  // ─── Get salary field value ──
  async getSalaryFieldValue(fieldPath) {
    const input = this.page.locator(`[name="salary.${fieldPath}"], #salary\\.${fieldPath.replace(/\./g, '\\\\.')}`).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      return input.inputValue();
    }
    return '';
  }

  // ─── Get validation error text for a field ──
  async getFieldErrorText(testId) {
    const container = this.page.locator(`[data-testid="${testId}"]`);
    const helper = container.locator('p.Mui-error, .MuiFormHelperText-root.Mui-error').first();
    if (await helper.isVisible({ timeout: 3000 }).catch(() => false)) {
      return helper.textContent();
    }
    // Check aria-describedby for error
    const input = container.locator('input').first();
    const ariaId = await input.getAttribute('aria-describedby').catch(() => null);
    if (ariaId) {
      const errEl = this.page.locator(`#${ariaId}`);
      if (await errEl.isVisible({ timeout: 1000 }).catch(() => false)) {
        return errEl.textContent();
      }
    }
    return '';
  }

  // ─── Check if form has any visible error ──
  async hasAnyValidationError() {
    const errors = this.page.locator('p.Mui-error, .MuiFormHelperText-root.Mui-error');
    return (await errors.count()) > 0;
  }

  // ─── Pagination: click next page ──
  async clickNextPage() {
    const nextBtn = this.page.locator('[data-testid="employee-list-pagination"] button[aria-label*="next" i], .MuiTablePagination-actions button:last-child');
    if (await nextBtn.first().isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.first().click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // ─── Pagination: change rows per page ──
  async changeRowsPerPage(count) {
    const select = this.page.locator('.MuiTablePagination-select, [data-testid="employee-list-pagination"] select').first();
    if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
      await select.click();
      await this.page.locator(`li[data-value="${count}"]`).click();
      await this.page.waitForTimeout(500);
    }
  }

  // ─── Get positions after department selection ──
  async getPositionOptions() {
    // MUI Select: click the visible combobox div, not the hidden input
    const posCombobox = this.page.locator('#positionId');
    if (await posCombobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await posCombobox.scrollIntoViewIfNeeded();
      await posCombobox.click({ force: true });
    } else {
      await this.page.locator(this.s.fieldPosition).click({ force: true });
    }
    await this.page.waitForTimeout(500);
    const options = this.page.locator('ul[role="listbox"] li');
    const count = await options.count();
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(await options.nth(i).textContent());
    }
    // Close the dropdown
    await this.page.keyboard.press('Escape');
    return result;
  }
}

module.exports = EmployeePage;
