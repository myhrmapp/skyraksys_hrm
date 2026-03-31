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

// ─── Date helpers ──────────────────────────────────────────────────────────

/** ISO date string for today */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** ISO date string N days from today */
function futureDateISO(daysAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

/** ISO date string N days before today */
function pastDateISO(daysBack = 3) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split('T')[0];
}

/** ISO date string of the most recent Monday */
function currentMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// ─── Unique data generators ────────────────────────────────────────────────

/** Generate a unique employee email for test isolation */
function uniqueEmail(prefix = 'e2e') {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@skyraksys-test.com`;
}

/** Generate a unique string id */
function uniqueId(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── API helpers ───────────────────────────────────────────────────────────

/**
 * Fetch a department ID by name (or first available if not found).
 * Returns { id, name }.
 */
async function getDepartment(page, name = 'Engineering') {
  const res = await page.request.get(`${API_URL}/departments`);
  const body = await res.json();
  const depts = body.data || body;
  return depts.find(d => d.name === name) || depts[0];
}

/**
 * Fetch a position ID by title (or first available).
 * Returns { id, title }.
 */
async function getPosition(page, title = 'Software Engineer') {
  const res = await page.request.get(`${API_URL}/positions`);
  const body = await res.json();
  const positions = body.data || body;
  return positions.find(p => p.title === title) || positions[0];
}

/**
 * Fetch a leave type ID.
 * Returns { id, name }.
 */
async function getLeaveType(page) {
  const res = await page.request.get(`${API_URL}/leave/meta/types`);
  if (!res.ok()) return null;
  const body = await res.json();
  const types = body.data || body;
  return Array.isArray(types) ? types[0] : null;
}

/**
 * Fetch the employee record for the current logged-in user.
 * Returns the employee data object.
 */
async function getMyEmployee(page) {
  const res = await page.request.get(`${API_URL}/employees/me`);
  if (!res.ok()) return null;
  const body = await res.json();
  return body.data || null;
}

/**
 * Create a minimal test employee via API. Returns the created employee object.
 * Caller is responsible for cleanup (DELETE /:id).
 */
async function createTestEmployee(page, overrides = {}) {
  const dept = await getDepartment(page);
  const pos = await getPosition(page);
  const payload = {
    firstName: 'E2ETest',
    lastName: 'Employee',
    email: uniqueEmail(),
    phone: '9000000001',
    hireDate: '2025-01-01',
    departmentId: dept?.id,
    positionId: pos?.id,
    status: 'Active',
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    nationality: 'Indian',
    employmentType: 'Full-time',
    password: 'TestPass123!',
    ...overrides,
  };
  const res = await page.request.post(`${API_URL}/employees`, {
    data: payload,
    failOnStatusCode: false,
  });
  if (!res.ok()) return null;
  const body = await res.json();
  return body.data || null;
}

/**
 * Delete a test employee by UUID (best-effort, ignores errors).
 */
async function deleteTestEmployee(page, id) {
  if (!id) return;
  await page.request.delete(`${API_URL}/employees/${id}`, { failOnStatusCode: false });
}

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
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch {
    // Navigation may be interrupted by redirect — that's OK
  }
}

/**
 * Wait for API loading spinner to disappear.
 */
async function waitForPageLoad(page, timeout = 10000) {
  // Wait for any loading skeletons/spinners to disappear
  const spinner = page.locator('[role="progressbar"], .MuiSkeleton-root');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout }).catch(() => {
      // Spinner may be a persistent global indicator — continue anyway
    });
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
  // Date helpers
  todayISO,
  futureDateISO,
  pastDateISO,
  currentMonday,
  // ID/data generators
  uniqueEmail,
  uniqueId,
  // API shortcuts
  getDepartment,
  getPosition,
  getLeaveType,
  getMyEmployee,
  createTestEmployee,
  deleteTestEmployee,
  // Login / navigation
  loginViaUI,
  loginViaAPI,
  logout,
  waitForPageLoad,
  navigateTo,
};
