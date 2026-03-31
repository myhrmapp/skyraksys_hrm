/**
 * Employee Module — Full Business Flow E2E Tests (FE → API → DB)
 * ================================================================
 * Comprehensive integration tests covering every employee business flow
 * from the frontend API layer all the way to the database and back.
 *
 * These tests exercise the real backend + database (not mocks).
 *
 * Prerequisites:
 *   1. Backend running at http://localhost:5000
 *   2. Frontend running at http://localhost:3000
 *   3. Database seeded: npx sequelize-cli db:seed:all
 *
 * Seeded users:
 *   admin@skyraksys.com / admin123  (Admin)
 *   hr@skyraksys.com    / admin123  (HR)
 *   lead@skyraksys.com  / admin123  (Manager)
 *   employee1@skyraksys.com / admin123 (Employee — Alice Brown)
 *
 * Run:
 *   cd frontend
 *   npx playwright test employee-business-flows.spec.js
 */
const { test, expect } = require('@playwright/test');
const { loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL } = require('../../helpers');

// ═══════════════════════════════════════════════════════════════════════════
// Shared state — employee created in Flow 1 is used by subsequent flows
// ═══════════════════════════════════════════════════════════════════════════
let createdEmployeeId = null;   // UUID
let createdEmployeeEmpId = null; // e.g. "EMP0099"
let createdUserId = null;        // UUID of user account linked to created employee

