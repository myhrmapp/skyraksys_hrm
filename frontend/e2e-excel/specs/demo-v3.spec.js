/**
 * SkyrakSys HRM — Full Feature Demo v3
 * ======================================
 * HD 1920×1080 walkthrough with voiceover narration markers.
 * Covers all 4 personas: Admin · HR · Manager · Employee
 *
 * CHANGES vs v2:
 *  - ready() post-wait reduced to 500ms (was 800)
 *  - narrate() post-wait reduced to 300ms (was 600)
 *  - clickTab() wait reduced to 600ms (was 800)
 *  - All 15 trimmed-scene windows extended to ≥ voiceover clip duration
 *  - Added strategic highlights per scene to sync with narration
 *  - ADMIN.payroll.generate: robust button detection + result highlights
 *  - HR.leave.accrual + HR.leave.types: added extra highlight steps
 *  - MANAGER.team: highlights individual team member rows
 *  - EMPLOYEE.profile: extended profile walkthrough
 *  - Output dir: demo-output-v3/
 *
 * Command:
 *   cd frontend
 *   npx playwright test -c playwright-demo-v3.config.js demo-v3 --headed
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
// SELECTORS
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
    heading:         '[data-testid="employee-dashboard-heading"]',
    pending:         '[data-testid="stat-card-pending"]',
    balance:         '[data-testid="stat-card-leave-balance"]',
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
    search:         '[data-testid="employee-list-search"]',
    table:          '[data-testid="employee-table"]',
    viewToggleList: '[data-testid="employee-list-view-toggle-list"]',
    viewToggleCards:'[data-testid="employee-list-view-toggle-cards"]',
    addBtn:         '[data-testid="employee-list-add-btn"]',
    profileHeader:  '[data-testid="employee-profile-header"]',
    tabPersonal:    '[data-testid="tab-personal"]',
    tabEmployment:  '[data-testid="tab-employment"]',
    tabEmergency:   '[data-testid="tab-emergency"]',
    tabStatutory:   '[data-testid="tab-statutory"]',
  },
  leave: {
    approveBtn:     '[data-testid="leave-approve-btn"]',
    rejectBtn:      '[data-testid="leave-reject-btn"]',
    submitBtn:      '[data-testid="leave-submit-btn"]',
    typeSelect:     '[data-testid="leave-type-select"]',
    startDate:      '[data-testid="leave-start-date"]',
    endDate:        '[data-testid="leave-end-date"]',
    reasonInput:    '[data-testid="leave-reason-input"]',
    newRequestBtn:  '[data-testid="leave-new-request-button"]',
    accrualPreview: '[data-testid="leave-accrual-preview-btn"]',
    accrualRun:     '[data-testid="leave-accrual-run-btn"]',
    typeAddBtn:     '[data-testid="leave-type-add-btn"]',
    balanceInit:    '[data-testid="leave-balance-init-btn"]',
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
    hub:            '[data-testid="timesheet-hub-page"]',
    entryTable:     '[data-testid="timesheet-entry-table"]',
    addTask:        '[data-testid="timesheet-add-task"]',
    saveDraft:      '[data-testid="timesheet-save-draft"]',
    submitBtn:      '[data-testid="timesheet-submit"]',
    approvalSearch: '[data-testid="ts-approval-search-input"]',
  },
  payroll: {
    management:  '[data-testid="payroll-management-page"]',
    generateBtn: '[data-testid="payroll-generate-btn"]',
    exportBtn:   '[data-testid="payroll-export-btn"]',
    tabs:        '[data-testid="payroll-tabs"]',
    templatePage:'[data-testid="payslip-template-config-page"]',
    empPage:     '[data-testid="employee-payslips-page"]',
    viewBtn:     '[data-testid="payslip-view-btn"]',
    downloadBtn: '[data-testid="payslip-download-btn"]',
  },
  tasks: {
    page:           '[data-testid="my-tasks-page"]',
    search:         '[data-testid="tasks-search"]',
    statusFilter:   '[data-testid="tasks-status-filter"]',
    priorityFilter: '[data-testid="tasks-priority-filter"]',
  },
  review: {
    page:   '[data-testid="reviews-page"]',
    newBtn: '[data-testid="reviews-new-btn"]',
    search: '[data-testid="reviews-search"]',
  },
  org: {
    deptPage: '[data-testid="department-management-page"]',
    posPage:  '[data-testid="position-management-page"]',
    holPage:  '[data-testid="holiday-calendar-page"]',
    addDept:  '[data-testid="dept-add-btn"]',
  },
  userMgmt: {
    page:      '[data-testid="user-management-page"]',
    tabManage: '[data-testid="usermgmt-tab-manage"]',
    search:    '[data-testid="usermgmt-search-input"]',
  },
  project: {
    page:     '[data-testid="project-task-config-page"]',
    tabProj:  '[data-testid="ptc-tab-projects"]',
    tabTasks: '[data-testid="ptc-tab-tasks"]',
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

async function wait(page, ms = 1000) {
  await page.waitForTimeout(ms);
}

/** Wait for network idle then settle — reduced to 500ms post-wait. */
async function ready(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await wait(page, 500);
}

/** Push a narration marker (cue point) — 300ms settle so it doesn't eat scene time. */
async function narrate(page, markers, label) {
  markers.push({ label, time: Date.now(), iso: new Date().toISOString() });
  await wait(page, 300);
}

