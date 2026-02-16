/**
 * Shared helpers for Playwright integration tests.
 * Provides login, navigation, and assertion utilities.
 */
const { expect } = require('@playwright/test');

/** Default test users (must match seeded data in the database) */
const TEST_USERS = {
  admin: { email: 'admin@skyraksys.com', password: 'admin123', role: 'admin' },
  hr:    { email: 'hr@skyraksys.com',    password: 'admin123', role: 'hr' },
  manager: { email: 'lead@skyraksys.com', password: 'admin123', role: 'manager' },
  employee: { email: 'employee1@skyraksys.com', password: 'admin123', role: 'employee' },
};

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Login via the UI login form.
 * Waits for redirect to the dashboard before returning.
 */
async function loginViaUI(page, role = 'admin') {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Wait for navigation away from login page
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

/**
 * Login via API (faster — bypasses UI).
 * Sets the access token cookie directly on the browser context.
 */
async function loginViaAPI(page, role = 'admin') {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  const response = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });

  expect(response.ok()).toBeTruthy();
  // Cookies are automatically set by the browser from Set-Cookie headers
}

/**
 * Logout by hitting the API endpoint, then navigating to login.
 */
async function logout(page) {
  try {
    await page.request.post(`${API_URL}/auth/logout`);
  } catch {
    // ignore errors
  }
  await page.goto('/login');
}

/**
 * Wait for API loading spinner to disappear.
 */
async function waitForPageLoad(page, timeout = 10000) {
  // Wait for any loading skeletons/spinners to disappear
  const spinner = page.locator('[role="progressbar"], .MuiSkeleton-root');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout });
  }
}

/**
 * Navigate to a specific page via the sidebar menu.
 */
async function navigateTo(page, menuText) {
  await page.getByRole('link', { name: new RegExp(menuText, 'i') }).click();
  await waitForPageLoad(page);
}

module.exports = {
  TEST_USERS,
  API_URL,
  loginViaUI,
  loginViaAPI,
  logout,
  waitForPageLoad,
  navigateTo,
};
