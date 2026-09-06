/**
 * Custom Playwright Fixtures
 * Extends base test with authenticated pages and helper utilities.
 */

const { test: base, expect } = require('@playwright/test');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const DEFAULT_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'StrongSeedPassword2026!';

const TEST_USERS = {
  admin:    { email: process.env.E2E_ADMIN_EMAIL || 'admin@skyraksys.com', password: process.env.E2E_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD, role: 'admin' },
  hr:       { email: process.env.E2E_HR_EMAIL || 'hr@skyraksys.com', password: process.env.E2E_HR_PASSWORD || DEFAULT_SEED_PASSWORD, role: 'hr' },
  manager:  { email: process.env.E2E_MANAGER_EMAIL || 'lead@skyraksys.com', password: process.env.E2E_MANAGER_PASSWORD || DEFAULT_SEED_PASSWORD, role: 'manager' },
  employee: { email: process.env.E2E_EMPLOYEE_EMAIL || 'employee1@skyraksys.com', password: process.env.E2E_EMPLOYEE_PASSWORD || DEFAULT_SEED_PASSWORD, role: 'employee' },
};

const API_URL = process.env.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Login via UI form — reliable cross-origin auth.
 */
async function loginAs(page, role) {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  console.log(`[E2E] Attempting login as ${role} (${user.email})`);
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`[E2E] Login success for ${role}; current URL: ${page.url()}`);
  } catch (error) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const url = page.url();
    console.log(`[E2E] Login did not complete for ${role}. URL=${url}. Body=${bodyText.slice(0, 400)}`);
    throw error;
  }

  await waitForPageReady(page);
}

/**
 * Login via API — for API-level data setup/cleanup only (not browser navigation).
 */
async function loginViaAPI(page, role) {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) throw new Error(`API login failed for ${role}: ${res.status()}`);
  return res;
}

async function doLogin(page, role) {
  return loginAs(page, role);
}

async function setupAuthMatrix(browser) {
  const pages = {};
  for (const role of Object.keys(TEST_USERS)) {
    pages[`${role}Page`] = await browser.newPage();
    await loginAs(pages[`${role}Page`], role);
  }
  return pages;
}

/**
 * Wait for MUI spinners / skeletons to disappear.
 */
async function waitForPageReady(page, timeout = 10000) {
  try {
    await page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll('[role="progressbar"]');
        const skeletons = document.querySelectorAll('.MuiSkeleton-root');
        return spinners.length === 0 && skeletons.length === 0;
      },
      { timeout }
    );
  } catch {
    // Page may already be ready
  }
}

/**
 * Navigate to a route via sidebar link. Falls back to direct navigation.
 */
async function navigateTo(page, routePath) {
  const cleanPath = routePath.replace(/^\/+/, ''); // strip leading slashes to prevent //path protocol-relative URLs
  const navItem = page.locator(`[data-testid="nav-${cleanPath}"]`);
  if (await navItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    await navItem.click();
  } else {
    await page.goto(`/${cleanPath}`);
  }
  await waitForPageReady(page);
}

// Extended test fixture
const test = base.extend({
  // Authenticated admin page
  adminPage: async ({ page }, use) => {
    await loginAs(page, 'admin');
    await use(page);
  },
  // Authenticated HR page
  hrPage: async ({ page }, use) => {
    await loginAs(page, 'hr');
    await use(page);
  },
  // Authenticated manager page
  managerPage: async ({ page }, use) => {
    await loginAs(page, 'manager');
    await use(page);
  },
  // Authenticated employee page
  employeePage: async ({ page }, use) => {
    await loginAs(page, 'employee');
    await use(page);
  },
});

module.exports = { test, expect, TEST_USERS, API_URL, loginAs, doLogin, setupAuthMatrix, loginViaAPI, waitForPageReady, navigateTo };
