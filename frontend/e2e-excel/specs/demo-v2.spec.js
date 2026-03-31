/**
 * SkyrakSys HRM — Full Feature Demo v2
 * ======================================
 * HD 1920×1080 walkthrough with voiceover narration markers.
 * Covers all 4 personas: Admin · HR · Manager · Employee
 *
 * Prerequisites:
 *   1. Backend running on port 5000
 *   2. Frontend running on port 3000
 *   3. Seed: cd backend && node scripts/seed-demo-rich.js
 *
 * Command:
 *   cd frontend
 *   npx playwright test -c playwright-demo-hd.config.js demo-v2
 *
 * After recording:
 *   cd backend && node scripts/seed-demo-rich.js --purge
 *
 * ──────────────────────────────────────────────────────────────
 *  VOICEOVER SCRIPT
 * ──────────────────────────────────────────────────────────────
 *  INTRO.welcome
 *    "Welcome to SkyrakSys HRM — a complete Human Resource Management
 *     System built to streamline every aspect of your workforce. In this
 *     demo, we'll walk through every feature across four personas:
 *     Administrator, HR, Manager, and Employee."
 *
 *  ADMIN.dashboard
 *    "Logged in as the Administrator. The Admin Dashboard gives an instant
 *     overview — total headcount, employees on leave, new hires this month,
 *     and pending approvals — all at a glance."
 *
 *  ADMIN.employees.list
 *    "The Employee Directory lists your entire workforce with powerful
 *     search, department filters, and status filters."
 *
 *  ADMIN.employees.cards
 *    "Switch to Card View for a visual, photo-first layout — great for
 *     identifying team members quickly."
 *
 *  ADMIN.employees.profile
 *    "Every employee has a rich profile with tabbed sections: Personal
 *     Information, Employment Details, Emergency Contacts, and Statutory
 *     and Banking information."
 *
 *  ADMIN.leave.management
 *    "Leave Management gives the admin a complete view of all leave
 *     requests — filterable by status, type, or department."
 *
 *  ADMIN.leave.approve
 *    "Approving a leave request is a single click. The requester is
 *     notified automatically."
 *
 *  ADMIN.attendance.management
 *    "The Attendance Management screen lets administrators view, correct,
 *     and mark attendance for any employee on any date."
 *
 *  ADMIN.timesheet.approvals
 *    "All submitted timesheets appear here for review. Filter by project,
 *     employee, or date range."
 *
 *  ADMIN.payroll.management
 *    "Payroll Management covers salary processing from generation to
 *     finalisation. One click generates payslips for the selected month."
 *
 *  ADMIN.payroll.generate
 *    "The generation wizard validates timesheet data before creating
 *     payslips — preventing errors before they reach payroll."
 *
 *  ADMIN.payroll.templates
 *    "Payslip Templates let you design the exact layout and earning or
 *     deduction components that appear on employee payslips."
 *
 *  ADMIN.org.settings
 *    "Organization Settings manages your company's structural foundation —
 *     Departments, Positions, and the Holiday Calendar."
 *
 *  ADMIN.user.management
 *    "User Management controls access — create accounts, assign roles,
 *     lock users, or force logout directly from here."
 *
 *  ADMIN.reports
 *    "The Reports module delivers four high-value report types: Attendance
 *     Summary, Leave Analysis, Payroll Summary, and a complete Employee
 *     Report — all exportable."
 *
 *  ADMIN.settings
 *    "System Settings covers email configuration, security policies,
 *     backup and restore, and application branding."
 *
 *  HR.dashboard
 *    "The HR portal focuses on people operations. The dashboard surfaces
 *     leave and headcount metrics relevant to HR workflows."
 *
 *  HR.leave.balances
 *    "Leave Balance Management shows every employee's accrued, taken, and
 *     remaining leave — searchable and filterable by type or year."
 *
 *  HR.leave.accrual
 *    "The Accrual engine calculates and previews how leave days accumulate
 *     before committing — giving HR full control and transparency."
 *
 *  HR.leave.types
 *    "Leave types are fully configurable — define names, maximum days,
 *     accrual rules, and carry-forward policies for your company."
 *
 *  HR.reviews
 *    "Performance Reviews are managed from a single interface — create,
 *     track, and close review cycles across the organisation."
 *
 *  MANAGER.dashboard
 *    "The Manager Dashboard focuses on team health — pending approvals,
 *     upcoming leaves, and submitted timesheets from direct reports."
 *
 *  MANAGER.team
 *    "The Team Members tab shows each direct report with their current
 *     status, role, and leave balance summary."
 *
 *  MANAGER.leave.approval
 *    "Alice Brown has requested annual leave for next week. Managers can
 *     review the reason and approve or reject with a single action."
 *
 *  MANAGER.timesheet.approval
 *    "Alice's weekly timesheet is submitted and waiting for approval. The
 *     manager reviews hours per day and project breakdown before approving."
 *
 *  EMPLOYEE.dashboard
 *    "From the employee's perspective, the dashboard shows quick stats —
 *     pending leaves, this month's attendance, leave balance, and shortcuts
 *     to common actions."
 *
 *  EMPLOYEE.attendance
 *    "My Attendance shows today's check-in status and the full monthly
 *     calendar with colour-coded statuses — present, late, half-day,
 *     absent, and holidays."
 *
 *  EMPLOYEE.leave.submit
 *    "Submitting a leave request takes seconds — pick the type, choose
 *     dates, add a reason, and submit. The balance is shown live."
 *
 *  EMPLOYEE.timesheet
 *    "The weekly timesheet grid lets employees log hours per task and
 *     project for each day — save as draft and submit when ready."
 *
 *  EMPLOYEE.payslips
 *    "My Payslips shows a complete history of payslips. Click View to open
 *     a fully formatted payslip with all earnings and deductions detailed."
 *
 *  EMPLOYEE.tasks
 *    "My Tasks lists all tasks assigned to the employee with priority
 *     indicators, status, and project context."
 *
 *  EMPLOYEE.profile
 *    "My Profile is fully self-editable — update personal info, emergency
 *     contacts, and bank details with full audit logging."
 *
 *  EMPLOYEE.performance
 *    "The Performance Dashboard gives real-time insight into application
 *     health — page-load times, API response metrics, and client-side
 *     performance indicators — so bottlenecks are caught before they
 *     impact the workforce."
 *
 *  ADMIN.employees.payslip
 *    "Every employee profile has a direct Payslip button. Clicking it opens
 *     the fully formatted payslip — company header, earnings breakdown,
 *     deductions, and net pay in one clean view. Download as PDF or print
 *     directly from here."
 *
 *  ADMIN.employee.records
 *    "Employee Records gives a consolidated audit trail — leave history,
 *     timesheet submissions, and monthly attendance summaries — all
 *     searchable for any employee from a single screen."
 *
 *  ADMIN.user.guide
 *    "The built-in User Guide documents every module with step-by-step
 *     instructions — reducing onboarding time for new users."
 *
 *  EMPLOYEE.payslips.dialog
 *    "The formatted payslip opens in a full-screen viewer — company
 *     branding at the top, employee details, then a clear earnings and
 *     deductions table. Net pay is shown prominently at the bottom.
 *     Download as a PDF or print directly from the same screen."
 *
 *  CLOSING
 *    "SkyrakSys HRM — purpose-built for growing organisations. Every
 *     workflow, every persona, covered end to end."
 * ──────────────────────────────────────────────────────────────
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════
// CREDENTIALS
// ══════════════════════════════════════════════════════════════
const CREDS = {
  admin:    { email: 'admin@skyraksys.com',     pass: 'admin123' },
  hr:       { email: 'hr@skyraksys.com',         pass: 'admin123' },
  manager:  { email: 'lead@skyraksys.com',       pass: 'admin123' },
  employee: { email: 'employee1@skyraksys.com',  pass: 'admin123' },
};

const ALICE_EMP_ID = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466';

// ══════════════════════════════════════════════════════════════
// SELECTORS  (data-testid based, keep in sync with object-repository.js)
// ══════════════════════════════════════════════════════════════
const S = {
  login: {
    email:    '[data-testid="login-email-input"] input',
    password: '[data-testid="login-password-input"] input',
    submit:   '[data-testid="login-submit-button"]',
  },
  layout: {
    logout:   '[data-testid="layout-menu-logout"]',
    profile:  '[data-testid="layout-profile-menu-trigger"]',
  },
  adminDash: {
    root:         '[data-testid="admin-dashboard-refresh-btn"]',
    totalEmp:     '[data-testid="stat-card-total-employees"]',
    onLeave:      '[data-testid="stat-card-on-leave"]',
    newHires:     '[data-testid="stat-card-new-hires"]',
    pendingLeave: '[data-testid="stat-card-pending-leaves"]',
    submittedTS:  '[data-testid="stat-card-submitted-timesheets"]',
  },
  empDash: {
    heading:  '[data-testid="employee-dashboard-heading"]',
    pending:  '[data-testid="stat-card-pending"]',
    balance:  '[data-testid="stat-card-leave-balance"]',
    actionLeave:     '[data-testid="quick-action-leave-request"]',
    actionTimesheet: '[data-testid="quick-action-timesheet"]',
    actionPayslips:  '[data-testid="quick-action-payslips"]',
    actionProfile:   '[data-testid="quick-action-profile"]',
  },
  managerDash: {
    heading:       '[data-testid="manager-dashboard-heading"]',
    approveLeaves: '[data-testid="manager-btn-approve-leaves"]',
    approveTS:     '[data-testid="manager-btn-approve-timesheets"]',
    viewTeam:      '[data-testid="manager-btn-view-team"]',
    tabTeam:       '[data-testid="manager-tab-team-members"]',
    tabLeave:      '[data-testid="manager-tab-leave-approvals"]',
    tabTS:         '[data-testid="manager-tab-timesheet-approvals"]',
  },
  employee: {
    search:        '[data-testid="employee-list-search"]',
    table:         '[data-testid="employee-table"]',
    viewToggleList: '[data-testid="employee-list-view-toggle-list"]',
    viewToggleCards:'[data-testid="employee-list-view-toggle-cards"]',
    addBtn:        '[data-testid="employee-list-add-btn"]',
    profileHeader: '[data-testid="employee-profile-header"]',
    tabPersonal:   '[data-testid="tab-personal"]',
    tabEmployment: '[data-testid="tab-employment"]',
    tabEmergency:  '[data-testid="tab-emergency"]',
    tabStatutory:  '[data-testid="tab-statutory"]',
  },
  leave: {
    approveBtn:  '[data-testid="leave-approve-btn"]',
    rejectBtn:   '[data-testid="leave-reject-btn"]',
    submitBtn:   '[data-testid="leave-submit-btn"]',
    typeSelect:  '[data-testid="leave-type-select"]',
    startDate:   '[data-testid="leave-start-date"]',
    endDate:     '[data-testid="leave-end-date"]',
    reasonInput: '[data-testid="leave-reason-input"]',
    newRequestBtn: '[data-testid="leave-new-request-button"]',
    accrualPreview: '[data-testid="leave-accrual-preview-btn"]',
    accrualRun:    '[data-testid="leave-accrual-run-btn"]',
    typeAddBtn:   '[data-testid="leave-type-add-btn"]',
    balanceInit:  '[data-testid="leave-balance-init-btn"]',
  },
  attendance: {
    managementPage: '[data-testid="attendance-management-page"]',
    myPage:         '[data-testid="my-attendance-page"]',
    checkInBtn:     '[data-testid="attendance-checkin-btn"]',
    checkOutBtn:    '[data-testid="attendance-checkout-btn"]',
    markBtn:        '[data-testid="attendance-mark-btn"]',
    dataGrid:       '[data-testid="attendance-data-grid"]',
  },
  timesheet: {
    hub:       '[data-testid="timesheet-hub-page"]',
    entryTable:'[data-testid="timesheet-entry-table"]',
    addTask:   '[data-testid="timesheet-add-task"]',
    saveDraft: '[data-testid="timesheet-save-draft"]',
    submitBtn: '[data-testid="timesheet-submit"]',
    approvalSearch: '[data-testid="ts-approval-search-input"]',
  },
  payroll: {
    management: '[data-testid="payroll-management-page"]',
    generateBtn:'[data-testid="payroll-generate-btn"]',
    exportBtn:  '[data-testid="payroll-export-btn"]',
    tabs:       '[data-testid="payroll-tabs"]',
    templatePage:'[data-testid="payslip-template-config-page"]',
    empPage:    '[data-testid="employee-payslips-page"]',
    viewBtn:    '[data-testid="payslip-view-btn"]',
    downloadBtn:'[data-testid="payslip-download-btn"]',
  },
  tasks: {
    page:          '[data-testid="my-tasks-page"]',
    search:        '[data-testid="tasks-search"]',
    statusFilter:  '[data-testid="tasks-status-filter"]',
    priorityFilter:'[data-testid="tasks-priority-filter"]',
  },
  review: {
    page:      '[data-testid="reviews-page"]',
    newBtn:    '[data-testid="reviews-new-btn"]',
    search:    '[data-testid="reviews-search"]',
  },
  org: {
    deptPage:  '[data-testid="department-management-page"]',
    posPage:   '[data-testid="position-management-page"]',
    holPage:   '[data-testid="holiday-calendar-page"]',
    addDept:   '[data-testid="dept-add-btn"]',
  },
  userMgmt: {
    page:      '[data-testid="user-management-page"]',
    tabManage: '[data-testid="usermgmt-tab-manage"]',
    search:    '[data-testid="usermgmt-search-input"]',
  },
  project: {
    page:      '[data-testid="project-task-config-page"]',
    tabProj:   '[data-testid="ptc-tab-projects"]',
    tabTasks:  '[data-testid="ptc-tab-tasks"]',
  },
  perf: {
    page:        '[data-testid="performance-dashboard-page"]',
    refreshBtn:  '[data-testid="perf-refresh-btn"]',
    autoRefresh: '[data-testid="perf-auto-refresh-toggle"]',
    tabClient:   '[data-testid="perf-tab-client"]',
    tabServer:   '[data-testid="perf-tab-server"]',
  },
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

async function wait(page, ms = 1200) {
  await page.waitForTimeout(ms);
}

async function ready(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await wait(page, 800);
}

/** Push a narration marker and pause briefly for voiceover cue. */
async function narrate(page, markers, label) {
  markers.push({ label, time: Date.now(), iso: new Date().toISOString() });
  await wait(page, 600);
}

