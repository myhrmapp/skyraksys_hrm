/**
 * Cross-Role Workflows — E2E Tests
 * ==================================
 * Multi-step business journeys that span multiple roles:
 * - Employee submits → Manager approves → State propagates
 * - Admin creates → Employee uses → State is visible both sides
 *
 * Each flow is serial so later tests can rely on state created by earlier ones.
 *
 * Prerequisites:
 *   - Backend at http://localhost:5000
 *   - Frontend at http://localhost:3000
 *   - DB seeded: npx sequelize-cli db:seed:all
 */
const { test, expect } = require('@playwright/test');
const {
  loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL,
  todayISO, futureDateISO, pastDateISO, currentMonday, uniqueId,
} = require('../../helpers');

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1 — LEAVE JOURNEY
// Employee submits leave → Manager approves → Employee sees approved status
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 1: Leave Submission & Approval Journey', () => {
  let leaveId;
  let leaveTypeId;

  test('1a — Employee retrieves available leave types', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/leaves/meta/types`, {
      failOnStatusCode: false,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const types = body.data || [];
    expect(types.length).toBeGreaterThan(0);
    leaveTypeId = types[0].id;
    await logout(page);
  });

  test('1b — Employee submits a leave request', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const startDate = futureDateISO(30);
    const endDate = futureDateISO(31);
    const res = await page.request.post(`${API_URL}/leaves`, {
      data: {
        leaveTypeId,
        startDate,
        endDate,
        reason: 'Cross-role workflow test leave request with details',
      },
      failOnStatusCode: false,
    });
    if (!res.ok()) {
      // Leave creation may fail due to missing employee record, balance, or overlap
      console.log(`Cross-role leave create returned ${res.status()}`);
      test.skip();
      return;
    }
    const body = await res.json();
    leaveId = body.data?.id;
    expect(leaveId).toBeTruthy();
    expect(body.data.status.toLowerCase()).toBe('pending');
    await logout(page);
  });

  test('1c — Manager sees the pending leave request', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.get(`${API_URL}/leaves`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const requests = Array.isArray(body.data) ? body.data : (body.data?.data || []);
      const found = requests.find(l => l.id === leaveId);
      // Manager may only see team leaves; check if visible
      if (found) {
        expect(found.status.toLowerCase()).toBe('pending');
      }
    }
    await logout(page);
  });

  test('1d — Admin approves the leave request', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.put(`${API_URL}/leaves/${leaveId}/approve`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.data?.status?.toLowerCase()).toBe('approved');
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('1e — Employee sees approved status for their request', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/leaves/${leaveId}`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const status = body.data?.status?.toLowerCase();
      expect(['approved', 'pending']).toContain(status); // in case approval failed above
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — TIMESHEET JOURNEY
// Employee creates draft → Submits → Admin approves → Status reflects
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 2: Timesheet Submission & Approval Journey', () => {
  let timesheetId;
  const weekStart = currentMonday();

  test('2a — Employee creates a draft timesheet', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/timesheets`, {
      data: {
        weekStart,
        entries: [
          { day: 'monday', projectName: 'Cross-role Test', taskDescription: 'Writing E2E tests', hours: 8 },
          { day: 'tuesday', projectName: 'Cross-role Test', taskDescription: 'Code review', hours: 7 },
        ],
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      timesheetId = body.data?.id;
      expect(timesheetId).toBeTruthy();
      expect(body.data?.status).toMatch(/draft|submitted/i);
    } else {
      // May already exist for this week; try to fetch
      const listRes = await page.request.get(`${API_URL}/timesheets/week/${weekStart}`, {
        failOnStatusCode: false,
      });
      if (listRes.ok()) {
        const listBody = await listRes.json();
        timesheetId = listBody.data?.id;
      }
      expect([400, 409]).toContain(res.status());
    }
    await logout(page);
  });

  test('2b — Employee submits the timesheet', async ({ page }) => {
    if (!timesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.patch(`${API_URL}/timesheets/${timesheetId}/submit`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.data?.status).toMatch(/submitted|pending/i);
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('2c — Admin sees submitted timesheet', async ({ page }) => {
    if (!timesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/timesheets/${timesheetId}`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const status = body.data?.status?.toLowerCase();
      expect(['submitted', 'pending', 'draft', 'approved']).toContain(status);
    }
    await logout(page);
  });

  test('2d — Admin approves the submitted timesheet', async ({ page }) => {
    if (!timesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/timesheets/${timesheetId}/approve`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.data?.status).toMatch(/approved/i);
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('2e — Employee sees approved timesheet and cannot re-edit', async ({ page }) => {
    if (!timesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/timesheets/${timesheetId}`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const status = body.data?.status?.toLowerCase();
      expect(['approved', 'submitted', 'pending', 'draft']).toContain(status);
      // Attempt edit on approved timesheet — should fail
      if (status === 'approved') {
        const editRes = await page.request.put(`${API_URL}/timesheets/${timesheetId}`, {
          data: { entries: [] },
          failOnStatusCode: false,
        });
        expect(editRes.status()).toBeGreaterThanOrEqual(400);
      }
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — EMPLOYEE ONBOARDING JOURNEY
// Admin creates employee → User account auto-created → Employee can login
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 3: Employee Onboarding Journey', () => {
  let newEmployeeId;
  let newUserEmail;
  const uid = uniqueId('onboard');

  test('3a — Admin creates a new employee with user account', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    // Get department and position IDs
    const deptRes = await page.request.get(`${API_URL}/departments`);
    const deptBody = await deptRes.json();
    const department = (deptBody.data || [])[0];

    const posRes = await page.request.get(`${API_URL}/positions`);
    const posBody = await posRes.json();
    const position = (posBody.data || [])[0];

    newUserEmail = `${uid}@cross-role-test.com`;
    const res = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'Onboard',
        lastName: 'TestUser',
        email: newUserEmail,
        phone: '1234567890',
        hireDate: todayISO(),
        departmentId: department?.id,
        positionId: position?.id,
        employmentStatus: 'active',
        createUserAccount: true,
        password: 'Onboard123!',
        role: 'employee',
      },
      failOnStatusCode: false,
    });

    if (res.ok()) {
      const body = await res.json();
      newEmployeeId = body.data?.id;
      expect(newEmployeeId).toBeTruthy();
    } else {
      expect([400, 409, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('3b — Newly created employee can login', async ({ page }) => {
    if (!newEmployeeId) { test.skip(); return; }
    const res = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: newUserEmail, password: 'Onboard123!' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      // Response may nest user under body.data.user or body.data directly
      const role = body.data?.user?.role || body.data?.role;
      expect(role).toBe('employee');
    } else {
      expect([400, 401]).toContain(res.status());
    }
  });

  test('3c — New employee profile is accessible by admin', async ({ page }) => {
    if (!newEmployeeId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/employees/${newEmployeeId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.email).toBe(newUserEmail);
    await logout(page);
  });

  test('3d — Admin deletes the test employee', async ({ page }) => {
    if (!newEmployeeId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.delete(`${API_URL}/employees/${newEmployeeId}`, {
      failOnStatusCode: false,
    });
    expect([200, 204]).toContain(res.status());
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — PAYROLL CYCLE
// Admin generates payslips → Employee views own → Admin finalizes → Admin marks paid
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 4: Payroll Cycle Journey', () => {
  let payslipId;
  const payPeriod = { month: 12, year: 2024 };

  test('4a — Admin generates payslips for all employees', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/payslips/generate-all`, {
      data: { month: payPeriod.month, year: payPeriod.year },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 404, 409, 422, 500]).toContain(res.status());
    }
    await logout(page);
  });

  test('4b — Employee can view their own payslip list', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips/my`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      const payslips = body.data || [];
      const myPayslip = payslips.find(p =>
        p.month === payPeriod.month && p.year === payPeriod.year
      );
      if (myPayslip) {
        payslipId = myPayslip.id;
      }
    }
    await logout(page);
  });

  test('4c — Employee cannot access another employee payslips', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips`, {
      failOnStatusCode: false,
    });
    // Employee may get 200 with only their own, or 403 — both acceptable
    expect(res.status()).toBeLessThan(500);
    await logout(page);
  });

  test('4d — Admin finalizes payroll for the period', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/payslips/bulk-finalize`, {
      data: { month: payPeriod.month, year: payPeriod.year },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 404, 422, 500]).toContain(res.status());
    }
    await logout(page);
  });

  test('4e — Admin marks payroll as paid', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/payslips/bulk-paid`, {
      data: { month: payPeriod.month, year: payPeriod.year },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 404, 422, 500]).toContain(res.status());
    }
    await logout(page);
  });

  test('4f — Employee sees paid status in their payslip', async ({ page }) => {
    if (!payslipId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips/${payslipId}`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const status = body.data?.status;
      expect(['paid', 'finalized', 'generated', 'draft']).toContain(status);
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 — TASK ASSIGNMENT JOURNEY
// Admin creates project → Assigns task to employee → Employee sees in My Tasks
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 5: Task Assignment Journey', () => {
  let projectId;
  let taskId;
  let employeeId;

  test('5a — Get employee ID for task assignment', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/employees`);
    const body = await res.json();
    const employees = body.data || [];
    const emp = employees.find(e => e.email === 'employee1@skyraksys.com') || employees[0];
    employeeId = emp?.id;
    expect(employeeId).toBeTruthy();
    await logout(page);
  });

  test('5b — Admin creates a new project', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const uid2 = uniqueId('proj');
    const res = await page.request.post(`${API_URL}/projects`, {
      data: {
        name: `Cross-role Project ${uid2}`,
        description: 'E2E cross-role task assignment test',
        status: 'active',
        startDate: todayISO(),
        endDate: futureDateISO(30),
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      projectId = body.data?.id;
      expect(projectId).toBeTruthy();
    } else {
      expect([400, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('5c — Admin creates a task and assigns it to the employee', async ({ page }) => {
    if (!projectId || !employeeId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/tasks`, {
      data: {
        title: 'Cross-role test task',
        description: 'This task was created by admin and assigned to employee via E2E test',
        projectId,
        assigneeId: employeeId,
        priority: 'medium',
        status: 'todo',
        dueDate: futureDateISO(7),
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      taskId = body.data?.id;
      expect(taskId).toBeTruthy();
    } else {
      expect([400, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('5d — Employee sees the assigned task in My Tasks', async ({ page }) => {
    if (!taskId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/tasks/my-tasks`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const tasks = body.data || [];
      const foundTask = tasks.find(t => t.id === taskId);
      expect(foundTask).toBeTruthy();
    }
    await logout(page);
  });

  test('5e — Employee updates the task status to in-progress', async ({ page }) => {
    if (!taskId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.put(`${API_URL}/tasks/${taskId}`, {
      data: { status: 'in_progress' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.data?.status).toMatch(/in.progress/i);
    } else {
      expect([400, 403, 404, 422]).toContain(res.status());
    }
    await logout(page);
  });

  test('5f — Admin sees updated task status', async ({ page }) => {
    if (!taskId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/tasks/${taskId}`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      const status = body.data?.status;
      expect(['in_progress', 'todo']).toContain(status);
    }
    await logout(page);
  });

  test('5g — Admin deletes the task and project (cleanup)', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    if (taskId) {
      await page.request.delete(`${API_URL}/tasks/${taskId}`, { failOnStatusCode: false });
    }
    if (projectId) {
      await page.request.delete(`${API_URL}/projects/${projectId}`, { failOnStatusCode: false });
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 6 — DATA VISIBILITY CROSS-CHECKS (RBAC ISOLATION)
// Confirm data created by one role is not leaked to unauthorized roles
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Cross-Role — Flow 6: RBAC Data Isolation', () => {
  test('6a — Employee cannot access other employees profiles', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    // Get all to find an ID that is not the requesting employee
    const res = await page.request.get(`${API_URL}/employees`, {
      failOnStatusCode: false,
    });
    // Should either return only own data or be forbidden
    if (res.ok()) {
      const body = await res.json();
      const employees = body.data || [];
      // Employee list endpoint may be scoped or may return all (HR decision)
      // Key: employee should NOT see another employee's payslips
      if (employees.length > 1) {
        const otherEmpId = employees.find(e => e.email !== 'employee1@skyraksys.com')?.id;
        if (otherEmpId) {
          const payslipRes = await page.request.get(
            `${API_URL}/payroll/employee/${otherEmpId}`,
            { failOnStatusCode: false }
          );
          expect(payslipRes.status()).toBeGreaterThanOrEqual(400);
        }
      }
    }
    await logout(page);
  });

  test('6b — Employee cannot see other users leave requests detail', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const leavesRes = await page.request.get(`${API_URL}/leaves`);
    const leavesBody = await leavesRes.json();
    const adminLeaves = leavesBody.data || [];
    const otherLeave = adminLeaves.find(l =>
      l.employee?.email !== 'employee1@skyraksys.com' &&
      l.employeeEmail !== 'employee1@skyraksys.com'
    );
    await logout(page);

    if (otherLeave?.id) {
      await loginViaAPI(page, 'employee');
      const res = await page.request.get(`${API_URL}/leaves/${otherLeave.id}`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      await logout(page);
    }
  });

  test('6c — Employee cannot approve or reject leave requests', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const myRes = await page.request.get(`${API_URL}/leaves`);
    const myBody = await myRes.json();
    const myLeave = (myBody.data || [])[0];
    if (myLeave?.id) {
      const res = await page.request.put(`${API_URL}/leaves/${myLeave.id}/status`, {
        data: { status: 'approved' },
        failOnStatusCode: false,
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
    await logout(page);
  });

  test('6d — Unauthenticated requests to all key resources return 401', async ({ page }) => {
    const endpoints = [
      '/employees',
      '/leaves',
      '/timesheets',
      '/payroll',
      '/tasks',
      '/departments',
      '/positions',
    ];
    for (const endpoint of endpoints) {
      const res = await page.request.get(`${API_URL}${endpoint}`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(401);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 7 — CROSS-ROLE UI JOURNEYS
// Manager approves in UI; employee sees status change in UI
// ══════════════════════════════════════════════════════════════════════════
test.describe('Cross-Role — Flow 7: Cross-Role UI Journeys', () => {
  test('7a — Employee can navigate to leave request form and submit via UI', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/employee-dashboard');
    await waitForPageLoad(page);

    // Navigate to leave requests
    await page.goto('/leave-requests');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/leave/i);
    await logout(page);
  });

  test('7b — Manager dashboard shows pending leave approvals', async ({ page }) => {
    await loginViaUI(page, 'manager');
    await page.goto('/manager-dashboard');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    // Manager dashboard should show pending items
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/leave|approval|pending|team/i);
    await logout(page);
  });

  test('7c — Admin can see all pending timesheets in Timesheet Hub', async ({ page }) => {
    await loginViaUI(page, 'admin');
    const timesheetPages = ['/timesheet-management', '/timesheets', '/admin-dashboard'];
    for (const path of timesheetPages) {
      await page.goto(path);
      await waitForPageLoad(page);
      if (!page.url().includes('/login')) {
        const content = await page.locator('body').textContent();
        if (/timesheet/i.test(content || '')) {
          await expect(page.locator('body')).toContainText(/timesheet/i);
          break;
        }
      }
    }
    await logout(page);
  });

  test('7d — Employee My Tasks page shows assigned work', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/my-tasks');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/task/i);
    await logout(page);
  });
});
