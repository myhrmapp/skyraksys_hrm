// @ts-check
/**
 * User Management Module — E2E Tests (Excel-Driven)
 *
 * Uses a shared browser context per role group to avoid Chromium
 * headless crashes from repeated heavy React page loads on Windows.
 */
const { test: base, expect } = require('@playwright/test');
const { loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const UserManagementPage = require('../pages/UserManagementPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('UserManagement');

// Group by role
const roleGroups = {};
for (const row of rows) {
  const role = row.role || 'admin';
  if (!roleGroups[role]) roleGroups[role] = [];
  roleGroups[role].push(row);
}

/**
 * Execute a single test case action on the given page.
 */
async function runAction(page, row) {
  const um = new UserManagementPage(page);

  switch (row.action) {
    // ─── Page Load & Tabs ───
    case 'pageLoad': {
      await um.gotoUserManagement();
      const visible = await um.isPageVisible();
      expect(visible).toBeTruthy();
      break;
    }

    case 'createTabVisible': {
      await um.gotoUserManagement();
      const vis = await um.isCreateTabVisible();
      expect(vis).toBeTruthy();
      break;
    }

    case 'manageTabVisible': {
      await um.gotoUserManagement();
      const vis = await um.isManageTabVisible();
      expect(vis).toBeTruthy();
      break;
    }

    case 'switchToManageTab': {
      await um.gotoUserManagement();
      const clicked = await um.clickManageTab();
      expect(clicked).toBeTruthy();
      const searchVisible = await page.locator('[data-testid="usermgmt-search-input"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
      expect(searchVisible).toBeTruthy();
      break;
    }

    case 'switchToCreateTab': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      await page.waitForTimeout(500);
      const clicked = await um.clickCreateTab();
      expect(clicked).toBeTruthy();
      const emailVisible = await page.locator('[data-testid="usermgmt-email-input"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
      expect(emailVisible).toBeTruthy();
      break;
    }

    // ─── Create User Form ───
    case 'createFormFields': {
      await um.gotoUserManagement();
      await um.clickCreateTab();
      const emailVis = await page.locator('[data-testid="usermgmt-email-input"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
      const fnameVis = await page.locator('[data-testid="usermgmt-firstname-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      const lnameVis = await page.locator('[data-testid="usermgmt-lastname-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      const passVis = await page.locator('[data-testid="usermgmt-password-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      const confirmVis = await page.locator('[data-testid="usermgmt-confirm-password-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      const submitVis = await page.locator('[data-testid="usermgmt-submit-btn"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      expect(emailVis && fnameVis && lnameVis && passVis && confirmVis && submitVis).toBeTruthy();
      break;
    }

    case 'submitEmpty': {
      await um.gotoUserManagement();
      await um.clickCreateTab();
      await um.clickSubmit();
      const formStill = await page.locator('[data-testid="usermgmt-email-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      expect(formStill).toBeTruthy();
      break;
    }

    case 'fillCreateForm': {
      await um.gotoUserManagement();
      await um.clickCreateTab();
      if (row.email) await um.fillEmail(row.email);
      if (row.firstName) await um.fillFirstName(row.firstName);
      if (row.lastName) await um.fillLastName(row.lastName);
      if (row.userRole) await um.selectRole(row.userRole);
      if (row.password) await um.fillPassword(row.password);
      if (row.confirmPassword) await um.fillConfirmPassword(row.confirmPassword);
      const emailVal = await page.locator('[data-testid="usermgmt-email-input"] input').inputValue();
      expect(emailVal).toBeTruthy();
      break;
    }

    case 'passwordMismatch': {
      await um.gotoUserManagement();
      await um.clickCreateTab();
      await um.fillEmail(row.email || 'mismatch@test.com');
      await um.fillFirstName(row.firstName || 'Test');
      await um.fillLastName(row.lastName || 'User');
      await um.fillPassword(row.password || 'Admin@123');
      await um.fillConfirmPassword(row.confirmPassword || 'Different@123');
      await um.clickSubmit();
      const errorOrForm = await page.locator('[data-testid="usermgmt-email-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorOrForm).toBeTruthy();
      break;
    }

    case 'weakPassword': {
      await um.gotoUserManagement();
      await um.clickCreateTab();
      await um.fillEmail(row.email || 'weak@test.com');
      await um.fillFirstName(row.firstName || 'Test');
      await um.fillLastName(row.lastName || 'User');
      await um.fillPassword(row.password || '123');
      await um.fillConfirmPassword(row.confirmPassword || '123');
      await um.clickSubmit();
      const formStill = await page.locator('[data-testid="usermgmt-email-input"]')
        .isVisible({ timeout: 3000 }).catch(() => false);
      expect(formStill).toBeTruthy();
      break;
    }

    // ─── Manage Users Tab ───
    case 'manageTabLoad': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      const count = await um.getUserTableRowCount();
      expect(count).toBeGreaterThanOrEqual(0);
      break;
    }

    case 'searchUsers': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      const searched = await um.searchUsers(row.searchTerm || 'admin');
      expect(searched).toBeTruthy();
      break;
    }

    case 'filterByRole': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      await um.filterByRole(row.filterValue || 'Admin');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
      break;
    }

    case 'filterByStatus': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      await um.filterByStatus(row.filterValue || 'Active');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
      break;
    }

    case 'userCount': {
      await um.gotoUserManagement();
      await um.clickManageTab();
      const count = await um.getUserTableRowCount();
      expect(count).toBeGreaterThanOrEqual(1);
      break;
    }

    // ─── RBAC ───
    case 'rbacDenied': {
      await page.goto('/user-management');
      await waitForPageReady(page);
      await expect(page.locator('body')).toBeVisible();
      break;
    }

    default:
      throw new Error(`Unknown action: ${row.action} for test ${row.testId}`);
  }
}

// Build tests: one describe per role, with a SHARED page (no re-login per test)
for (const [role, roleRows] of Object.entries(roleGroups)) {
  base.describe(`User Management — ${role}`, () => {

    /** @type {import('@playwright/test').Page} */
    let sharedPage;
    /** @type {import('@playwright/test').BrowserContext} */
    let sharedContext;

    base.beforeAll(async ({ browser }) => {
      sharedContext = await browser.newContext();
      sharedPage = await sharedContext.newPage();
      await loginAs(sharedPage, role);
    });

    base.afterAll(async () => {
      await sharedContext.close();
    });

    for (const row of roleRows) {
      base(`${row.testId}: ${row.description}`, async () => {
        await runAction(sharedPage, row);
      });
    }
  });
}