/** Glow-highlight an element for the given duration (ms). */
async function highlight(page, selectorOrLocator, duration = 2200) {
  try {
    const el = typeof selectorOrLocator === 'string'
      ? page.locator(selectorOrLocator).first()
      : selectorOrLocator;
    await el.evaluate((node) => {
      const prev = node.style.cssText;
      node.dataset._prevStyle = prev;
      node.style.setProperty('box-shadow', '0 0 0 3px #FF6B35, 0 0 24px 10px rgba(255,107,53,0.45)', 'important');
      node.style.setProperty('border-radius', '6px', 'important');
      node.style.setProperty('transition', 'box-shadow 0.3s ease', 'important');
      node.style.setProperty('position', 'relative', 'important');
      node.style.setProperty('z-index', '9999', 'important');
    });
    await page.waitForTimeout(duration);
    await el.evaluate((node) => {
      node.style.cssText = node.dataset._prevStyle || '';
      delete node.dataset._prevStyle;
    });
  } catch (_) { /* element not found — skip gracefully */ }
}

/** Attempt to highlight multiple selectors (highlights first that exists). */
async function highlightFirst(page, selectors, duration = 2200) {
  for (const s of selectors) {
    const count = await page.locator(s).count();
    if (count > 0) {
      await highlight(page, s, duration);
      return;
    }
  }
}

