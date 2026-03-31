/**
 * SkyrakSys HRM — Full Application Demo Walkthrough (v3)
 * ========================================================
 * Comprehensive Playwright recording with:
 *  - Visual highlighters on elements being discussed
 *  - Correct tab names & navigation matching actual UI
 *  - Full-page scrolls to show all content including bottom
 *  - Employee profile scroll-through (no tabs — card layout)
 *  - Proper viewport for visibility
 *
 * Usage:
 *   1. python scripts/generate-demo-voiceover.py
 *   2. npx playwright test -c playwright-demo.config.js demo-walkthrough
 *   3. python scripts/generate-demo-voiceover.py --combine-only --video <path>
 */

const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');
const dns  = require('dns');
dns.setDefaultResultOrder('ipv4first');

/* ── credentials ──────────────────────────────────────────── */
const USERS = {
  admin:    { email: 'admin@skyraksys.com',    password: 'admin123' },
  hr:       { email: 'hr@skyraksys.com',       password: 'admin123' },
  manager:  { email: 'lead@skyraksys.com',     password: 'admin123' },
  employee: { email: 'employee1@skyraksys.com', password: 'admin123' },
};

/* ── load pre-generated clip durations ────────────────────── */
let clipTimings = {};
try {
  const tp = path.join(__dirname, '..', '..', '..', 'demo-output', 'clip-timings.json');
  clipTimings = JSON.parse(fs.readFileSync(tp, 'utf-8'));
  console.log(`[SYNC] Loaded ${Object.keys(clipTimings).length} clip timings`);
} catch { console.log('[SYNC] clip-timings.json not found — using defaults'); }

/* ═══════════════════════════════════════════════════════════
 *  HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════ */
async function wait(page, ms) { await page.waitForTimeout(ms); }

async function ready(page, timeout = 8000) {
  try {
    await page.waitForFunction(() => {
      const p = document.querySelectorAll('[role="progressbar"]');
      const s = document.querySelectorAll('.MuiSkeleton-root');
      return p.length === 0 && s.length === 0;
    }, { timeout });
  } catch { /* ok */ }
  await wait(page, 300);
}

async function login(page, role) {
  const u = USERS[role];
  await page.goto('/login');
  await wait(page, 600);
  await page.getByLabel(/email/i).fill(u.email);
  await page.locator('input[type="password"]').fill(u.password);
  await wait(page, 300);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await ready(page);
  await wait(page, 1200);
}

async function logout(page) {
  const avatar = page.locator('.MuiAvatar-root').first();
  if (await avatar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await avatar.click();
    await wait(page, 400);
    const btn = page.getByRole('menuitem', { name: /logout|sign out/i });
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await page.waitForURL(/login/, { timeout: 10000 });
      await wait(page, 600);
      return;
    }
  }
  await page.goto('/login');
  await wait(page, 600);
}

async function nav(page, routePath) {
  const clean = routePath.replace(/^\/+/, '');
  const testId = `nav-${clean.replace(/\//g, '-')}`;
  const sidebar = page.locator(`[data-testid="${testId}"]`);
  if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sidebar.click();
  } else {
    await page.goto(`/${clean}`);
  }
  await ready(page);
  await wait(page, 1000);
}

/* ── Smooth scroll to bottom to show entire page ─────────── */
async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const d = document.documentElement;
    const step = 300;
    for (let y = 0; y < d.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 200));
    }
    // stay at bottom briefly, then scroll back to top
    await new Promise(r => setTimeout(r, 600));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await new Promise(r => setTimeout(r, 400));
  });
}

async function scrollDown(page, amount = 400) {
  await page.mouse.wheel(0, amount);
  await wait(page, 600);
}

async function scrollTo(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, selector);
  await wait(page, 500);
}

