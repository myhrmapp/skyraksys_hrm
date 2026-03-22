/**
 * Dashboard Page Object Model — handles Admin, Employee, Manager dashboards
 */
const selectors = require('../lib/object-repository');

class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  // ─── Admin Dashboard ────────────────────
  async isAdminDashboardVisible() {
    try {
      await this.page.locator(selectors.adminDashboard.refreshButton).waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch { return false; }
  }

  async clickRefresh() {
    await this.page.locator(selectors.adminDashboard.refreshButton).click();
  }

  async getStatCardText(statKey) {
    const sel = selectors.adminDashboard[statKey];
    if (!sel) throw new Error(`Unknown stat: ${statKey}`);
    return this.page.locator(sel).textContent();
  }

  async clickAdminAction(action) {
    const map = {
      addEmployee:   selectors.adminDashboard.btnAddEmployee,
      leaveRequests: selectors.adminDashboard.btnLeaveRequests,
      timesheets:    selectors.adminDashboard.btnTimesheets,
      payroll:       selectors.adminDashboard.btnPayroll,
    };
    await this.page.locator(map[action]).click();
  }

  // ─── Employee Dashboard ─────────────────
  async isEmployeeDashboardVisible() {
    try {
      await this.page.locator(selectors.employeeDashboard.heading).waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch { return false; }
  }

  async clickQuickAction(action) {
    const map = {
      timesheet:    selectors.employeeDashboard.actionTimesheet,
      leaveRequest: selectors.employeeDashboard.actionLeaveRequest,
      payslips:     selectors.employeeDashboard.actionPayslips,
      profile:      selectors.employeeDashboard.actionProfile,
    };
    await this.page.locator(map[action]).click();
  }

  // ─── Manager Dashboard ──────────────────
  async isManagerDashboardVisible() {
    try {
      await this.page.locator(selectors.managerDashboard.heading).waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch { return false; }
  }

  async clickManagerAction(action) {
    const map = {
      approveLeaves:     selectors.managerDashboard.btnApproveLeaves,
      approveTimesheets: selectors.managerDashboard.btnApproveTS,
      viewTeam:          selectors.managerDashboard.btnViewTeam,
    };
    await this.page.locator(map[action]).click();
  }

  // Aliases used by specs
  async clickAdminRefresh() { return this.clickRefresh(); }
  async clickEmployeeQuickAction(action) { return this.clickQuickAction(action); }
}

module.exports = DashboardPage;