/** Log in as a given role. */
async function login(page, creds) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="login-email-input"] input', { timeout: 15000 });
  await wait(page, 500);
  await smartFill(page, S.login.email,    creds.email);
  await wait(page, 400);
  await smartFill(page, S.login.password, creds.pass);
  await wait(page, 400);
  await highlight(page, S.login.submit, 1000);
  await page.click(S.login.submit);
  await ready(page);
}

/** Log out via the profile menu. */
async function logout(page) {
  await wait(page, 800);
  await page.click(S.layout.profile).catch(() => {});
  await wait(page, 600);
  await page.click(S.layout.logout).catch(() => {});
  await ready(page);
  await wait(page, 500);
}

/** Navigate to a route and wait for page to settle. */
async function nav(page, route) {
  await page.goto(route);
  await ready(page);
}

/** Smoothly scroll to the bottom of the page and back. */
async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 180) {
      window.scrollTo({ top: y, behavior: 'smooth' });
      await delay(120);
    }
    await delay(800);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await delay(400);
  });
}

/** Scroll down by pixels. */
async function scrollDown(page, amount = 400) {
  await page.evaluate((px) => window.scrollBy({ top: px, behavior: 'smooth' }), amount);
  await wait(page, 600);
}

/** Click a MUI Tab by visible text. */
async function clickTab(page, name) {
  const tab = page.getByRole('tab', { name, exact: false });
  if (await tab.count() > 0) {
    await tab.first().click();
    await wait(page, 800);
  }
}

/** Click a button by test-id. */
async function clickButton(page, testId) {
  const btn = page.locator(`[data-testid="${testId}"]`);
  if (await btn.count() > 0) {
    await highlight(page, btn, 1200);
    await btn.first().click();
    await ready(page);
  }
}

/** Scroll the MUI Dialog content area (not the backdrop) by the given pixel amount. */
async function scrollDialogContent(page, amount = 400) {
  await page.evaluate((px) => {
    const el = document.querySelector('.MuiDialogContent-root');
    if (el) el.scrollBy({ top: px, behavior: 'smooth' });
  }, amount);
  await wait(page, 700);
}

/** Highlight an element INSIDE the dialog by CSS selector (scoped to dialog). */
async function highlightInDialog(page, cssSelector, duration = 2200) {
  try {
    await page.locator(`[role="dialog"] ${cssSelector}`).first().evaluate((node) => {
      const prev = node.style.cssText;
      node.dataset._prevStyle = prev;
      node.style.setProperty('box-shadow', '0 0 0 3px #FF6B35, 0 0 24px 10px rgba(255,107,53,0.45)', 'important');
      node.style.setProperty('border-radius', '6px', 'important');
      node.style.setProperty('transition', 'box-shadow 0.3s ease', 'important');
      node.style.setProperty('z-index', '9999', 'important');
    });
    await page.waitForTimeout(duration);
    await page.locator(`[role="dialog"] ${cssSelector}`).first().evaluate((node) => {
      node.style.cssText = node.dataset._prevStyle || '';
      delete node.dataset._prevStyle;
    });
  } catch (_) { /* element not in dialog — skip gracefully */ }
}