/* ── Visual Highlighter — draws a pulsing border around an element ── */
async function highlight(page, selectorOrLocator, durationMs = 2500) {
  // Accept either a string selector or a Playwright locator
  if (typeof selectorOrLocator === 'string') {
    await page.evaluate(([sel, dur]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const prev = el.style.cssText;
      el.style.outline = '3px solid #ff4444';
      el.style.outlineOffset = '3px';
      el.style.boxShadow = '0 0 16px 4px rgba(255,68,68,0.45)';
      el.style.transition = 'outline 0.3s, box-shadow 0.3s';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { el.style.cssText = prev; }, dur);
    }, [selectorOrLocator, durationMs]);
  } else {
    // Locator — evaluate on the element handle
    try {
      const handle = await selectorOrLocator.elementHandle({ timeout: 2000 });
      if (handle) {
        await handle.evaluate((el, dur) => {
          const prev = el.style.cssText;
          el.style.outline = '3px solid #ff4444';
          el.style.outlineOffset = '3px';
          el.style.boxShadow = '0 0 16px 4px rgba(255,68,68,0.45)';
          el.style.transition = 'outline 0.3s, box-shadow 0.3s';
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { el.style.cssText = prev; }, dur);
        }, durationMs);
      }
    } catch { /* element not found — skip highlight */ }
  }
  await wait(page, 600);
}

/* ── Highlight + click a tab ─────────────────────────────── */
async function clickTab(page, name, highlightMs = 2000) {
  const tab = page.getByRole('tab', { name: new RegExp(name, 'i') });
  if (await tab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await highlight(page, tab.first(), highlightMs);
    await tab.first().click();
    await ready(page);
    await wait(page, 1200);
    return true;
  }
  return false;
}

/* ── Highlight + click a button ──────────────────────────── */
async function clickButton(page, name, highlightMs = 2000) {
  const btn = page.getByRole('button', { name: new RegExp(name, 'i') });
  if (await btn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await highlight(page, btn.first(), highlightMs);
    await btn.first().click();
    await ready(page);
    await wait(page, 1000);
    return true;
  }
  return false;
}

/* ── Narration sync ──────────────────────────────────────── */
const markers   = [];
let   testStart = 0;
let   lastMarker = null;

async function narrate(page, label) {
  if (lastMarker) {
    const prevDur = (clipTimings[lastMarker.label] || 0) * 1000;
    const elapsed = Date.now() - testStart - lastMarker.time_ms;
    const gap     = prevDur + 500 - elapsed;
    if (gap > 0) await page.waitForTimeout(gap);
  }
  const time_ms = Date.now() - testStart;
  markers.push({ time_ms, label });
  lastMarker = { label, time_ms };
  console.log(`[NARRATE] ${label} @ ${(time_ms / 1000).toFixed(1)}s`);
}


/* ═══════════════════════════════════════════════════════════
 *  DEMO TEST
 * ═══════════════════════════════════════════════════════════ */