/** Glow-highlight an element for the given duration. */
async function highlight(page, selectorOrLocator, duration = 1800) {
  try {
    const el = typeof selectorOrLocator === 'string'
      ? page.locator(selectorOrLocator).first()
      : selectorOrLocator;
    await el.evaluate((node) => {
      const prev = node.style.cssText;
      node.dataset._prevStyle = prev;
      node.style.setProperty('outline', '3px solid #FF6B35', 'important');
      node.style.setProperty('box-shadow', '0 0 0 3px #FF6B35, 0 0 20px 8px rgba(255,107,53,0.40)', 'important');
      node.style.setProperty('border-radius', '6px', 'important');
      node.style.setProperty('transition', 'all 0.25s ease', 'important');
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

/** Highlight first matching selector from a list. */
async function highlightFirst(page, selectors, duration = 1800) {
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
  await wait(page, 350);
  await smartFill(page, S.login.password, creds.pass);
  await wait(page, 350);
  await highlight(page, S.login.submit, 900);
  await page.click(S.login.submit);
  await ready(page);
}

/** Log out via the profile menu. */
async function logout(page) {
  await wait(page, 600);
  await page.click(S.layout.profile).catch(() => {});
  await wait(page, 500);
  await page.click(S.layout.logout).catch(() => {});
  await ready(page);
  await wait(page, 400);
}

/** Navigate to a route and wait for page to settle. */
async function nav(page, route) {
  await page.goto(route);
  await ready(page);
}

/** Scroll down by pixels. */
async function scrollDown(page, amount = 400) {
  await page.evaluate((px) => window.scrollBy({ top: px, behavior: 'smooth' }), amount);
  await wait(page, 500);
}

/** Click a MUI Tab by visible text. */
async function clickTab(page, name) {
  const tab = page.getByRole('tab', { name, exact: false });
  if (await tab.count() > 0) {
    await tab.first().click();
    await wait(page, 600);
  }
}

/** Click a button by test-id, highlights first. */
async function clickButton(page, testId) {
  const btn = page.locator(`[data-testid="${testId}"]`);
  if (await btn.count() > 0) {
    await highlight(page, btn, 1000);
    await btn.first().click();
    await ready(page);
  }
}

/** Scroll the MUI Dialog content area by the given pixel amount. */
async function scrollDialogContent(page, amount = 400) {
  await page.evaluate((px) => {
    const el = document.querySelector('.MuiDialogContent-root');
    if (el) el.scrollBy({ top: px, behavior: 'smooth' });
  }, amount);
  await wait(page, 600);
}

/** Highlight an element inside the dialog. */
async function highlightInDialog(page, cssSelector, duration = 1800) {
  try {
    await page.locator(`[role="dialog"] ${cssSelector}`).first().evaluate((node) => {
      const prev = node.style.cssText;
      node.dataset._prevStyle = prev;
      node.style.setProperty('outline', '3px solid #FF6B35', 'important');
      node.style.setProperty('box-shadow', '0 0 0 3px #FF6B35, 0 0 20px 8px rgba(255,107,53,0.40)', 'important');
      node.style.setProperty('border-radius', '6px', 'important');
      node.style.setProperty('transition', 'all 0.25s ease', 'important');
      node.style.setProperty('z-index', '9999', 'important');
    });
    await page.waitForTimeout(duration);
    await page.locator(`[role="dialog"] ${cssSelector}`).first().evaluate((node) => {
      node.style.cssText = node.dataset._prevStyle || '';
      delete node.dataset._prevStyle;
    });
  } catch (_) { /* not in dialog — skip */ }
}

/** Safe click: only if the locator is visible. */
async function safeClick(page, selector) {
  const el = page.locator(selector).first();
  if (await el.count() > 0 && await el.isVisible()) {
    await el.click();
    await wait(page, 500);
  }
}

/** Fill a value — handles MUI TextField wrappers. */
async function smartFill(page, selector, value) {
  const locator = typeof selector === 'string'
    ? page.locator(selector).first()
    : selector;
  try {
    const tag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'div');
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      await locator.fill(value);
    } else {
      const inner = page.locator(`${selector} input, ${selector} textarea`).first();
      const count = await inner.count().catch(() => 0);
      if (count > 0) {
        await inner.fill(value);
      } else {
        await locator.fill(value);
      }
    }
  } catch (_) {
    await locator.pressSequentially(value, { delay: 60 }).catch(() => {});
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN DEMO TEST
// ══════════════════════════════════════════════════════════════

test.describe('SkyrakSys HRM — Full Feature Demo v3', () => {
  test('HD Demo Recording — All Personas', async ({ page }) => {
    const markers = [];

    // ──────────────────────────────────────────────────────────
    // INTRO  (target window: ~18s — clip is ~16s)
    // ──────────────────────────────────────────────────────────
    await page.goto('/');
    await ready(page);
    await narrate(page, markers, 'INTRO.welcome');
    // Hold on login screen — give voiceover (16s) room to breathe
    await highlight(page, S.login.email, 1500);
    await highlight(page, S.login.password, 1000);
    await highlight(page, S.login.submit, 1200);
    await wait(page, 5000);   // fill remaining intro time

    // ══════════════════════════════════════════════════════════
    //  PERSONA 1 — ADMINISTRATOR
    // ══════════════════════════════════════════════════════════

    // ── A1: Login + Admin Dashboard  (target: ~14s — clip is ~13s) ──
    await login(page, CREDS.admin);
    await narrate(page, markers, 'ADMIN.dashboard');
    await highlight(page, S.adminDash.totalEmp,     1500);
    await highlight(page, S.adminDash.onLeave,      1200);
    await highlight(page, S.adminDash.newHires,     1200);
    await highlight(page, S.adminDash.pendingLeave, 1200);
    await highlight(page, S.adminDash.submittedTS,  1200);
    await scrollDown(page, 400);
    await wait(page, 2000);   // linger on recent-activity section

    // ── A2: Employee List ──────────────────────────────────────
    await nav(page, '/employees');
    await narrate(page, markers, 'ADMIN.employees.list');
    await highlight(page, S.employee.search, 1200);
    await smartFill(page, S.employee.search, 'Alice');
    await wait(page, 1000);
    await highlight(page, S.employee.table, 1500);
    await smartFill(page, S.employee.search, '');
    await wait(page, 500);
    // Department filter
    const deptFilter = page.locator('[data-testid="employee-list-filter-department"]');
    if (await deptFilter.count() > 0) {
      await highlight(page, deptFilter, 1200);
    }
    await scrollDown(page, 300);
    await wait(page, 800);

    // ── A3: Card View  (target: ~9s — clip is ~7.5s) ──────────
    await narrate(page, markers, 'ADMIN.employees.cards');
    await safeClick(page, S.employee.viewToggleCards);
    await wait(page, 800);
    await scrollDown(page, 400);
    await wait(page, 2500);   // linger in card view — previously too short!
    await safeClick(page, S.employee.viewToggleList);
    await wait(page, 500);

    // ── A4: Add Employee Form  (target: ~15s — clip is ~14s) ──
    await narrate(page, markers, 'ADMIN.employees.addForm');
    await safeClick(page, S.employee.addBtn);
    await wait(page, 1000);
    await clickTab(page, 'Personal');
    await scrollDown(page, 500);
    await wait(page, 800);
    await clickTab(page, 'Employment');
    await scrollDown(page, 500);
    await wait(page, 800);
    await clickTab(page, 'Statutory');
    await scrollDown(page, 500);
    await wait(page, 800);
    await page.goBack();
    await ready(page);

    // ── A5: Employee Profile  (target: ~12s — clip is ~11s) ───
    await nav(page, `/employees/${ALICE_EMP_ID}`);
    await narrate(page, markers, 'ADMIN.employees.profile');
    const profileHeader = page.locator(S.employee.profileHeader);
    if (await profileHeader.count() > 0) {
      await highlight(page, profileHeader, 2000);
    }
    await wait(page, 600);
    for (const tab of ['Personal', 'Employment', 'Emergency', 'Statutory']) {
      await clickTab(page, tab);
      await scrollDown(page, 400);
      await wait(page, 600);  // slightly longer per tab
    }

    // ── A6: Payslip from Employee Profile  (target: ~16s+) ────
    await narrate(page, markers, 'ADMIN.employees.payslip');
    const profilePayslipBtn = page.locator('[data-testid="employee-profile-payslip-btn"]');
    if (await profilePayslipBtn.count() > 0 && await profilePayslipBtn.isVisible()) {
      await highlight(page, profilePayslipBtn, 1200);
      await profilePayslipBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 6000 }).catch(() => {});
      await wait(page, 800);
      await highlightInDialog(page, '.payslip-header', 1200);
      await scrollDialogContent(page, 300);
      await highlightInDialog(page, '.salary-table', 1500);
      await scrollDialogContent(page, 400);
      await highlightInDialog(page, '.net-pay-row', 1500);
      await wait(page, 400);
      await page.locator('[role="dialog"] button').filter({ hasText: 'Close' }).first().click().catch(async () => {
        await page.keyboard.press('Escape');
      });
      await wait(page, 500);
    }

    // ── A7: Employee Records  (target: ~12s — clip is ~11s) ───
    await nav(page, '/employee-records');
    await narrate(page, markers, 'ADMIN.employee.records');
    // The search is an Autocomplete — type to find Alice and select her
    const recAutocomplete = page.locator('[data-testid="employee-records-search"] input');
    if (await recAutocomplete.count() > 0) {
      await highlight(page, '[data-testid="employee-records-search"]', 1200);
      await recAutocomplete.fill('Alice');
      await wait(page, 1200); // wait for autocomplete results to load
      const aliceOption = page.locator('[role="option"]').filter({ hasText: 'Alice' }).first();
      if (await aliceOption.count() > 0) {
        await aliceOption.click();
        await ready(page);
      }
    }
    await wait(page, 800);
    // Cycle through tabs — now showing Alice's actual records
    for (const recTab of ['records-tab-leave', 'records-tab-timesheet', 'records-tab-attendance']) {
      const tab = page.locator(`[data-testid="${recTab}"]`);
      if (await tab.count() > 0) {
        await tab.click();
        await wait(page, 600);
        // Highlight the data table/grid in the active tab
        const tableOrGrid = page.locator('table, [class*="Grid"]').first();
        if (await tableOrGrid.count() > 0) {
          await highlight(page, tableOrGrid, 1000);
        }
        await scrollDown(page, 300);
        await wait(page, 400);
      }
    }

    // ── A8: Leave Management  (target: ~9s — clip is ~8s) ─────
    await nav(page, '/leave-management');
    await narrate(page, markers, 'ADMIN.leave.management');
    await highlight(page, '[data-testid="leave-mgmt-requests-table"]', 1500);
    // Status filter
    const leaveStatusFilter = page.locator('[data-testid="leave-mgmt-status-select"]');
    if (await leaveStatusFilter.count() > 0) {
      await highlight(page, leaveStatusFilter, 1200);
    }
    // Date range filter
    const leaveDateFilter = page.locator('[data-testid="leave-mgmt-date-filter"], [data-testid="leave-date-from"]');
    if (await leaveDateFilter.count() > 0) {
      await highlight(page, leaveDateFilter, 1200);
    }
    await scrollDown(page, 300);
    await wait(page, 1200);   // linger to match 8s narration

    // ── A9: Leave Approve  (target: ~8s — clip is ~6.5s) ──────
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

    // ── A10: Attendance Management ─────────────────────────────
    await nav(page, '/attendance-management');
    await narrate(page, markers, 'ADMIN.attendance.management');
    if (await page.locator(S.attendance.managementPage).count() > 0) {
      await highlight(page, S.attendance.managementPage, 1500);
    }
    await highlight(page, S.attendance.dataGrid, 1500).catch(() => {});
    await scrollDown(page, 300);
    if (await page.locator(S.attendance.markBtn).count() > 0) {
      await highlight(page, S.attendance.markBtn, 1200);
    }
    await wait(page, 500);

    // ── A11: Timesheet Approvals ───────────────────────────────
    await nav(page, '/timesheets');
    await narrate(page, markers, 'ADMIN.timesheet.approvals');
    await clickTab(page, 'Approvals');
    await wait(page, 600);
    const approvalSearch = page.locator(S.timesheet.approvalSearch);
    if (await approvalSearch.count() > 0) {
      await highlight(page, approvalSearch, 1200);
      await smartFill(page, S.timesheet.approvalSearch, 'Alice');
      await wait(page, 900);
      await smartFill(page, S.timesheet.approvalSearch, '');
    }
    await scrollDown(page, 300);
    await wait(page, 800);

    // ── A12: Payroll Management  (target: ~10s — clip is ~9s) ─
    await nav(page, '/payroll-management');
    await narrate(page, markers, 'ADMIN.payroll.management');
    if (await page.locator(S.payroll.management).count() > 0) {
      await highlight(page, S.payroll.management, 1500);
    }
    await scrollDown(page, 400);
    await wait(page, 600);
    // Show Overview stats then Salary Structures
    await clickTab(page, 'Overview');
    await wait(page, 600);
    // Highlight the "Generate Payslips" button on Overview (it navigates to Generate tab)
    const overviewGenBtn = page.locator('[data-testid="payroll-generate-btn"]');
    if (await overviewGenBtn.count() > 0) {
      await highlight(page, overviewGenBtn, 1200);
    }
    await clickTab(page, 'Salary Structures');
    await wait(page, 800);

    // ── A13: Payroll Generate  (target: ~9s — clip is ~7.7s) ──
    await narrate(page, markers, 'ADMIN.payroll.generate');
    // Click the Overview "Generate Payslips" button which switches to Generate tab
    await clickTab(page, 'Overview');
    await wait(page, 400);
    if (await overviewGenBtn.count() > 0) {
      await overviewGenBtn.click();
      await wait(page, 800);
    } else {
      // Fallback: switch tab directly
      await clickTab(page, 'Generate');
      await wait(page, 600);
    }
    // Now on Generate tab — select all employees via the "Select all" checkbox
    const selectAllCheckbox = page.locator('label').filter({ hasText: /Select all/i }).locator('input[type="checkbox"]').first();
    if (await selectAllCheckbox.count() > 0) {
      await highlight(page, selectAllCheckbox.locator('xpath=ancestor::label'), 1200);
      await selectAllCheckbox.check();
      await wait(page, 600);
    }
    // Click "Validate & Generate" button
    const validateGenBtn = page.locator('[data-testid="payroll-validate-generate-btn"]');
    if (await validateGenBtn.count() > 0) {
      await highlight(page, validateGenBtn, 1500);
      await validateGenBtn.click();
      await ready(page);
      await wait(page, 1800);
      // If a validation dialog appears, proceed with valid employees
      const proceedBtn = page.locator('[role="dialog"] button').filter({ hasText: /proceed|generate|confirm/i }).first();
      if (await proceedBtn.count() > 0) {
        await highlight(page, proceedBtn, 1200);
        await proceedBtn.click();
        await ready(page);
        await wait(page, 1500);
      }
    } else {
      // Fallback — just scroll and wait
      await scrollDown(page, 400);
      await wait(page, 3000);
    }
    // Switch back to Overview to show generated payslips
    await clickTab(page, 'Overview');
    await wait(page, 800);
    const firstPayslipRow = page.locator('table tbody tr').first();
    if (await firstPayslipRow.count() > 0) {
      await highlight(page, firstPayslipRow, 1500);
    }
    await scrollDown(page, 300);
    await wait(page, 500);

    // ── A14: Payslip Templates  (target: ~8s — clip is ~7.2s) ─
    await narrate(page, markers, 'ADMIN.payroll.templates');
    await wait(page, 500);   // brief settle before nav
    await nav(page, '/admin/payslip-templates');
    if (await page.locator(S.payroll.templatePage).count() > 0) {
      await highlight(page, S.payroll.templatePage, 1500);
    }
    await scrollDown(page, 400);
    await wait(page, 1500);  // linger to fill 8s window

    // ── A15: Organization Settings ─────────────────────────────
    await nav(page, '/organization');
    await narrate(page, markers, 'ADMIN.org.settings');
    await clickTab(page, 'Departments');
    if (await page.locator(S.org.deptPage).count() > 0) {
      await highlight(page, S.org.deptPage, 1500);
    }
    await highlight(page, S.org.addDept, 1200).catch(() => {});
    await scrollDown(page, 400);
    await clickTab(page, 'Positions');
    await wait(page, 500);
    await scrollDown(page, 400);
    await clickTab(page, 'Holidays');
    await wait(page, 600);
    if (await page.locator(S.org.holPage).count() > 0) {
      await highlight(page, S.org.holPage, 1500);
    }
    await scrollDown(page, 400);

    // ── A16: User Management  (target: ~10s — clip is ~8.5s) ──
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
    await wait(page, 1200);  // extra linger to match 8.5s clip

    // ── A17: Reports ───────────────────────────────────────────
    await nav(page, '/reports');
    await narrate(page, markers, 'ADMIN.reports');
    for (const tab of ['Attendance', 'Leave', 'Payroll', 'Employee']) {
      await clickTab(page, tab);
      await wait(page, 700);
      await scrollDown(page, 200);
      await wait(page, 400);
    }

    // ── A18: System Settings ───────────────────────────────────
    await nav(page, '/admin/settings-hub');
    await narrate(page, markers, 'ADMIN.settings');
    await scrollDown(page, 400);
    await wait(page, 600);
    await scrollDown(page, 400);
    await wait(page, 600);

    // ── A18.5: Restore Records ─────────────────────────────────
    await nav(page, '/admin/restore');
    await narrate(page, markers, 'ADMIN.restore');
    if (await page.locator('[data-testid="restore-management-page"]').count() > 0) {
      await highlight(page, '[data-testid="restore-management-page"]', 1500);
    }
    for (const restoreTab of ['restore-tab-reviews', 'restore-tab-balances', 'restore-tab-users']) {
      const rTab = page.locator(`[data-testid="${restoreTab}"]`);
      if (await rTab.count() > 0) {
        await rTab.click();
        await wait(page, 500);
      }
    }
    await scrollDown(page, 300);
    await wait(page, 400);

    // ── A19: Projects & Tasks Config ──────────────────────────
    await nav(page, '/project-task-config');
    await narrate(page, markers, 'ADMIN.projects');
    if (await page.locator(S.project.page).count() > 0) {
      await highlight(page, S.project.page, 1500);
    }
    await clickTab(page, 'Projects');
    await wait(page, 600);
    await scrollDown(page, 300);
    await clickTab(page, 'Tasks');
    await wait(page, 600);
    await scrollDown(page, 300);

    // ── A20: User Guide ────────────────────────────────────────
    await nav(page, '/user-guide');
    await narrate(page, markers, 'ADMIN.user.guide');
    await wait(page, 600);
    await scrollDown(page, 400);
    await wait(page, 600);
    await scrollDown(page, 400);
    await wait(page, 800);

    // ── Logout Admin ──────────────────────────────────────────
    await logout(page);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 2 — HR
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.hr);
    await narrate(page, markers, 'HR.dashboard');
    await scrollDown(page, 400);
    await wait(page, 600);
    // Show HR employee view
    await nav(page, '/employees');
    await highlight(page, S.employee.table, 1500);
    await scrollDown(page, 300);
    await wait(page, 600);

    // ── H1: Leave Balance Management ──────────────────────────
    await nav(page, '/admin/leave-balances');
    await narrate(page, markers, 'HR.leave.balances');
    const balanceSearch = page.locator('[data-testid="leave-search-input"]');
    if (await balanceSearch.count() > 0) {
      await highlight(page, balanceSearch, 1200);
      await smartFill(page, '[data-testid="leave-search-input"]', 'Alice');
      await wait(page, 900);
      await smartFill(page, '[data-testid="leave-search-input"]', '');
    }
    const yearSelect = page.locator('[data-testid="leave-year-select"]');
    if (await yearSelect.count() > 0) {
      await highlight(page, yearSelect, 1200);
    }
    await scrollDown(page, 400);
    const initBtn = page.locator(S.leave.balanceInit);
    if (await initBtn.count() > 0) {
      await highlight(page, initBtn, 1500);
    }

    // ── H2: Leave Accrual  (target: ~9s — clip is ~8s) ────────
    await nav(page, '/admin/leave-accrual');
    await narrate(page, markers, 'HR.leave.accrual');
    // Preview button
    await highlightFirst(page, [
      '[data-testid="leave-accrual-preview-btn"]',
      'button:has-text("Preview")',
      'button:has-text("Calculate")',
    ], 1500);
    await scrollDown(page, 400);
    await wait(page, 700);
    // Policy / employee selection
    const accrualPolicySelect = page.locator('[data-testid="leave-accrual-policy-select"], [data-testid="accrual-leave-type-select"]');
    if (await accrualPolicySelect.count() > 0) {
      await highlight(page, accrualPolicySelect, 1200);
    }
    await scrollDown(page, 400);
    await wait(page, 800);
    // Run button
    await highlightFirst(page, [
      '[data-testid="leave-accrual-run-btn"]',
      'button:has-text("Run Accrual")',
      'button:has-text("Apply")',
    ], 1500);
    await wait(page, 600);

    // ── H3: Leave Types  (target: ~11s — clip is ~9.5s) ───────
    await nav(page, '/admin/leave-types');
    await narrate(page, markers, 'HR.leave.types');
    // First existing leave type row
    const firstTypeRow = page.locator('table tbody tr').first();
    if (await firstTypeRow.count() > 0) {
      await highlight(page, firstTypeRow, 1500);
    }
    await scrollDown(page, 400);
    await wait(page, 500);
    // Add button
    const typeAddBtn = page.locator(S.leave.typeAddBtn);
    if (await typeAddBtn.count() > 0) {
      await highlight(page, typeAddBtn, 1800);
    }
    await scrollDown(page, 400);
    await wait(page, 1000);
    // Carry-forward / accrual toggle (if visible)
    const carryForwardToggle = page.locator('[data-testid="leave-carry-forward-toggle"], [data-testid="leave-accrual-enabled"]');
    if (await carryForwardToggle.count() > 0) {
      await highlight(page, carryForwardToggle, 1200);
    }
    await wait(page, 800);

    // ── H4: Performance Reviews ────────────────────────────────
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
    await wait(page, 600);

    // ── Logout HR ─────────────────────────────────────────────
    await logout(page);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 3 — MANAGER
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.manager);
    await narrate(page, markers, 'MANAGER.dashboard');
    // Highlight quick-action buttons  (target: ~11s — clip is ~9.4s)
    for (const sel of [S.managerDash.approveLeaves, S.managerDash.approveTS, S.managerDash.viewTeam]) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        await highlight(page, btn, 1200);
      }
    }
    await scrollDown(page, 400);
    await wait(page, 1000);
    // Highlight the heading and any stat cards
    const mgrHeading = page.locator(S.managerDash.heading);
    if (await mgrHeading.count() > 0) {
      await highlight(page, mgrHeading, 1000);
    }
    await wait(page, 800);

    // ── M1: Team Members  (target: ~8s — clip is ~6.8s) ───────
    const teamTab = page.locator(S.managerDash.tabTeam);
    if (await teamTab.count() > 0) {
      await highlight(page, teamTab, 1200);
      await teamTab.click();
      await ready(page);
      await narrate(page, markers, 'MANAGER.team');
      await scrollDown(page, 400);
      // Highlight first team member row
      const firstTeamRow = page.locator('[data-testid^="team-member"], table tbody tr').first();
      if (await firstTeamRow.count() > 0) {
        await highlight(page, firstTeamRow, 1500);
      }
      await wait(page, 800);
      // Highlight second team member if available
      const secondTeamRow = page.locator('table tbody tr').nth(1);
      if (await secondTeamRow.count() > 0) {
        await highlight(page, secondTeamRow, 1200);
      }
      await scrollDown(page, 300);
      await wait(page, 800);
    }

    // ── M2: Leave Approvals  ───────────────────────────────────
    const leaveTab = page.locator(S.managerDash.tabLeave);
    if (await leaveTab.count() > 0) {
      await highlight(page, leaveTab, 1200);
      await leaveTab.click();
      await ready(page);
      await narrate(page, markers, 'MANAGER.leave.approval');
      await wait(page, 600);
      // Navigate to leave-management for full approval flow
      await nav(page, '/leave-management');
      await wait(page, 600);
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
          await wait(page, 800);
        }
      } else {
        await highlight(page, '[data-testid="leave-mgmt-requests-table"]', 2000).catch(() => {});
      }
    }

    // ── M3: Timesheet Approvals ────────────────────────────────
    await nav(page, '/timesheets');
    await clickTab(page, 'Approvals');
    await ready(page);
    await narrate(page, markers, 'MANAGER.timesheet.approval');
    await wait(page, 600);
    const tsRows = page.locator('tr').filter({ hasText: 'Alice' });
    if (await tsRows.count() > 0) {
      const firstRow = tsRows.first();
      await firstRow.scrollIntoViewIfNeeded();
      await highlight(page, firstRow, 2000);
      const approveInRow = firstRow.locator('button').filter({ hasText: /approve/i });
      if (await approveInRow.count() > 0) {
        await highlight(page, approveInRow, 1200);
        await approveInRow.click();
        await ready(page);
        await wait(page, 800);
      } else {
        const pageApproveBtn = page.locator('button').filter({ hasText: /approve/i }).first();
        if (await pageApproveBtn.count() > 0) {
          await highlight(page, pageApproveBtn, 1200);
          await pageApproveBtn.click();
          await ready(page);
          await wait(page, 600);
        }
      }
    } else {
      await scrollDown(page, 400);
    }

    // ── M4: Manager Employee Reviews ───────────────────────────
    await nav(page, '/employee-reviews');
    await narrate(page, markers, 'MANAGER.reviews');
    if (await page.locator(S.review.page).count() > 0) {
      await highlight(page, S.review.page, 1500);
    }
    const mgrReviewSearch = page.locator(S.review.search);
    if (await mgrReviewSearch.count() > 0) {
      await highlight(page, mgrReviewSearch, 1200);
    }
    await scrollDown(page, 300);
    await wait(page, 600);

    // ── M5: Manager Projects ────────────────────────────────────
    await nav(page, '/project-task-config');
    await narrate(page, markers, 'MANAGER.projects');
    if (await page.locator(S.project.page).count() > 0) {
      await highlight(page, S.project.page, 1500);
    }
    await clickTab(page, 'Projects');
    await wait(page, 600);
    await clickTab(page, 'Tasks');
    await wait(page, 600);

    // ── Logout Manager ────────────────────────────────────────
    await logout(page);

    // ══════════════════════════════════════════════════════════
    //  PERSONA 4 — EMPLOYEE
    // ══════════════════════════════════════════════════════════

    await login(page, CREDS.employee);
    await narrate(page, markers, 'EMPLOYEE.dashboard');
    // Stat cards  (target: ~12s — clip is ~11s)
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
    await scrollDown(page, 400);
    await wait(page, 800);

    // ── E1: My Attendance ──────────────────────────────────────
    await nav(page, '/my-attendance');
    await narrate(page, markers, 'EMPLOYEE.attendance');
    if (await page.locator(S.attendance.myPage).count() > 0) {
      await highlight(page, S.attendance.myPage, 1500);
    }
    await highlightFirst(page, [S.attendance.checkInBtn, S.attendance.checkOutBtn], 1800);
    await scrollDown(page, 400);
    await wait(page, 700);
    const monthSelect = page.locator('[data-testid="attendance-month-select"]');
    if (await monthSelect.count() > 0) {
      await highlight(page, monthSelect, 1200);
    }
    await scrollDown(page, 400);

    // ── E2: Leave Requests ─────────────────────────────────────
    await nav(page, '/leave-requests');
    await narrate(page, markers, 'EMPLOYEE.leave.submit');
    const empLeaveTable = page.locator('[data-testid="employee-leave-requests-table"]');
    if (await empLeaveTable.count() > 0) {
      await highlight(page, empLeaveTable, 1500);
    }
    await scrollDown(page, 400);
    // Open add leave form
    await nav(page, '/add-leave-request');
    await wait(page, 700);
    const typeSelectWrapper = page.locator('[data-testid="leave-type-select"]').locator('xpath=ancestor::div[contains(@class,"MuiFormControl")]//div[@role="combobox"]');
    const typeSelectFallback = page.locator('[role="combobox"]').first();
    const typeCombobox = await typeSelectWrapper.count() > 0 ? typeSelectWrapper : typeSelectFallback;
    if (await typeCombobox.count() > 0) {
      await highlight(page, typeCombobox, 1500);
      await typeCombobox.click({ timeout: 8000 }).catch(() => {});
      await wait(page, 500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.count() > 0) {
        await firstOption.click();
      }
    }
    const startDate = page.locator(S.leave.startDate);
    if (await startDate.count() > 0) {
      await highlight(page, startDate, 1200);
      const nextMonday = (() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() + (day === 0 ? 8 : 15 - day));
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
        d.setDate(d.getDate() + (day === 0 ? 12 : 19 - day));
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      })();
      await smartFill(page, S.leave.endDate, nextFriday);
    }
    const reasonInput = page.locator(S.leave.reasonInput);
    if (await reasonInput.count() > 0) {
      await highlight(page, reasonInput, 1200);
      await smartFill(page, S.leave.reasonInput, 'Family vacation — pre-approved by manager.');
    }
    const submitLeaveBtn = page.locator(S.leave.submitBtn);
    if (await submitLeaveBtn.count() > 0) {
      await highlight(page, submitLeaveBtn, 2000);
    }
    await wait(page, 600);
    await nav(page, '/leave-requests');

    // ── E3: My Timesheet ───────────────────────────────────────
    await nav(page, '/timesheets');
    await narrate(page, markers, 'EMPLOYEE.timesheet');
    if (await page.locator(S.timesheet.hub).count() > 0) {
      await highlight(page, S.timesheet.hub, 1500);
    }
    await clickTab(page, 'Weekly Entry');
    await wait(page, 700);
    const entryTable = page.locator(S.timesheet.entryTable);
    if (await entryTable.count() > 0) {
      await highlight(page, entryTable, 1500);
    }
    const addTask = page.locator(S.timesheet.addTask);
    if (await addTask.count() > 0) {
      await highlight(page, addTask, 1200);
    }
    const saveDraft = page.locator(S.timesheet.saveDraft);
    if (await saveDraft.count() > 0) {
      await highlight(page, saveDraft, 1200);
    }
    const tsSubmit = page.locator(S.timesheet.submitBtn);
    if (await tsSubmit.count() > 0) {
      await highlight(page, tsSubmit, 1500);
    }
    await clickTab(page, 'History');
    await wait(page, 600);
    await scrollDown(page, 400);

    // ── E4: My Payslips ────────────────────────────────────────
    await nav(page, '/employee-payslips');
    await narrate(page, markers, 'EMPLOYEE.payslips');
    const empPayPage = page.locator(S.payroll.empPage);
    if (await empPayPage.count() > 0) {
      await highlight(page, empPayPage, 1500);
    }
    const yearFilterEl = page.locator('[data-testid="payslips-year-filter"]');
    if (await yearFilterEl.count() > 0) {
      await highlight(page, yearFilterEl, 1200);
    }
    const payslipTableRow = page.locator('table tbody tr').first();
    if (await payslipTableRow.count() > 0) {
      await highlight(page, payslipTableRow, 1500);
    }
    await wait(page, 500);
    const viewPayslipBtn = page.locator(S.payroll.viewBtn).first();
    if (await viewPayslipBtn.count() > 0) {
      await highlight(page, viewPayslipBtn, 1500);
      await viewPayslipBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 12000 }).catch(() => {});
      await wait(page, 1200);
      const dialogVisible = await page.locator('[role="dialog"]').count() > 0;
      if (dialogVisible) {
        await narrate(page, markers, 'EMPLOYEE.payslips.dialog');
        await highlightInDialog(page, '.payslip-header', 2000);
        await highlightInDialog(page, '.company-name', 1500);
        await highlightInDialog(page, '.payslip-title', 1200);
        await highlightInDialog(page, '.details-table', 2000);
        await scrollDialogContent(page, 300);
        await highlightInDialog(page, '.section-title', 1500);
        await highlightInDialog(page, '.salary-table', 2000);
        await scrollDialogContent(page, 350);
        const sectionTitles = page.locator('[role="dialog"] .section-title');
        if (await sectionTitles.count() > 1) {
          await highlight(page, sectionTitles.nth(1), 1500);
        }
        await scrollDialogContent(page, 350);
        await highlightInDialog(page, '.net-pay-row', 2200).catch(() =>
          highlightInDialog(page, '.net-pay', 2200).catch(() => {})
        );
        await wait(page, 500);
        const dlgPrint    = page.locator('[role="dialog"] button[aria-label*="rint"], [role="dialog"] button[aria-label*="Print"]').first();
        const dlgDownload = page.locator('[role="dialog"] button[aria-label*="ownload"], [role="dialog"] button[aria-label*="Download"]').first();
        if (await dlgPrint.count() > 0)    await highlight(page, dlgPrint,    1500);
        if (await dlgDownload.count() > 0) await highlight(page, dlgDownload, 1500);
        await page.locator('[role="dialog"] button').filter({ hasText: /^Close$/i }).first().click()
          .catch(() => page.keyboard.press('Escape'));
        await wait(page, 700);
      }
    }
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

    // ── E5.5: My Reviews ────────────────────────────────────────
    await nav(page, '/employee-reviews');
    await narrate(page, markers, 'EMPLOYEE.reviews');
    if (await page.locator(S.review.page).count() > 0) {
      await highlight(page, S.review.page, 1500);
    }
    // Status filter
    const empReviewStatusFilter = page.locator('[data-testid="reviews-status-filter"]');
    if (await empReviewStatusFilter.count() > 0) {
      await highlight(page, empReviewStatusFilter, 1200);
    }
    await scrollDown(page, 300);
    await wait(page, 600);

    // ── E6: My Profile  (target: ~11s — clip is ~9.5s) ────────
    await nav(page, '/my-profile');
    await narrate(page, markers, 'EMPLOYEE.profile');
    const myProfilePage = page.locator('[data-testid="my-profile-page"]');
    if (await myProfilePage.count() > 0) {
      await highlight(page, myProfilePage, 1500);
    }
    for (const tab of ['Personal', 'Employment', 'Emergency', 'Statutory']) {
      const tabEl = page.getByRole('tab', { name: tab, exact: false });
      if (await tabEl.count() > 0) {
        await tabEl.first().click();
        await wait(page, 600);
        await scrollDown(page, 300);
        await wait(page, 400);
      }
    }
    // Return to Personal and highlight edit/save button
    await clickTab(page, 'Personal');
    await wait(page, 500);
    const editProfileBtn = page.locator('[data-testid="profile-edit-btn"], button:has-text("Edit"), button:has-text("Save")').first();
    if (await editProfileBtn.count() > 0) {
      await highlight(page, editProfileBtn, 1500);
    }
    await wait(page, 700);

    // ── E7: Performance Dashboard ──────────────────────────────
    await nav(page, '/performance-dashboard');
    await wait(page, 1200);
    await narrate(page, markers, 'EMPLOYEE.performance');
    if (await page.locator(S.perf.page).count() > 0) {
      await highlight(page, S.perf.page, 1800);
    }
    const autoRefreshToggle = page.locator(S.perf.autoRefresh);
    if (await autoRefreshToggle.count() > 0) {
      await highlight(page, autoRefreshToggle, 1500);
    }
    const perfRefreshBtn = page.locator(S.perf.refreshBtn);
    if (await perfRefreshBtn.count() > 0) {
      await highlight(page, perfRefreshBtn, 1500);
    }
    const perfTabClient = page.locator(S.perf.tabClient);
    if (await perfTabClient.count() > 0) {
      await highlight(page, perfTabClient, 1500);
      await perfTabClient.click();
      await wait(page, 1200);
    }
    await scrollDown(page, 400);
    await wait(page, 500);

    // ── Logout Employee ───────────────────────────────────────
    await logout(page);

    // ══════════════════════════════════════════════════════════
    //  CLOSING
    // ══════════════════════════════════════════════════════════

    await page.goto('/');
    await ready(page);
    await narrate(page, markers, 'CLOSING');
    await wait(page, 2500);

    // ──────────────────────────────────────────────────────────
    // Save markers
    // ──────────────────────────────────────────────────────────
    const outputDir = path.resolve(__dirname, '../../../demo-output-v3');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'video-markers-v3.json');
    fs.writeFileSync(outputPath, JSON.stringify(markers, null, 2), 'utf8');
    console.log(`\n✅ Narration markers saved: ${outputPath}`);
    console.log(`   Total cue points: ${markers.length}`);

    console.log('\n─── Voiceover Cue Sheet ───────────────────────────────');
    markers.forEach((m, i) => {
      const seconds = i === 0 ? 0 : ((m.time - markers[0].time) / 1000).toFixed(1);
      console.log(`  [${String(i + 1).padStart(2, '0')}]  ${String(seconds).padStart(7)}s  ${m.label}`);
    });
    console.log('───────────────────────────────────────────────────────\n');
  });
});
