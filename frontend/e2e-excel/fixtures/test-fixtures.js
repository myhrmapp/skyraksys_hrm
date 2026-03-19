/**
 * Custom Playwright Fixtures
 * Extends base test with authenticated pages and helper utilities.
 */

const { test: base, expect } = require('@playwright/test');

const TEST_USERS = {
  admin:    { email: 'admin@skyraksys.com',     password: 'admin123', role: 'admin' },
  hr:       { email: 'hr@skyraksys.com',        password: 'admin123', role: 'hr' },
  manager:  { email: 'lead@skyraksys.com',      password: 'admin123', role: 'manager' },
  employee: { email: 'employee1@skyraksys.com',  password: 'admin123', role: 'employee' },
};

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Login via API, set auth cookie, then navigate.
 */
async function loginAs(page, role) {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });

  if (!res.ok()) {
    // Fallback to UI login
    await page.goto('/login');
    await page.locator('[data-testid="login-email-input"] input').fill(user.email);
    await page.locator('[data-testid="login-password-input"] input').fill(user.password);
    await page.locator('[data-testid="login-submit-button"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  } else {
    await page.goto('/dashboard');
  }

  await waitForPageReady(page);
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
  const navItem = page.locator(`[data-testid="nav-${routePath}"]`);
  if (await navItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    await navItem.click();
  } else {
    await page.goto(`/${routePath}`);
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

module.exports = { test, expect, TEST_USERS, API_URL, loginAs, waitForPageReady, navigateTo };