test('Full Application Demo', async ({ page }) => {
  test.setTimeout(1200_000); // 20 min max

  testStart = Date.now();

  /* ─── INTRO ─────────────────────────────────────────────── */
  await narrate(page, 'INTRO');
  await page.goto('/login');
  await wait(page, 2000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 1 — Login & Admin Dashboard
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_01_LOGIN');
  await highlight(page, 'input[type="password"], input[name="email"]', 2000);
  await wait(page, 1500);

  await narrate(page, 'SCENE_01_ADMIN_LOGIN');
  await login(page, 'admin');
  await wait(page, 1500);

  await narrate(page, 'SCENE_01_DASHBOARD');
  // Highlight the metric cards row
  await highlight(page, '.MuiGrid-container, .MuiCard-root', 2500);
  await wait(page, 1500);

  await narrate(page, 'SCENE_01_DASHBOARD_SCROLL');
  await scrollFullPage(page);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 2 — Employee Management
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_02_EMPLOYEES');
  await nav(page, 'employees');
  // Highlight Add Employee button
  await highlight(page, '[data-testid="employee-list-add-btn"]', 2000);
  // Highlight Export button
  await highlight(page, '[data-testid="employee-list-export-btn"]', 1500);
  await wait(page, 1000);

  // Search
  await narrate(page, 'SCENE_02_SEARCH');
  const searchBox = page.locator('[data-testid="employee-list-search"] input, input[placeholder*="earch"]').first();
  await highlight(page, searchBox, 2000);
  if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
    await searchBox.fill('Alice');
    await wait(page, 1500);
    await searchBox.clear();
    await wait(page, 1200);
  }

  // Highlight filters row
  await highlight(page, '[data-testid="employee-list-filter-status"]', 1500);
  await wait(page, 500);

  // Switch to list view (default is card view)
  await narrate(page, 'SCENE_02_PROFILE');
  const listToggle = page.locator('[data-testid="employee-list-view-toggle-list"]');
  if (await listToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await listToggle.click();
    await wait(page, 1000);
  }

  // Click view button on first employee (now in table/list view)
  const viewBtn = page.locator('[data-testid="employee-table-view-btn"]').first();
  if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await highlight(page, viewBtn, 1500);
    await viewBtn.click();
    await ready(page);
    await wait(page, 1500);
  } else {
    // fallback: click first card view button
    const cardBtn = page.locator('[data-testid="employee-card-view-btn"]').first();
    if (await cardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cardBtn.click();
      await ready(page);
      await wait(page, 1500);
    }
  }

  // Fallback: if profile still not loaded, navigate directly to Alice Brown
  const notFoundAlert = page.locator('text=Employee not found');
  if (await notFoundAlert.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.goto('/employees/bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466');
    await ready(page);
    await wait(page, 1500);
  }

  // Profile is a scrollable page — scroll through each section
  await narrate(page, 'SCENE_02_PROFILE_SECTIONS');
  // Personal Info section at top
  await highlight(page, '.MuiCard-root:first-of-type', 2000);
  await wait(page, 800);
  // Scroll to employment section
  await scrollDown(page, 400);
  await wait(page, 1000);
  // Scroll to salary section
  await scrollDown(page, 400);
  await wait(page, 1000);
  // Scroll to statutory section (bottom)
  await scrollDown(page, 400);
  await wait(page, 1000);
  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(page, 800);

  // Go back to employee list
  await clickButton(page, 'back|←');
  await ready(page);
  await wait(page, 800);

  // Add Employee form
  await narrate(page, 'SCENE_02_ADD_EMPLOYEE');
  await clickButton(page, 'add employee');
  await wait(page, 1500);
  // Show the form, scroll down to show all fields
  await scrollDown(page, 400);
  await wait(page, 1000);
  // Cancel / go back
  await clickButton(page, 'cancel|back|close') || await page.goBack();
  await ready(page);
  await wait(page, 800);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 3 — Leave Management (Admin)
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_03_LEAVE');
  await nav(page, 'leave-management');
  await wait(page, 1000);

  // Top tabs: Leave Requests, Leave Balances
  await narrate(page, 'SCENE_03_LEAVE_TABS');
  await highlight(page, '[data-testid="leave-mgmt-search-input"]', 1500);
  // Inner sub-tabs: All, Pending, Approved, Rejected
  await clickTab(page, 'pending');
  await scrollDown(page, 300);
  await wait(page, 800);
  await clickTab(page, 'approved');
  await clickTab(page, 'rejected');
  await clickTab(page, 'all');
  // Switch to Leave Balances top-level tab
  await clickTab(page, 'leave balances');
  await wait(page, 1500);
  await scrollDown(page, 300);
  await wait(page, 800);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 4 — Attendance Management
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_04_ATTENDANCE');
  await nav(page, 'attendance-management');
  // Highlight Mark Attendance button
  await highlight(page, '[data-testid="attendance-mark-btn"]', 2000);
  // Highlight date filter
  await highlight(page, '[data-testid="attendance-date-filter"]', 1500);
  // Highlight the data grid
  await highlight(page, '[data-testid="attendance-data-grid"]', 2000);
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 5 — Timesheets (Admin)
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_05_TIMESHEETS');
  await nav(page, 'timesheets');
  await wait(page, 1000);

  await narrate(page, 'SCENE_05_TIMESHEET_TABS');
  // Tabs: My Timesheet, Approvals, History
  await clickTab(page, 'approvals');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'history');
  await wait(page, 1000);
  await clickTab(page, 'my timesheet');
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 6 — Payroll Management
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_06_PAYROLL');
  await nav(page, 'payroll-management');
  await wait(page, 1000);

  await narrate(page, 'SCENE_06_PAYROLL_TABS');
  // Tabs: Overview, Generate, Process Payments
  await highlight(page, '[data-testid="payroll-tabs"]', 2000);
  await clickTab(page, 'overview');
  await highlight(page, '[data-testid="payroll-search"]', 1500);
  await scrollDown(page, 300);
  await wait(page, 800);
  await clickTab(page, 'generate');
  await wait(page, 1200);
  await clickTab(page, 'process payments');
  await wait(page, 1200);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 7 — Tasks & Projects
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_07_TASKS');
  await nav(page, 'project-task-config');
  await wait(page, 800);

  await narrate(page, 'SCENE_07_TASKS_TABS');
  // Tabs: Projects, Tasks
  await highlight(page, '[data-testid="ptc-tab-projects"]', 2000);
  await clickTab(page, 'projects');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'tasks');
  await highlight(page, '[data-testid="ptc-search-input"]', 1500);
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 8 — Performance Reviews
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_08_REVIEWS');
  await nav(page, 'employee-reviews');
  await wait(page, 800);

  await narrate(page, 'SCENE_08_REVIEWS_TABS');
  // Tabs: All Reviews, Drafts, Pending, Completed
  await highlight(page, '[data-testid="reviews-search"]', 1500);
  await clickTab(page, 'all reviews');
  await scrollDown(page, 300);
  await wait(page, 800);
  await clickTab(page, 'drafts');
  await clickTab(page, 'pending');
  await clickTab(page, 'completed');
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 9 — Organization Settings
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_09_ORGANIZATION');
  await nav(page, 'organization');
  await wait(page, 800);

  await narrate(page, 'SCENE_09_ORG_TABS');
  // Tabs: Departments, Positions, Holidays
  await clickTab(page, 'departments');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'positions');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'holidays');
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 10 — User Management
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_10_USER_MGMT');
  await nav(page, 'user-management');
  await wait(page, 800);

  await narrate(page, 'SCENE_10_USER_TABS');
  // Tabs: Create User, Manage Users
  await highlight(page, '[data-testid="usermgmt-tab-manage"]', 2000);
  await clickTab(page, 'manage users');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'create user');
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 11 — Reports
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_11_REPORTS');
  await nav(page, 'reports');
  await wait(page, 800);

  await narrate(page, 'SCENE_11_REPORTS_TABS');
  // Tabs: Employee Reports, Leave Reports, Timesheet Reports, Payroll Reports
  await clickTab(page, 'employee reports');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'leave reports');
  await wait(page, 1000);
  await clickTab(page, 'timesheet reports');
  await wait(page, 1000);
  await clickTab(page, 'payroll reports');
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 12 — System Settings
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_12_SETTINGS');
  await nav(page, 'admin/settings-hub');
  await wait(page, 800);

  await narrate(page, 'SCENE_12_SETTINGS_TABS');
  // Tabs: Email, Preferences, Advanced
  await clickTab(page, 'email');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'preferences');
  await scrollDown(page, 300);
  await wait(page, 1000);
  await clickTab(page, 'advanced');
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 13 — Help / User Guide
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_13_HELP');
  await nav(page, 'user-guide');
  await wait(page, 800);
  // Highlight search
  await highlight(page, 'input[placeholder*="earch"]', 2000);
  // Highlight tabs (All Guides / With Video)
  await clickTab(page, 'with video');
  await wait(page, 800);
  await clickTab(page, 'all guides');
  await scrollDown(page, 500);
  await wait(page, 1500);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 14 — Employee Self-Service Experience
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_14_EMPLOYEE_LOGIN');
  await logout(page);
  await login(page, 'employee');
  await wait(page, 1500);

  // Employee Dashboard
  await narrate(page, 'SCENE_14_DASHBOARD');
  await scrollFullPage(page);
  await wait(page, 1000);

  // My Leave
  await narrate(page, 'SCENE_14_MY_LEAVE');
  await nav(page, 'leave-requests');
  // Highlight New Request button
  await highlight(page, '[data-testid="leave-new-request-button"]', 2000);
  // Scroll to show balance cards and request history
  await scrollFullPage(page);
  await wait(page, 1000);

  // My Timesheet
  await narrate(page, 'SCENE_14_MY_TIMESHEET');
  await nav(page, 'timesheets');
  await scrollDown(page, 300);
  await wait(page, 1200);

  // My Attendance
  await narrate(page, 'SCENE_14_MY_ATTENDANCE');
  await nav(page, 'my-attendance');
  await scrollDown(page, 300);
  await wait(page, 1200);

  // My Payslips
  await narrate(page, 'SCENE_14_MY_PAYSLIPS');
  await nav(page, 'employee-payslips');
  // Highlight summary cards
  await highlight(page, '[data-testid="employee-payslips-page"]', 2000);
  await scrollFullPage(page);
  await wait(page, 1000);

  // Open payslip PDF viewer to showcase the payslip detail
  const payslipViewBtn = page.locator('[data-testid="payslip-view-btn"]').first();
  if (await payslipViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await highlight(page, payslipViewBtn, 1500);
    await payslipViewBtn.click();
    await wait(page, 2000);
    // Scroll inside the payslip dialog to show full content
    const dialog = page.locator('[role="dialog"], .MuiDialog-paper').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await highlight(page, dialog, 2000);
      await dialog.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
      await wait(page, 1500);
    }
    // Close the payslip viewer
    const closeBtn = page.locator('[role="dialog"] button:has-text("Close"), [data-testid="payslip-close-btn"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await wait(page, 800);
    } else {
      await page.keyboard.press('Escape');
      await wait(page, 800);
    }
  }

  // My Tasks
  await narrate(page, 'SCENE_14_MY_TASKS');
  await nav(page, 'my-tasks');
  await scrollDown(page, 300);
  await wait(page, 1200);

  // My Profile
  await narrate(page, 'SCENE_14_MY_PROFILE');
  await nav(page, 'my-profile');
  // Wait for profile data to actually load (race condition: loading=false before fetchMyProfile completes)
  const profileHeader = page.locator('[data-testid="my-profile-page"] .MuiCard-root, [data-testid="employee-profile-header"]').first();
  await profileHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  // Extra wait for async profile fetch to settle
  await wait(page, 2000);
  // If still "Employee not found", navigate directly
  const empNotFound = page.locator('text=Employee not found');
  if (await empNotFound.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Force reload to give the fetch time
    await page.reload();
    await ready(page);
    await wait(page, 2000);
  }
  // Scroll through the full profile to show all sections
  await scrollFullPage(page);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 15 — Manager Experience
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_15_MANAGER_LOGIN');
  await logout(page);
  await login(page, 'manager');
  await wait(page, 1500);

  // Manager Dashboard
  await narrate(page, 'SCENE_15_DASHBOARD');
  await scrollFullPage(page);
  await wait(page, 1000);

  // Team View
  await narrate(page, 'SCENE_15_TEAM_VIEW');
  await nav(page, 'employees');
  await scrollDown(page, 300);
  await wait(page, 1200);

  // Leave Approvals
  await narrate(page, 'SCENE_15_LEAVE_APPROVALS');
  await nav(page, 'leave-management');
  await clickTab(page, 'pending');
  await wait(page, 1200);

  // Timesheet Approvals
  await narrate(page, 'SCENE_15_TIMESHEET_APPROVALS');
  await page.goto('/timesheets?view=approvals');
  await ready(page);
  await wait(page, 1200);
  await scrollDown(page, 300);
  await wait(page, 1000);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 16 — HR Experience
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_16_HR_LOGIN');
  await logout(page);
  await login(page, 'hr');
  await wait(page, 1500);

  await narrate(page, 'SCENE_16_HR_EMPLOYEES');
  await nav(page, 'employees');
  await scrollDown(page, 300);
  await wait(page, 1200);

  await narrate(page, 'SCENE_16_HR_PAYROLL');
  await nav(page, 'payroll-management');
  await scrollDown(page, 300);
  await wait(page, 1200);

  /* ═══════════════════════════════════════════════════════════
   *  SCENE 17 — Closing
   * ═══════════════════════════════════════════════════════════ */
  await narrate(page, 'SCENE_17_CLOSING');
  await logout(page);
  await login(page, 'admin');
  await wait(page, 2000);

  // Final lingering shot on admin dashboard
  const closingDur = (clipTimings['SCENE_17_CLOSING'] || 10) * 1000;
  const closingElapsed = Date.now() - testStart - lastMarker.time_ms;
  const closingGap = closingDur + 500 - closingElapsed;
  if (closingGap > 0) await wait(page, closingGap);

  /* ── Save markers ──────────────────────────────────────── */
  const markersPath = path.join(__dirname, '..', '..', '..', 'demo-output', 'video-markers.json');
  fs.writeFileSync(markersPath, JSON.stringify(markers, null, 2));
  console.log(`[DEMO] Complete. ${markers.length} markers → video-markers.json`);
});