/** Safe click: only if the locator is visible. */
async function safeClick(page, selector) {
  const el = page.locator(selector).first();
  if (await el.count() > 0 && await el.isVisible()) {
    await el.click();
    await wait(page, 600);
  }
}

/**
 * Fill a value into a field — handles MUI TextField wrappers transparently.
 * If the selector resolves to a non-editable wrapper div (MuiTextField),
 * it falls back to the inner <input> or <textarea>.
 */
async function smartFill(page, selector, value) {
  const locator = typeof selector === 'string'
    ? page.locator(selector).first()
    : selector;
  try {
    const tag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'div');
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      await locator.fill(value);
    } else {
      // MUI wrapper — target inner input or textarea
      const inner = page.locator(`${selector} input, ${selector} textarea`).first();
      const count = await inner.count().catch(() => 0);
      if (count > 0) {
        await inner.fill(value);
      } else {
        await locator.fill(value); // last resort
      }
    }
  } catch (_) {
    // Ultimate fallback: type character by character
    await locator.pressSequentially(value, { delay: 60 }).catch(() => {});
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN DEMO TEST
// ══════════════════════════════════════════════════════════════

test.describe('SkyrakSys HRM — Full Feature Demo v2', () => {
  test('HD Demo Recording — All Personas', async ({ page }) => {
    const markers = [];

    // ──────────────────────────────────────────────────────────
    // INTRO
    // ──────────────────────────────────────────────────────────
    await page.goto('/');
    await ready(page);
    await narrate(page, markers, 'INTRO.welcome');
    // Hold on login screen for intro voiceover
    await wait(page, 5000);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 1 — ADMINISTRATOR
    // ══════════════════════════════════════════════════════════

    // ── A1: Login + Admin Dashboard ───────────────────────────
    await login(page, CREDS.admin);
    await narrate(page, markers, 'ADMIN.dashboard');

    // Highlight stat cards
    await highlight(page, S.adminDash.totalEmp,     1500);
    await highlight(page, S.adminDash.onLeave,      1200);
    await highlight(page, S.adminDash.newHires,     1200);
    await highlight(page, S.adminDash.pendingLeave, 1200);
    await highlight(page, S.adminDash.submittedTS,  1200);
    await scrollDown(page, 400);
    await wait(page, 400);

    // ── A2: Employee List ──────────────────────────────────────
    await nav(page, '/employees');
    await narrate(page, markers, 'ADMIN.employees.list');
    await highlight(page, S.employee.search,          1200);
    await smartFill(page, S.employee.search, 'Alice');
    await wait(page, 1200);
    await highlight(page, S.employee.table,           1500);
    await smartFill(page, S.employee.search, '');
    await wait(page, 600);

    // Filter by department
    const deptFilter = page.locator('[data-testid="employee-list-filter-department"]');
    if (await deptFilter.count() > 0) {
      await highlight(page, deptFilter, 1200);
    }

    // ── A3: Card View ─────────────────────────────────────────
    await narrate(page, markers, 'ADMIN.employees.cards');
    await safeClick(page, S.employee.viewToggleCards);
    await wait(page, 1000);
    await scrollDown(page, 400);
    await wait(page, 800);
    await safeClick(page, S.employee.viewToggleList);
    await wait(page, 600);

    // ── A3a: Add Employee Form ────────────────────────────────
    await narrate(page, markers, 'ADMIN.employees.addForm');
    await safeClick(page, S.employee.addBtn);
    await wait(page, 1200);
    // Walk through all 3 form tabs: Personal Info, Employment & Compensation, Statutory
    await clickTab(page, 'Personal');
    await scrollDown(page, 500);
    await wait(page, 800);
    await clickTab(page, 'Employment');
    await scrollDown(page, 500);
    await wait(page, 800);
    await clickTab(page, 'Statutory');
    await scrollDown(page, 500);
    await wait(page, 800);
    // Go back to employee list without saving
    await page.goBack();
    await ready(page);

    // ── A3b: Employee Profile ──────────────────────────────────
    await nav(page, `/employees/${ALICE_EMP_ID}`);
    await narrate(page, markers, 'ADMIN.employees.profile');
    const profileHeader = page.locator(S.employee.profileHeader);
    if (await profileHeader.count() > 0) {
      await highlight(page, profileHeader, 2000);
    }
    await wait(page, 800);

    // Walk through all 4 profile tabs
    for (const tab of ['Personal', 'Employment', 'Emergency', 'Statutory']) {
      await clickTab(page, tab);
      await scrollDown(page, 500);
      await wait(page, 600);
    }

    // ── A3c: Payslip from Employee Profile (admin) ────────────
    await narrate(page, markers, 'ADMIN.employees.payslip');
    const profilePayslipBtn = page.locator('[data-testid="employee-profile-payslip-btn"]');
    if (await profilePayslipBtn.count() > 0 && await profilePayslipBtn.isVisible()) {
      await highlight(page, profilePayslipBtn, 1200);
      await profilePayslipBtn.click();
      // Wait for the payslip dialog to render
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      await wait(page, 800);
      // Highlight key sections: header, salary table, net pay
      await highlightInDialog(page, '.payslip-header', 1200);
      await scrollDialogContent(page, 300);
      await highlightInDialog(page, '.salary-table', 1500);
      await scrollDialogContent(page, 400);
      await highlightInDialog(page, '.net-pay-row', 1500);
      await wait(page, 400);
      // Close the dialog
      await page.locator('[role="dialog"] button').filter({ hasText: 'Close' }).first().click().catch(async () => {
        await page.keyboard.press('Escape');
      });
      await wait(page, 400);
    }

    // ── A3d: Employee Records ──────────────────────────────────
    await nav(page, '/employee-records');
    await narrate(page, markers, 'ADMIN.employee.records');
    const recSearch = page.locator('[data-testid="employee-records-search"]');
    if (await recSearch.count() > 0) {
      await highlight(page, recSearch, 1200);
    }
    await wait(page, 600);
    for (const recTab of ['records-tab-leave', 'records-tab-timesheet', 'records-tab-attendance']) {
      const tab = page.locator(`[data-testid="${recTab}"]`);
      if (await tab.count() > 0) {
        await highlight(page, tab, 800);
        await tab.click();
        await wait(page, 500);
        await scrollDown(page, 300);
        await wait(page, 300);
      }
    }

    // ── A4: Leave Management — Admin view ─────────────────────
    await nav(page, '/leave-management');
    await narrate(page, markers, 'ADMIN.leave.management');
    await highlight(page, '[data-testid="leave-mgmt-requests-table"]', 1500);
    await wait(page, 600);

    // Status filter demonstration
    const leaveStatusFilter = page.locator('[data-testid="leave-mgmt-status-select"]');
    if (await leaveStatusFilter.count() > 0) {
      await highlight(page, leaveStatusFilter, 1500);
    }

    // Approve Alice's pending leave (DEMO_LEAVE_ID created by seed-demo-rich.js)
    await narrate(page, markers, 'ADMIN.leave.approve');
    const pendingRow = page.locator('[data-testid="leave-mgmt-requests-table"] tr').filter({ hasText: 'Pending' }).first();
    if (await pendingRow.count() > 0) {
      await pendingRow.scrollIntoViewIfNeeded();
      await highlight(page, pendingRow, 2000);
      const approveBtn = pendingRow.locator('[data-testid="leave-approve-btn"]');
      if (await approveBtn.count() > 0) {
        await highlight(page, approveBtn, 1200);
        await approveBtn.click();
        await ready(page);
        await wait(page, 600);
      }
    }

    // ── A5: Attendance Management ──────────────────────────────
    await nav(page, '/attendance-management');
    await narrate(page, markers, 'ADMIN.attendance.management');
    if (await page.locator(S.attendance.managementPage).count() > 0) {
      await highlight(page, S.attendance.managementPage, 1500);
    }
    await highlight(page, S.attendance.dataGrid, 1500).catch(() => {});
    await scrollDown(page, 300);
    await wait(page, 600);

    // Show mark attendance button
    if (await page.locator(S.attendance.markBtn).count() > 0) {
      await highlight(page, S.attendance.markBtn, 1200);
    }

    // ── A6: Timesheet Approvals (admin/manager view) ───────────
    await nav(page, '/timesheets');
    await narrate(page, markers, 'ADMIN.timesheet.approvals');
    await clickTab(page, 'Approvals');
    await wait(page, 800);
    const approvalSearch = page.locator(S.timesheet.approvalSearch);
    if (await approvalSearch.count() > 0) {
      await highlight(page, approvalSearch, 1200);
      await smartFill(page, S.timesheet.approvalSearch, 'Alice');
      await wait(page, 1000);
      await smartFill(page, S.timesheet.approvalSearch, '');
    }
    await scrollDown(page, 300);
    await wait(page, 600);

    // ── A7: Payroll Management ────────────────────────────────
    await nav(page, '/payroll-management');
    await narrate(page, markers, 'ADMIN.payroll.management');
    if (await page.locator(S.payroll.management).count() > 0) {
      await highlight(page, S.payroll.management, 1500);
    }
    await scrollDown(page, 400);

    // Tabs: Overview, Salary Structures, Generate
    for (const tab of ['Overview', 'Salary Structures', 'Generate']) {
      await clickTab(page, tab);
      await wait(page, 800);
      if (tab === 'Generate') {
        await narrate(page, markers, 'ADMIN.payroll.generate');
        if (await page.locator(S.payroll.generateBtn).count() > 0) {
          await highlight(page, S.payroll.generateBtn, 1200);
          await page.locator(S.payroll.generateBtn).click();
          await ready(page);
          await wait(page, 1500); // show generated payslips
          await scrollDown(page, 400);
        }
      }
    }
    await clickTab(page, 'Overview');
    await wait(page, 600);

    // Show payslip for Alice via employee payslips page
    await narrate(page, markers, 'ADMIN.payroll.templates');
    await nav(page, '/admin/payslip-templates');
    if (await page.locator(S.payroll.templatePage).count() > 0) {
      await highlight(page, S.payroll.templatePage, 1500);
    }
    await scrollDown(page, 400);

    // ── A8: Organization Settings ──────────────────────────────
    await nav(page, '/organization');
    await narrate(page, markers, 'ADMIN.org.settings');

    // Departments tab
    await clickTab(page, 'Departments');
    if (await page.locator(S.org.deptPage).count() > 0) {
      await highlight(page, S.org.deptPage, 1500);
    }
    await highlight(page, S.org.addDept, 1200).catch(() => {});
    await scrollDown(page, 400);

    // Positions tab
    await clickTab(page, 'Positions');
    await wait(page, 600);
    await scrollDown(page, 400);

    // Holidays tab
    await clickTab(page, 'Holidays');
    await wait(page, 600);
    if (await page.locator(S.org.holPage).count() > 0) {
      await highlight(page, S.org.holPage, 1500);
    }
    await scrollDown(page, 400);

    // ── A9: User Management ────────────────────────────────────
    await nav(page, '/user-management');
    await narrate(page, markers, 'ADMIN.user.management');
    if (await page.locator(S.userMgmt.page).count() > 0) {
      await highlight(page, S.userMgmt.page, 1500);
    }
    await clickTab(page, 'Manage Users');
    await wait(page, 600);
    const userSearch = page.locator(S.userMgmt.search);
    if (await userSearch.count() > 0) {
      await highlight(page, userSearch, 1200);
    }
    await scrollDown(page, 400);

    // ── A10: Reports ───────────────────────────────────────────
    await nav(page, '/reports');
    await narrate(page, markers, 'ADMIN.reports');
    for (const tab of ['Attendance', 'Leave', 'Payroll', 'Employee']) {
      await clickTab(page, tab);
      await wait(page, 800);
      await scrollDown(page, 200);
      await wait(page, 400);
    }

    // ── A11: System Settings ───────────────────────────────────
    await nav(page, '/admin/settings-hub');
    await narrate(page, markers, 'ADMIN.settings');
    await scrollDown(page, 500);

    // ── A12: Projects & Tasks Config ──────────────────────────
    await nav(page, '/project-task-config');
    if (await page.locator(S.project.page).count() > 0) {
      await highlight(page, S.project.page, 1500);
    }
    await clickTab(page, 'Projects');
    await wait(page, 600);
    await clickTab(page, 'Tasks');
    await wait(page, 600);

    // ── A13: User Guide ────────────────────────────────────────
    await nav(page, '/user-guide');
    await narrate(page, markers, 'ADMIN.user.guide');
    await wait(page, 600);
    await scrollDown(page, 500);

    // ── Logout Admin ──────────────────────────────────────────
    await logout(page);
    await wait(page, 800);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 2 — HR
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.hr);
    await narrate(page, markers, 'HR.dashboard');
    await scrollDown(page, 500);

    // ── H1: Employee list (HR managing employees) ──────────────
    await nav(page, '/employees');
    await wait(page, 600);
    await highlight(page, S.employee.table, 1500);
    await scrollDown(page, 300);
    await wait(page, 600);

    // ── H2: Leave Balance Management ──────────────────────────
    await nav(page, '/admin/leave-balances');
    await narrate(page, markers, 'HR.leave.balances');
    const balanceSearch = page.locator('[data-testid="leave-search-input"]');
    if (await balanceSearch.count() > 0) {
      await highlight(page, balanceSearch, 1200);
      await smartFill(page, '[data-testid="leave-search-input"]', 'Alice');
      await wait(page, 1000);
      await smartFill(page, '[data-testid="leave-search-input"]', '');
    }
    const yearSelect = page.locator('[data-testid="leave-year-select"]');
    if (await yearSelect.count() > 0) {
      await highlight(page, yearSelect, 1200);
    }
    await scrollDown(page, 400);

    // Init / create balance button
    const initBtn = page.locator(S.leave.balanceInit);
    if (await initBtn.count() > 0) {
      await highlight(page, initBtn, 1500);
    }

    // ── H3: Leave Accrual ──────────────────────────────────────
    await nav(page, '/admin/leave-accrual');
    await narrate(page, markers, 'HR.leave.accrual');
    const previewBtn = page.locator(S.leave.accrualPreview);
    if (await previewBtn.count() > 0) {
      await highlight(page, previewBtn, 1500);
    }
    await scrollDown(page, 400);

    // ── H4: Leave Types Management ────────────────────────────
    await nav(page, '/admin/leave-types');
    await narrate(page, markers, 'HR.leave.types');
    const typeAddBtn = page.locator(S.leave.typeAddBtn);
    if (await typeAddBtn.count() > 0) {
      await highlight(page, typeAddBtn, 1500);
    }
    await scrollDown(page, 400);

    // ── H5: Performance Reviews ────────────────────────────────
    await nav(page, '/employee-reviews');
    await narrate(page, markers, 'HR.reviews');
    if (await page.locator(S.review.page).count() > 0) {
      await highlight(page, S.review.page, 1500);
    }
    const reviewNew = page.locator(S.review.newBtn);
    if (await reviewNew.count() > 0) {
      await highlight(page, reviewNew, 1500);
    }
    await scrollDown(page, 400);

    // ── Logout HR ─────────────────────────────────────────────
    await logout(page);
    await wait(page, 800);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 3 — MANAGER
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.manager);
    await narrate(page, markers, 'MANAGER.dashboard');

    // Highlight manager dashboard quick-action buttons
    for (const sel of [S.managerDash.approveLeaves, S.managerDash.approveTS, S.managerDash.viewTeam]) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        await highlight(page, btn, 1200);
      }
    }
    await scrollDown(page, 500);

    // ── M1: Team Members ──────────────────────────────────────
    const teamTab = page.locator(S.managerDash.tabTeam);
    if (await teamTab.count() > 0) {
      await highlight(page, teamTab, 1200);
      await teamTab.click();
      await ready(page);
      await narrate(page, markers, 'MANAGER.team');
      await scrollDown(page, 500);
    }

    // ── M2: Leave Approvals ────────────────────────────────────
    const leaveTab = page.locator(S.managerDash.tabLeave);
    if (await leaveTab.count() > 0) {
      await highlight(page, leaveTab, 1200);
      await leaveTab.click();
      await ready(page);
      await narrate(page, markers, 'MANAGER.leave.approval');
      await wait(page, 600);

      // Find and approve Alice's pending leave (reset by seed / approved by admin above)
      // Navigate to leave-management for full approval flow
      await nav(page, '/leave-management');
      await wait(page, 800);
      const firstPending = page.locator('[data-testid="leave-mgmt-requests-table"] tr')
        .filter({ hasText: 'Pending' }).first();
      if (await firstPending.count() > 0) {
        await firstPending.scrollIntoViewIfNeeded();
        await highlight(page, firstPending, 2000);
        const approveBtn = firstPending.locator('[data-testid="leave-approve-btn"]');
        if (await approveBtn.count() > 0) {
          await highlight(page, approveBtn, 1200);
          await approveBtn.click();
          await ready(page);
          await wait(page, 1000);
        }
      } else {
        // Show the table even if no pending items
        await highlight(page, '[data-testid="leave-mgmt-requests-table"]', 2000).catch(() => {});
      }
    }

    // ── M3: Timesheet Approvals ────────────────────────────────
    await nav(page, '/timesheets');
    await clickTab(page, 'Approvals');
    await ready(page);
    await narrate(page, markers, 'MANAGER.timesheet.approval');
    await wait(page, 800);

    // Find Alice's submitted timesheet and approve it
    const tsRows = page.locator('tr').filter({ hasText: 'Alice' });
    if (await tsRows.count() > 0) {
      const firstRow = tsRows.first();
      await firstRow.scrollIntoViewIfNeeded();
      await highlight(page, firstRow, 2000);
      // Look for approve button near this row
      const approveInRow = firstRow.locator('button').filter({ hasText: /approve/i });
      if (await approveInRow.count() > 0) {
        await highlight(page, approveInRow, 1200);
        await approveInRow.click();
        await ready(page);
        await wait(page, 1000);
      } else {
        // Try generic approve button on page
        const pageApproveBtn = page.locator('button').filter({ hasText: /approve/i }).first();
        if (await pageApproveBtn.count() > 0) {
          await highlight(page, pageApproveBtn, 1200);
          await pageApproveBtn.click();
          await ready(page);
          await wait(page, 800);
        }
      }
    } else {
      // Show the approvals tab content
      await scrollDown(page, 500);
    }

    // ── Logout Manager ────────────────────────────────────────
    await logout(page);
    await wait(page, 800);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 4 — EMPLOYEE
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.employee);
    await narrate(page, markers, 'EMPLOYEE.dashboard');

    // Highlight employee dashboard stat cards
    for (const sel of [S.empDash.pending, S.empDash.balance]) {
      const card = page.locator(sel);
      if (await card.count() > 0) {
        await highlight(page, card, 1500);
      }
    }
    // Quick-action shortcuts
    for (const sel of [S.empDash.actionLeave, S.empDash.actionTimesheet, S.empDash.actionPayslips, S.empDash.actionProfile]) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        await highlight(page, btn, 1000);
      }
    }
    await scrollDown(page, 500);

    // ── E1: My Attendance ──────────────────────────────────────
    await nav(page, '/my-attendance');
    await narrate(page, markers, 'EMPLOYEE.attendance');
    if (await page.locator(S.attendance.myPage).count() > 0) {
      await highlight(page, S.attendance.myPage, 1500);
    }

    // Check-in / Check-out button — highlight whichever is visible
    await highlightFirst(page, [S.attendance.checkInBtn, S.attendance.checkOutBtn], 1800);
    // Monthly calendar
    await scrollDown(page, 400);
    await wait(page, 800);
    // Month/year selectors
    const monthSelect = page.locator('[data-testid="attendance-month-select"]');
    if (await monthSelect.count() > 0) {
      await highlight(page, monthSelect, 1200);
    }
    await scrollDown(page, 400);

    // ── E2: Leave Requests — View & Submit ─────────────────────
    await nav(page, '/leave-requests');
    await narrate(page, markers, 'EMPLOYEE.leave.submit');
    const empLeaveTable = page.locator('[data-testid="employee-leave-requests-table"]');
    if (await empLeaveTable.count() > 0) {
      await highlight(page, empLeaveTable, 1500);
    }
    await scrollDown(page, 400);

    // Open add leave request form
    await nav(page, '/add-leave-request');
    await wait(page, 800);

    // Fill out the form (demonstration only — we submit to show the flow)
    // MUI Select: data-testid is on hidden native input; click the combobox div instead
    const typeSelectWrapper = page.locator('[data-testid="leave-type-select"]').locator('xpath=ancestor::div[contains(@class,"MuiFormControl")]//div[@role="combobox"]');
    const typeSelectFallback = page.locator('[role="combobox"]').first();
    const typeCombobox = await typeSelectWrapper.count() > 0 ? typeSelectWrapper : typeSelectFallback;
    if (await typeCombobox.count() > 0) {
      await highlight(page, typeCombobox, 1500);
      await typeCombobox.click({ timeout: 8000 }).catch(() => {});
      await wait(page, 600);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.count() > 0) {
        await firstOption.click();
      }
    }

    // Date fields
    const startDate = page.locator(S.leave.startDate);
    if (await startDate.count() > 0) {
      await highlight(page, startDate, 1200);
      const nextMonday = (() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() + (day === 0 ? 8 : 15 - day)); // 2 weeks ahead
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      })();
      await smartFill(page, S.leave.startDate, nextMonday);
    }
    const endDate = page.locator(S.leave.endDate);
    if (await endDate.count() > 0) {
      await highlight(page, endDate, 1200);
      const nextFriday = (() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() + (day === 0 ? 12 : 19 - day)); // 2 weeks ahead
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      })();
      await smartFill(page, S.leave.endDate, nextFriday);
    }
    const reasonInput = page.locator(S.leave.reasonInput);
    if (await reasonInput.count() > 0) {
      await highlight(page, reasonInput, 1200);
      await smartFill(page, S.leave.reasonInput, 'Family vacation — pre-approved by manager.');
    }

    // Highlight submit button but DO NOT submit (to avoid polluting data)
    const submitLeaveBtn = page.locator(S.leave.submitBtn);
    if (await submitLeaveBtn.count() > 0) {
      await highlight(page, submitLeaveBtn, 2000);
    }
    await wait(page, 800);
    // Navigate away without submitting
    await nav(page, '/leave-requests');

    // ── E3: My Timesheet ───────────────────────────────────────
    await nav(page, '/timesheets');
    await narrate(page, markers, 'EMPLOYEE.timesheet');
    if (await page.locator(S.timesheet.hub).count() > 0) {
      await highlight(page, S.timesheet.hub, 1500);
    }

    // Weekly entry tab
    await clickTab(page, 'Weekly Entry');
    await wait(page, 800);
    const entryTable = page.locator(S.timesheet.entryTable);
    if (await entryTable.count() > 0) {
      await highlight(page, entryTable, 1500);
    }
    // Add task button
    const addTask = page.locator(S.timesheet.addTask);
    if (await addTask.count() > 0) {
      await highlight(page, addTask, 1200);
    }
    // Save draft + submit buttons
    const saveDraft = page.locator(S.timesheet.saveDraft);
    if (await saveDraft.count() > 0) {
      await highlight(page, saveDraft, 1200);
    }
    const tsSubmit = page.locator(S.timesheet.submitBtn);
    if (await tsSubmit.count() > 0) {
      await highlight(page, tsSubmit, 1500);
    }

    // History tab
    await clickTab(page, 'History');
    await wait(page, 800);
    await scrollDown(page, 400);

    // ── E4: My Payslips ────────────────────────────────────────
    await nav(page, '/employee-payslips');
    await narrate(page, markers, 'EMPLOYEE.payslips');

    // Highlight summary stat cards (yearly earnings, average monthly etc.)
    const empPayPage = page.locator(S.payroll.empPage);
    if (await empPayPage.count() > 0) {
      await highlight(page, empPayPage, 1500);
    }
    // Year filter
    const yearFilterEl = page.locator('[data-testid="payslips-year-filter"]');
    if (await yearFilterEl.count() > 0) {
      await highlight(page, yearFilterEl, 1200);
    }
    // Highlight the payslip table row (with Gross / Deductions / Net / Status)
    const payslipTableRow = page.locator('table tbody tr').first();
    if (await payslipTableRow.count() > 0) {
      await highlight(page, payslipTableRow, 1500);
    }
    await wait(page, 600);

    // Highlight the View button and click it
    const viewPayslipBtn = page.locator(S.payroll.viewBtn).first();
    if (await viewPayslipBtn.count() > 0) {
      await highlight(page, viewPayslipBtn, 1500);
      await viewPayslipBtn.click();

      // Wait for the Dialog to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => {});
      await wait(page, 1500); // allow payslip data to load from API

      const dialogVisible = await page.locator('[role="dialog"]').count() > 0;
      if (dialogVisible) {
        await narrate(page, markers, 'EMPLOYEE.payslips.dialog');

        // ── Payslip PDF Viewer walkthrough ──────────────────
        // 1. Company header
        await highlightInDialog(page, '.payslip-header', 2000);
        await highlightInDialog(page, '.company-name', 1500);
        await highlightInDialog(page, '.payslip-title', 1200);

        // 2. Employee details table
        await highlightInDialog(page, '.details-table', 2000);
        await scrollDialogContent(page, 300);

        // 3. Earnings section
        await highlightInDialog(page, '.section-title', 1500);
        await highlightInDialog(page, '.salary-table', 2000);
        await scrollDialogContent(page, 350);

        // 4. Deductions section — second .section-title
        const sectionTitles = page.locator('[role="dialog"] .section-title');
        if (await sectionTitles.count() > 1) {
          await highlight(page, sectionTitles.nth(1), 1500);
        }
        await scrollDialogContent(page, 350);

        // 5. Net pay row at the bottom
        await highlightInDialog(page, '.net-pay-row', 2200).catch(() =>
          highlightInDialog(page, '.net-pay', 2200).catch(() => {})
        );
        await wait(page, 600);

        // 6. Print and Download action buttons in the Dialog title bar
        const dialogToolbar = page.locator('[role="dialog"] .MuiDialogTitle-root');
        if (await dialogToolbar.count() > 0) {
          await highlight(page, dialogToolbar, 1500);
        }
        const dlgPrint = page.locator('[role="dialog"] button[aria-label*="rint"],' +
                                      '[role="dialog"] button[aria-label*="Print"]').first();
        const dlgDownload = page.locator('[role="dialog"] button[aria-label*="ownload"],' +
                                         '[role="dialog"] button[aria-label*="Download"]').first();
        if (await dlgPrint.count() > 0)    await highlight(page, dlgPrint,    1500);
        if (await dlgDownload.count() > 0) await highlight(page, dlgDownload, 1500);

        // 7. Close the dialog
        await page.locator('[role="dialog"] button').filter({ hasText: /^Close$/i }).first().click()
          .catch(() => page.keyboard.press('Escape'));
        await wait(page, 800);
      }
    }

    // Back to payslips list — also show the Download button on the table row
    const dlRowBtn = page.locator(S.payroll.downloadBtn).first();
    if (await dlRowBtn.count() > 0) {
      await highlight(page, dlRowBtn, 1500);
    }

    // ── E5: My Tasks ───────────────────────────────────────────
    await nav(page, '/my-tasks');
    await narrate(page, markers, 'EMPLOYEE.tasks');
    if (await page.locator(S.tasks.page).count() > 0) {
      await highlight(page, S.tasks.page, 1500);
    }
    const taskSearch = page.locator(S.tasks.search);
    if (await taskSearch.count() > 0) {
      await highlight(page, taskSearch, 1200);
    }
    const taskStatusFilter = page.locator(S.tasks.statusFilter);
    if (await taskStatusFilter.count() > 0) {
      await highlight(page, taskStatusFilter, 1200);
    }
    const priorityFilter = page.locator(S.tasks.priorityFilter);
    if (await priorityFilter.count() > 0) {
      await highlight(page, priorityFilter, 1200);
    }
    await scrollDown(page, 400);

    // ── E6: My Profile ─────────────────────────────────────────
    await nav(page, '/my-profile');
    await narrate(page, markers, 'EMPLOYEE.profile');
    const myProfilePage = page.locator('[data-testid="my-profile-page"]');
    if (await myProfilePage.count() > 0) {
      await highlight(page, myProfilePage, 1500);
    }

    // Walk all 4 profile tabs
    for (const tab of ['Personal', 'Employment', 'Emergency', 'Statutory']) {
      const tabEl = page.getByRole('tab', { name: tab, exact: false });
      if (await tabEl.count() > 0) {
        await tabEl.first().click();
        await wait(page, 600);
        await scrollDown(page, 300);
        await wait(page, 400);
      }
    }

    // Navigate back to Personal tab at the end
    await clickTab(page, 'Personal');
    await wait(page, 600);

    // ── E7: Performance Dashboard ──────────────────────────────
    await nav(page, '/performance-dashboard');
    await wait(page, 1500);
    await narrate(page, markers, 'EMPLOYEE.performance');

    // Page container
    if (await page.locator(S.perf.page).count() > 0) {
      await highlight(page, S.perf.page, 1800);
    }

    // Show auto-refresh toggle (demonstrates live-updating capability)
    const autoRefreshToggle = page.locator(S.perf.autoRefresh);
    if (await autoRefreshToggle.count() > 0) {
      await highlight(page, autoRefreshToggle, 1500);
    }

    // Manual refresh button
    const perfRefreshBtn = page.locator(S.perf.refreshBtn);
    if (await perfRefreshBtn.count() > 0) {
      await highlight(page, perfRefreshBtn, 1500);
    }

    // Client Performance tab — visible to all users
    const perfTabClient = page.locator(S.perf.tabClient);
    if (await perfTabClient.count() > 0) {
      await highlight(page, perfTabClient, 1500);
      await perfTabClient.click();
      await wait(page, 1500); // allow live metrics to populate
    }

    // Scroll through the metrics cards
    await scrollDown(page, 500);
    await wait(page, 600);

    // ── Logout Employee ───────────────────────────────────────
    await logout(page);
    await wait(page, 600);

    // ══════════════════════════════════════════════════════════
    //  CLOSING
    // ══════════════════════════════════════════════════════════

    await page.goto('/');
    await ready(page);
    await narrate(page, markers, 'CLOSING');
    await wait(page, 2000);

    // ──────────────────────────────────────────────────────────
    // Save narration markers to file for voiceover synchronisation
    // ──────────────────────────────────────────────────────────
    const outputDir = path.resolve(__dirname, '../../../demo-output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'video-markers-v2.json');
    fs.writeFileSync(outputPath, JSON.stringify(markers, null, 2), 'utf8');
    console.log(`\n✅ Narration markers saved: ${outputPath}`);
    console.log(`   Total cue points: ${markers.length}`);

    // Print voiceover cue sheet
    console.log('\n─── Voiceover Cue Sheet ───────────────────────────────');
    markers.forEach((m, i) => {
      const seconds = i === 0 ? 0 : ((m.time - markers[0].time) / 1000).toFixed(1);
      console.log(`  [${String(i + 1).padStart(2, '0')}]  ${String(seconds).padStart(7)}s  ${m.label}`);
    });
    console.log('───────────────────────────────────────────────────────\n');
  });
});