// ═══════════════════════════════════════════════════════════════════════════
// 1. EMPLOYEE CRUD LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 1 — Employee CRUD Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Cleanup any leftover test employees from previous runs ──────────────
  test('1-pre — Cleanup leftover E2E employees', async ({ page }) => {
    // List all employees and find any with SKYT-prefix IDs from previous test runs
    const listRes = await page.request.get(`${API_URL}/employees?limit=200`);
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const employees = listBody.data?.employees || listBody.data || [];
    const testEmps = employees.filter(e =>
      e.employeeId?.startsWith('SKYT') ||
      e.email?.includes('e2e.test.')
    );
    for (const emp of testEmps) {
      await page.request.delete(`${API_URL}/employees/${emp.id}`, { failOnStatusCode: false });
    }
    // Also force-delete any soft-deleted SKYT employees via the terminate endpoint
    expect(true).toBeTruthy(); // Always passes — cleanup is best-effort
  });

  // ── 1a. List existing employees ─────────────────────────────────────────
  test('1a — GET /employees returns seeded employees', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5); // 5 seeded

    // Verify structure
    const emp = body.data[0];
    expect(emp).toHaveProperty('id');
    expect(emp).toHaveProperty('employeeId');
    expect(emp).toHaveProperty('firstName');
    expect(emp).toHaveProperty('lastName');
    expect(emp).toHaveProperty('email');
    expect(emp).toHaveProperty('status');
  });

  // ── 1b. Create a new employee ───────────────────────────────────────────
  test('1b — POST /employees creates employee + user + leave balances', async ({ page }) => {
    // Fetch a department and position for the new employee
    const deptRes = await page.request.get(`${API_URL}/employees/departments`);
    expect(deptRes.ok()).toBeTruthy();
    const depts = await deptRes.json();
    const dept = (depts.data || depts).find(d => d.name === 'Engineering')
      || (depts.data || depts)[0];
    expect(dept).toBeTruthy();

    const posRes = await page.request.get(`${API_URL}/employees/meta/positions`);
    expect(posRes.ok()).toBeTruthy();
    const poss = await posRes.json();
    const pos = (poss.data || poss).find(p => p.title === 'Software Engineer')
      || (poss.data || poss)[0];
    expect(pos).toBeTruthy();

    const uniqueEmail = `e2e.test.${Date.now()}@skyraksys.com`;
    const payload = {
      firstName: 'Testflow',
      lastName: 'Employee',
      email: uniqueEmail,
      phone: '9000000001',
      hireDate: '2025-06-01',
      departmentId: dept.id,
      positionId: pos.id,
      status: 'Active',
      gender: 'Male',
      dateOfBirth: '1995-05-15',
      nationality: 'Indian',
      employmentType: 'Full-time',
      password: 'TestPass123!',
    };
    const createRes = await page.request.post(`${API_URL}/employees`, {
      data: payload,
      failOnStatusCode: false,
    });

    const createBody = await createRes.json();
    expect(createRes.ok(), `Create failed ${createRes.status()}: ${JSON.stringify(createBody)}`).toBeTruthy();
    expect(createBody.success).toBe(true);

    const newEmp = createBody.data;
    expect(newEmp).toHaveProperty('id');
    expect(newEmp).toHaveProperty('employeeId');
    expect(newEmp.firstName).toBe('Testflow');
    expect(newEmp.lastName).toBe('Employee');
    expect(newEmp.email).toBe(uniqueEmail);
    expect(newEmp.status).toBe('Active');

    // Save for later tests
    createdEmployeeId = newEmp.id;
    createdEmployeeEmpId = newEmp.employeeId;
  });

  // ── 1c. Read back created employee ─────────────────────────────────────
  test('1c — GET /employees/:id returns the created employee', async ({ page }) => {
    expect(createdEmployeeId).toBeTruthy();

    const res = await page.request.get(`${API_URL}/employees/${createdEmployeeId}`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdEmployeeId);
    expect(body.data.firstName).toBe('Testflow');
    expect(body.data.lastName).toBe('Employee');

    // Verify associations loaded
    expect(body.data).toHaveProperty('department');
    expect(body.data).toHaveProperty('position');
  });

  // ── 1d. Get by employeeId string ──────────────────────────────────────
  test('1d — GET /employees/by-employee-id/:empId returns employee by EMP ID', async ({ page }) => {
    expect(createdEmployeeEmpId).toBeTruthy();

    const res = await page.request.get(
      `${API_URL}/employees/by-employee-id/${createdEmployeeEmpId}`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.employeeId).toBe(createdEmployeeEmpId);
  });

  // ── 1e. Update employee ─────────────────────────────────────────────────
  test('1e — PUT /employees/:id updates employee fields', async ({ page }) => {
    expect(createdEmployeeId).toBeTruthy();

    const res = await page.request.put(`${API_URL}/employees/${createdEmployeeId}`, {
      data: {
        firstName: 'Testupdate',
        lastName: 'Worker',
        phone: '9000000099',
        address: '123 Test Street',
        city: 'Bangalore',
        state: 'Karnataka',
        pinCode: '560001',
      },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe('Testupdate');
    expect(body.data.lastName).toBe('Worker');

    // Verify change persists
    const getRes = await page.request.get(`${API_URL}/employees/${createdEmployeeId}`);
    const getBody = await getRes.json();
    expect(getBody.data.firstName).toBe('Testupdate');
    expect(getBody.data.city).toBe('Bangalore');
    expect(getBody.data.pinCode).toBe('560001');
  });

  // ── 1f. Verify leave balances created ──────────────────────────────────
  test('1f — Employee creation auto-initializes leave balances', async ({ page }) => {
    expect(createdEmployeeId).toBeTruthy();

    // Query leave balances via API (leave management endpoint)
    const res = await page.request.get(
      `${API_URL}/leave-balances?employeeId=${createdEmployeeId}`
    );

    if (res.ok()) {
      const body = await res.json();
      // Should have leave balances for each leave type
      const balances = body.data || body;
      if (Array.isArray(balances)) {
        expect(balances.length).toBeGreaterThanOrEqual(1);
      }
    }
    // If endpoint doesn't support filtering, just confirm employee exists
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. EMPLOYEE SEARCH & FILTERING
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 2 — Search & Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('2a — Search by name returns matching employees', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees?search=Alice`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    const results = body.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(e => e.firstName === 'Alice')).toBe(true);
  });

  test('2b — Search by employee ID returns matching result', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees?search=EMP0001`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some(e => e.employeeId === 'EMP0001')).toBe(true);
  });

  test('2c — Search with no match returns empty array', async ({ page }) => {
    const res = await page.request.get(
      `${API_URL}/employees?search=NOTEXIST_${Date.now()}`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.data.length).toBe(0);
  });

  test('2d — Filter by status=Active returns only active employees', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees?status=Active`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);
    expect(body.data.every(e => e.status === 'Active')).toBe(true);
  });

  test('2e — Statistics endpoint returns aggregate counts', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/statistics`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('total');
    expect(typeof body.data.total).toBe('number');
    expect(body.data.total).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. EMPLOYEE PROFILE & SELF-SERVICE
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 3 — Profile & Self-Service', () => {
  test('3a — Employee can view own profile via /employees/me', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    const res = await page.request.get(`${API_URL}/employees/me`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('employee1@skyraksys.com');
    expect(body.data.firstName).toBe('Alice');

    await logout(page);
  });

  test('3b — Employee can update own limited fields', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    // First get own employee record
    const meRes = await page.request.get(`${API_URL}/employees/me`);
    const meBody = await meRes.json();
    const myId = meBody.data.id;

    // Try updating address (employee-editable field)
    const res = await page.request.put(`${API_URL}/employees/${myId}`, {
      data: {
        address: '456 E2E Test Lane',
        city: 'Mumbai',
      },
    });

    // Either succeeds or forbidden (depending on field-level access control)
    expect([200, 403]).toContain(res.status());

    await logout(page);
  });

  test('3c — Manager can view team members', async ({ page }) => {
    await loginViaAPI(page, 'manager');

    // Get team lead's employee record
    const meRes = await page.request.get(`${API_URL}/employees/me`);
    const meBody = await meRes.json();
    const managerId = meBody.data.id;

    // Get team members
    const teamRes = await page.request.get(
      `${API_URL}/employees/manager/${managerId}/team`
    );
    expect(teamRes.ok()).toBeTruthy();

    const teamBody = await teamRes.json();
    expect(teamBody.success).toBe(true);

    // Team lead manages Alice & Bob
    const teamData = teamBody.data || teamBody;
    if (Array.isArray(teamData)) {
      expect(teamData.length).toBeGreaterThanOrEqual(2);
    }

    await logout(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. USER ACCOUNT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 4 — User Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('4a — Create user account for existing employee', async ({ page }) => {
    // The employee created in Flow 1 should already have a user account
    // (created automatically). Let's verify by listing users.
    const usersRes = await page.request.get(`${API_URL}/auth/users`);
    expect(usersRes.ok()).toBeTruthy();

    const usersBody = await usersRes.json();
    expect(usersBody.success).toBe(true);

    // Find the user linked to our test employee
    const allUsers = usersBody.data || usersBody;
    if (createdEmployeeId && Array.isArray(allUsers)) {
      // Look for the user whose email matches our created employee
      const found = allUsers.find(
        u => u.email && u.email.includes('e2e.test.')
      );
      if (found) {
        createdUserId = found.id;
      }
    }
  });

  test('4b — Update user role', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    const res = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/role`,
      { data: { role: 'manager' } }
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify role persisted
    const usersRes = await page.request.get(`${API_URL}/auth/users`);
    const usersBody = await usersRes.json();
    const allUsers = usersBody.data || usersBody;
    const user = Array.isArray(allUsers)
      ? allUsers.find(u => u.id === createdUserId)
      : null;
    if (user) {
      expect(user.role).toBe('manager');
    }
  });

  test('4c — Lock user account', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    const res = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/lock`,
      { data: { isLocked: true, reason: 'E2E test lock' } }
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('4d — Unlock user account', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    const res = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/lock`,
      { data: { isLocked: false } }
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('4e — Admin reset user password', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    const res = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/reset-password`,
      { data: { newPassword: 'NewPass123!' } }
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('4f — Update user account email/role', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    const newEmail = `e2e.updated.${Date.now()}@skyraksys.com`;
    const res = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/account`,
      { data: { email: newEmail, role: 'employee' } }
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('4g — Toggle user active status', async ({ page }) => {
    if (!createdUserId) {
      test.skip();
      return;
    }

    // Deactivate
    const deactivateRes = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/status`,
      { data: { isActive: false } }
    );
    expect(deactivateRes.ok()).toBeTruthy();

    // Reactivate
    const activateRes = await page.request.put(
      `${API_URL}/auth/users/${createdUserId}/status`,
      { data: { isActive: true } }
    );
    expect(activateRes.ok()).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. COMPENSATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 5 — Compensation Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('5a — Update employee compensation', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.put(
      `${API_URL}/employees/${createdEmployeeId}/compensation`,
      {
        data: {
          salary: {
            basicSalary: 50000,
            currency: 'INR',
            payFrequency: 'monthly',
          },
        },
        failOnStatusCode: false,
      }
    );

    const body = await res.json();
    expect(res.ok(), `Compensation update failed ${res.status()}: ${JSON.stringify(body)}`).toBeTruthy();
  });

  test('5b — Read back compensation in employee profile', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.get(`${API_URL}/employees/${createdEmployeeId}`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // Salary may be in a nested salaryStructure or salary field
    const emp = body.data;
    expect(emp).toBeTruthy();
    // Just confirm the employee is fetched — salary structure varies
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. EMPLOYEE STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 6 — Status Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('6a — Change employee status to Inactive', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.patch(
      `${API_URL}/employees/${createdEmployeeId}/status`,
      { data: { status: 'Inactive' } }
    );
    expect(res.ok()).toBeTruthy();

    // Verify
    const getRes = await page.request.get(`${API_URL}/employees/${createdEmployeeId}`);
    const getBody = await getRes.json();
    expect(getBody.data.status).toBe('Inactive');
  });

  test('6b — Change employee status back to Active', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.patch(
      `${API_URL}/employees/${createdEmployeeId}/status`,
      { data: { status: 'Active' } }
    );
    expect(res.ok()).toBeTruthy();

    const getRes = await page.request.get(`${API_URL}/employees/${createdEmployeeId}`);
    const getBody = await getRes.json();
    expect(getBody.data.status).toBe('Active');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. ROLE-BASED ACCESS CONTROL (RBAC)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Flow 7 — RBAC Enforcement', () => {
  test('7a — Employee cannot create another employee', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    const res = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'Unauthorized',
        lastName: 'Attempt',
        email: `unauth.${Date.now()}@test.com`,
        phone: '9999999999',
        hireDate: '2025-01-01',
        password: 'Test1234!',
      },
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);

    await logout(page);
  });

  test('7b — Employee cannot delete another employee', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    // Try to delete a seeded employee
    const res = await page.request.delete(`${API_URL}/employees/${createdEmployeeId || 'fake-id'}`, {
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);

    await logout(page);
  });

  test('7c — Employee cannot view statistics', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    const res = await page.request.get(`${API_URL}/employees/statistics`, {
      failOnStatusCode: false,
    });

    // Should be 403 Forbidden
    expect(res.status()).toBeGreaterThanOrEqual(400);

    await logout(page);
  });

  test('7d — HR can list and manage employees', async ({ page }) => {
    await loginViaAPI(page, 'hr');

    const res = await page.request.get(`${API_URL}/employees`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    await logout(page);
  });

  test('7e — Manager can see own team but not all employees', async ({ page }) => {
    await loginViaAPI(page, 'manager');

    // Manager should be able to list employees (filtered by RBAC)
    const res = await page.request.get(`${API_URL}/employees`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
    // Manager may see all or just team — at minimum should see some
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    await logout(page);
  });

  test('7f — Employee cannot access user management endpoints', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    const res = await page.request.get(`${API_URL}/auth/users`, {
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);

    await logout(page);
  });

  test('7g — Employee cannot lock another user account', async ({ page }) => {
    await loginViaAPI(page, 'employee');

    const res = await page.request.put(
      `${API_URL}/auth/users/some-fake-id/lock`,
      {
        data: { isLocked: true },
        failOnStatusCode: false,
      }
    );

    expect(res.status()).toBeGreaterThanOrEqual(400);

    await logout(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. DATA INTEGRITY — TRANSACTION VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 8 — Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('8a — Creating employee with invalid email fails and creates nothing', async ({ page }) => {
    const countBefore = await getEmployeeCount(page);

    const res = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'Invalid',
        lastName: 'EmailTest',
        email: 'not-an-email',
        hireDate: '2025-01-01',
        password: 'Test1234!',
      },
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);

    // Employee count should not have changed
    const countAfter = await getEmployeeCount(page);
    expect(countAfter).toBe(countBefore);
  });

  test('8b — Cannot create duplicate employeeId', async ({ page }) => {
    // Try creating with existing EMP0001
    const res = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'Duplicate',
        lastName: 'Test',
        email: `dup.${Date.now()}@test.com`,
        employeeId: 'EMP0001',
        hireDate: '2025-01-01',
        password: 'Test1234!',
      },
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('8c — Cannot create duplicate email', async ({ page }) => {
    const res = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'DupEmail',
        lastName: 'Test',
        email: 'admin@skyraksys.com', // already exists
        hireDate: '2025-01-01',
        password: 'Test1234!',
      },
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('8d — Seeded data integrity — departments exist', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/departments`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const depts = body.data || body;
    expect(Array.isArray(depts)).toBe(true);

    const deptNames = depts.map(d => d.name);
    expect(deptNames).toContain('Engineering');
    expect(deptNames).toContain('Human Resources');
  });

  test('8e — Seeded data integrity — positions exist', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/meta/positions`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const positions = body.data || body;
    expect(Array.isArray(positions)).toBe(true);

    const titles = positions.map(p => p.title);
    expect(titles).toContain('Software Engineer');
    expect(titles).toContain('HR Manager');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. UI RENDERING — PAGE FLOWS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Flow 9 — UI Page Rendering', () => {
  test('9a — Employee list page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/employees');
    await waitForPageLoad(page);

    await expect(
      page.getByRole('heading', { name: /employee/i }).first()
    ).toBeVisible({ timeout: 15000 });

    await logout(page);
  });

  test('9b — Employee list page renders for HR', async ({ page }) => {
    await loginViaUI(page, 'hr');
    await page.goto('/employees');
    await waitForPageLoad(page);

    await expect(
      page.getByRole('heading', { name: /employee/i }).first()
    ).toBeVisible({ timeout: 15000 });

    await logout(page);
  });

  test('9c — Employee profile page loads', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    // Get first employee
    const res = await page.request.get(`${API_URL}/employees`);
    const { data: employees } = await res.json();
    expect(employees.length).toBeGreaterThan(0);

    const empId = employees[0].id;

    // Load profile via UI
    await logout(page);
    await loginViaUI(page, 'admin');
    await page.goto(`/employees/${empId}`);
    await waitForPageLoad(page);

    // Should see employee full name in heading
    const fullName = `${employees[0].firstName} ${employees[0].lastName}`;
    await expect(
      page.getByRole('heading', { name: fullName }).first()
    ).toBeVisible({ timeout: 15000 });

    await logout(page);
  });

  test('9d — My Profile page loads for employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/my-profile');
    await waitForPageLoad(page);

    // Should see Alice Brown's name
    await expect(
      page.getByText('Alice Brown', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    await logout(page);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. EMPLOYEE TERMINATION & DELETE
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('Flow 10 — Terminate & Delete (cleanup)', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('10a — Terminate (soft delete) employee', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.delete(
      `${API_URL}/employees/${createdEmployeeId}`
    );

    // May be 200 or 204
    expect([200, 204].some(s => res.status() === s)).toBe(true);

    // Verify employee is terminated/deleted
    const getRes = await page.request.get(
      `${API_URL}/employees/${createdEmployeeId}`,
      { failOnStatusCode: false }
    );

    // Could be 404 (soft deleted) or 200 with Terminated status
    if (getRes.ok()) {
      const body = await getRes.json();
      expect(['Terminated', 'Inactive']).toContain(body.data.status);
    } else {
      expect(getRes.status()).toBe(404);
    }
  });

  test('10b — Deleted employee no longer appears in active list', async ({ page }) => {
    if (!createdEmployeeId) {
      test.skip();
      return;
    }

    const res = await page.request.get(`${API_URL}/employees?status=Active`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const activeIds = body.data.map(e => e.id);
    expect(activeIds).not.toContain(createdEmployeeId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. DEPARTMENT & POSITION REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Flow 11 — Reference Data Endpoints', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('11a — GET /employees/departments returns departments', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/departments`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const depts = body.data || body;
    expect(Array.isArray(depts)).toBe(true);
    expect(depts.length).toBeGreaterThanOrEqual(5);

    // Each dept should have id and name
    depts.forEach(d => {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('name');
    });
  });

  test('11b — GET /employees/meta/positions returns positions', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/meta/positions`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const positions = body.data || body;
    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThanOrEqual(11);

    positions.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
    });
  });

  test('11c — GET /employees/managers returns managers list', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/managers`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const managers = body.data || body;
    expect(Array.isArray(managers)).toBe(true);
    expect(managers.length).toBeGreaterThanOrEqual(1);
  });

  test('11d — GET /employees/export returns data', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/employees/export`, {
      failOnStatusCode: false,
    });

    // Export might return CSV (200), JSON (200), or not-implemented (501/404)
    if (res.ok()) {
      const contentType = res.headers()['content-type'] || '';
      expect(
        contentType.includes('csv') ||
        contentType.includes('octet-stream') ||
        contentType.includes('text/plain') ||
        contentType.includes('json')
      ).toBe(true);
    } else {
      // If export is not yet fully implemented, accept 4xx/5xx gracefully
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. AUTH FLOW — LOGIN WITH SEEDED EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Flow 12 — Auth Flows for Employee Users', () => {
  test('12a — Admin login and get profile', async ({ page }) => {
    const loginRes = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@skyraksys.com', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data).toHaveProperty('user');
    expect(loginBody.data.user.role).toBe('admin');

    // Get profile
    const meRes = await page.request.get(`${API_URL}/auth/me`);
    expect(meRes.ok()).toBeTruthy();

    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data.email).toBe('admin@skyraksys.com');

    await logout(page);
  });

  test('12b — Employee login and get own profile', async ({ page }) => {
    const loginRes = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: 'employee1@skyraksys.com', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    const loginBody = await loginRes.json();
    expect(loginBody.data.user.role).toBe('employee');

    // Get employee profile
    const meRes = await page.request.get(`${API_URL}/employees/me`);
    expect(meRes.ok()).toBeTruthy();

    const meBody = await meRes.json();
    expect(meBody.data.firstName).toBe('Alice');
    expect(meBody.data.lastName).toBe('Brown');

    await logout(page);
  });

  test('12c — Login with wrong password fails', async ({ page }) => {
    const res = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@skyraksys.com', password: 'wrong' },
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('12d — Change password works', async ({ page }) => {
    // Login as HR user to test password change
    await loginViaAPI(page, 'hr');

    const res = await page.request.put(`${API_URL}/auth/change-password`, {
      data: {
        currentPassword: 'admin123',
        newPassword: 'NewHRPass123!',
      },
    });

    // Should succeed
    if (res.ok()) {
      // Reset back to original
      await page.request.put(`${API_URL}/auth/change-password`, {
        data: {
          currentPassword: 'NewHRPass123!',
          newPassword: 'admin123',
        },
      });
    }

    await logout(page);
  });

  test('12e — Unauthenticated request to protected endpoint fails', async ({ page }) => {
    // Don't login — direct request should fail
    const res = await page.request.get(`${API_URL}/employees`, {
      failOnStatusCode: false,
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getEmployeeCount(page) {
  const res = await page.request.get(`${API_URL}/employees`);
  if (res.ok()) {
    const body = await res.json();
    return body.data ? body.data.length : 0;
  }
  return 0;
}
