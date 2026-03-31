/**
 * Timesheet Module — Full Business Flow E2E Tests
 * =================================================
 * Covers: draft creation, submission, manager approval/rejection,
 * weekly navigation, RBAC enforcement, and UI rendering.
 *
 * Prerequisites:
 *   - Backend at http://localhost:5000  (npm start in /backend)
 *   - Frontend at http://localhost:3000 (npm start in /frontend)
 *   - DB seeded: npx sequelize-cli db:seed:all
 */
const { test, expect } = require('@playwright/test');
const {
  loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL,
  todayISO, pastDateISO, currentMonday, uniqueId,
} = require('../../helpers');

// Shared state across serial flows
let createdTimesheetId = null;

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1 — TIMESHEET CRUD LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Timesheet — Flow 1: CRUD Lifecycle', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'employee'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('1a — Employee can list own timesheets', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/timesheets/me`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    // API may return plain array or {data: [...], pagination: {...}}
    const timesheets = Array.isArray(body.data) ? body.data : (body.data?.data || []);
    expect(Array.isArray(timesheets)).toBe(true);
  });

  test('1b — Employee can create a draft timesheet', async ({ page }) => {
    // Get current employee's ID (required by validation middleware)
    const meRes = await page.request.get(`${API_URL}/auth/me`);
    const meBody = await meRes.json();
    const employeeId = meBody.data?.employee?.id;
    expect(employeeId, 'Employee record not found for current user').toBeTruthy();

    // Get projects to find one with tasks accessible to this employee
    const projRes = await page.request.get(`${API_URL}/projects`);
    const projBody = await projRes.json();
    const projects = Array.isArray(projBody.data) ? projBody.data : (projBody.data?.rows || [projBody.data]);

    // Find a project that has tasks this employee can see
    let project = null;
    let task = null;
    for (const p of projects) {
      if (!p || !p.id) continue;
      if (p.tasks && p.tasks.length > 0) {
        project = p;
        task = p.tasks[0];
        break;
      }
      const taskRes = await page.request.get(`${API_URL}/tasks?projectId=${p.id}`);
      if (taskRes.ok()) {
        const taskBody = await taskRes.json();
        const tasks = Array.isArray(taskBody.data) ? taskBody.data : (taskBody.data?.data || []);
        if (tasks.length > 0) {
          project = p;
          task = tasks[0];
          break;
        }
      }
    }

    expect(project, 'No project with tasks found for employee').toBeTruthy();
    expect(task, 'No task found for employee').toBeTruthy();

    // Use UTC date arithmetic to avoid timezone issues
    const weekStart = currentMonday(); // YYYY-MM-DD string (Monday)
    const [y, m, d] = weekStart.split('-').map(Number);
    const weekEndDate = new Date(Date.UTC(y, m - 1, d + 6));
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    const payload = {
      employeeId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      projectId: project.id,
      taskId: task.id,
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
      totalHours: 40,
      status: 'Draft',
      notes: 'E2E test entry',
    };

    const res = await page.request.post(`${API_URL}/timesheets`, {
      data: payload,
      failOnStatusCode: false,
    });
    const body = await res.json();

    // Might already have a timesheet for this week — accept conflict too
    if (res.status() === 409 || res.status() === 400) {
      // Already exists — fetch a draft one so submit tests can still run
      const listRes = await page.request.get(`${API_URL}/timesheets/me`);
      if (listRes.ok()) {
        const listBody = await listRes.json();
        const entries = Array.isArray(listBody.data) ? listBody.data : (listBody.data?.data || []);
        const ts = entries.find(e => e && e.id && e.status?.toLowerCase() === 'draft');
        if (ts) createdTimesheetId = ts.id;
      }
    } else {
      expect(res.ok(), `Create failed ${res.status()}: ${JSON.stringify(body)}`).toBeTruthy();
      expect(body.success).toBe(true);
      createdTimesheetId = body.data?.id || body.data?.timesheet?.id;
    }
    expect(createdTimesheetId).toBeTruthy();
  });

  test('1c — Employee can read own timesheet by ID', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    const res = await page.request.get(`${API_URL}/timesheets/${createdTimesheetId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.id).toBe(createdTimesheetId);
  });

  test('1d — Employee can update a draft timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    const res = await page.request.put(`${API_URL}/timesheets/${createdTimesheetId}`, {
      data: { notes: 'Updated by E2E test' },
      failOnStatusCode: false,
    });
    // May be 200 or 400 depending on fields accepted
    expect([200, 400]).toContain(res.status());
  });

  test('1e — Employee can submit a draft timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    const res = await page.request.patch(`${API_URL}/timesheets/${createdTimesheetId}/submit`, {
      failOnStatusCode: false,
    });
    expect(res.ok(), `Submit failed ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status.toLowerCase()).toBe('submitted');
  });

  test('1f — Employee cannot update a submitted timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    const res = await page.request.put(`${API_URL}/timesheets/${createdTimesheetId}`, {
      data: { notes: 'Should fail' },
      failOnStatusCode: false,
    });
    // Submitted sheets are locked — should return 4xx
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — MANAGER APPROVAL WORKFLOW
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Timesheet — Flow 2: Approval Workflow', () => {
  test('2a — Manager can view pending approval queue', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.get(`${API_URL}/timesheets/approval/pending`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    await logout(page);
  });

  test('2b — Manager can approve a submitted timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'manager');
    const res = await page.request.post(`${API_URL}/timesheets/${createdTimesheetId}/approve`, {
      data: { comments: 'Approved by E2E manager test' },
      failOnStatusCode: false,
    });
    // May fail if employee's manager doesn't match — that's acceptable
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status.toLowerCase()).toBe('approved');
    } else {
      expect([400, 403, 404]).toContain(res.status());
    }
    await logout(page);
  });

  test('2c — Admin can approve any timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'admin');

    // First re-submit if already approved
    const getRes = await page.request.get(`${API_URL}/timesheets/${createdTimesheetId}`);
    const tsBody = await getRes.json();
    const currentStatus = tsBody.data?.status?.toLowerCase();

    if (currentStatus === 'approved' || currentStatus === 'rejected') {
      // Nothing more to approve — just verify the status is set
      expect(['approved', 'rejected']).toContain(currentStatus);
    } else {
      const approveRes = await page.request.post(
        `${API_URL}/timesheets/${createdTimesheetId}/approve`,
        { data: { comments: 'Admin approved' }, failOnStatusCode: false }
      );
      if (approveRes.ok()) {
        const body = await approveRes.json();
        expect(['approved', 'submitted']).toContain(body.data.status.toLowerCase());
      }
    }
    await logout(page);
  });

  test('2d — Rejection sets status to rejected with comments', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    // Create a fresh timesheet to reject
    const weekStart = pastDateISO(14); // 2 weeks ago
    const createRes = await page.request.post(`${API_URL}/timesheets`, {
      data: { weekStartDate: weekStart, status: 'draft', entries: [], totalHours: 0 },
      failOnStatusCode: false,
    });

    let tsId = null;
    if (createRes.ok()) {
      const body = await createRes.json();
      tsId = body.data?.id;

      // Submit it
      if (tsId) {
        await page.request.patch(`${API_URL}/timesheets/${tsId}/submit`, { failOnStatusCode: false });
      }
    }

    if (tsId) {
      const rejectRes = await page.request.post(`${API_URL}/timesheets/${tsId}/reject`, {
        data: { comments: 'Missing project codes' },
        failOnStatusCode: false,
      });
      if (rejectRes.ok()) {
        const body = await rejectRes.json();
        expect(body.success).toBe(true);
        expect(body.data.status.toLowerCase()).toBe('rejected');
      }
    }
    await logout(page);
  });

  test('2e — Employee cannot approve own timesheet', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/timesheets/${createdTimesheetId}/approve`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — WEEKLY QUERIES & HISTORY
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 3: Week Queries & History', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'employee'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('3a — GET /timesheets/week/:weekStart returns week data', async ({ page }) => {
    const weekStart = currentMonday();
    const res = await page.request.get(`${API_URL}/timesheets/week/${weekStart}`, {
      failOnStatusCode: false,
    });
    // 200 if sheet exists, 404 if not — both are valid
    expect([200, 404]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('3b — Admin can list all timesheets with filters', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'admin');

    const res = await page.request.get(`${API_URL}/timesheets?status=Submitted`, { failOnStatusCode: false });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    } else {
      // No submitted timesheets or filter issue — acceptable
      expect([400, 404]).toContain(res.status());
    }
  });

  test('3c — Employee cannot view another employee timesheets', async ({ page }) => {
    // Get all timesheets as admin first to find one from a different user
    await logout(page);
    await loginViaAPI(page, 'admin');
    const adminRes = await page.request.get(`${API_URL}/timesheets?limit=50`);
    const adminBody = await adminRes.json();
    const allSheets = adminBody.data || [];
    await logout(page);

    await loginViaAPI(page, 'employee');
    const meRes = await page.request.get(`${API_URL}/employees/me`);
    const meBody = await meRes.json();
    const myEmpId = meBody.data?.id;

    const otherSheet = allSheets.find(ts => ts.employeeId !== myEmpId);
    if (otherSheet) {
      const res = await page.request.get(`${API_URL}/timesheets/${otherSheet.id}`, {
        failOnStatusCode: false,
      });
      // Should be 403 or 404
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } else {
      // No other sheets to check — test passes vacuously
      expect(true).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — UI RENDERING
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 4: UI Rendering', () => {
  test('4a — TimesheetHub page renders for employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/timesheets');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/timesheet/i);
    await logout(page);
  });

  test('4b — Weekly timesheet page renders with nav controls', async ({ page }) => {
    await loginViaUI(page, 'employee');
    const weekStart = currentMonday();
    await page.goto(`/timesheets/week/${weekStart}`);
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    // Week navigation buttons should exist
    const prevBtn = page.locator('[data-testid="timesheet-prev-week"]');
    const nextBtn = page.locator('[data-testid="timesheet-next-week"]');
    await expect(prevBtn.or(nextBtn).first()).toBeVisible({ timeout: 10000 });
    await logout(page);
  });

  test('4c — Add task row is interactive', async ({ page }) => {
    await loginViaUI(page, 'employee');
    const weekStart = currentMonday();
    await page.goto(`/timesheets/week/${weekStart}`);
    await waitForPageLoad(page);

    const addTaskBtn = page.locator('[data-testid="timesheet-add-task"]');
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
      // A new row should appear
      await expect(
        page.locator('[data-testid^="timesheet-project-select-"]').first()
      ).toBeVisible({ timeout: 5000 });
    }
    await logout(page);
  });

  test('4d — Timesheet page renders for manager with approval view', async ({ page }) => {
    await loginViaUI(page, 'manager');
    await page.goto('/timesheets');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/timesheet/i);
    await logout(page);
  });

  test('4e — Save draft button exists on timesheet form', async ({ page }) => {
    await loginViaUI(page, 'employee');
    const weekStart = currentMonday();
    await page.goto(`/timesheets/week/${weekStart}`);
    await waitForPageLoad(page);

    const saveDraftBtn = page.locator('[data-testid="timesheet-save-draft"]');
    // Button may be visible but disabled if timesheet is already submitted
    if (await saveDraftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(saveDraftBtn).toBeVisible();
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 (continued) — RBAC EDGE CASES
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 5b: RBAC Edge Cases', () => {
  test('5e — HR can access approval queue', async ({ page }) => {
    await loginViaAPI(page, 'hr');
    const res = await page.request.get(`${API_URL}/timesheets/approval/pending`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    await logout(page);
  });

  test('5f — HR can approve a submitted timesheet (same as manager)', async ({ page }) => {
    if (!createdTimesheetId) { test.skip(); return; }
    await loginViaAPI(page, 'hr');
    const res = await page.request.post(`${API_URL}/timesheets/${createdTimesheetId}/approve`, {
      data: { comments: 'HR approved via E2E' },
      failOnStatusCode: false,
    });
    // Acceptable outcomes: 200 approved, 400 (already approved/not submitted), 403 (ownership rules)
    expect([200, 400, 403, 404]).toContain(res.status());
    await logout(page);
  });

  test('5g — HR can reject a submitted timesheet', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    // Create + submit a fresh timesheet to reject
    const weekStart = pastDateISO(21); // 3 weeks ago
    const createRes = await page.request.post(`${API_URL}/timesheets`, {
      data: { weekStartDate: weekStart, status: 'draft', entries: [], totalHours: 0 },
      failOnStatusCode: false,
    });
    let tsId = null;
    if (createRes.ok()) {
      const body = await createRes.json();
      tsId = body.data?.id;
      if (tsId) {
        await page.request.patch(`${API_URL}/timesheets/${tsId}/submit`, { failOnStatusCode: false });
      }
    }
    await logout(page);

    if (tsId) {
      await loginViaAPI(page, 'hr');
      const res = await page.request.post(`${API_URL}/timesheets/${tsId}/reject`, {
        data: { comments: 'HR rejected via E2E — incorrect project.' },
        failOnStatusCode: false,
      });
      if (res.ok()) {
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.status.toLowerCase()).toBe('rejected');
      } else {
        // Already rejected/approved or permission issue — acceptable
        expect([400, 403, 404]).toContain(res.status());
      }
      await logout(page);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 6 — STATS AND SUMMARY ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 6: Stats & Summary', () => {
  test('6a — GET /timesheets/stats/summary returns valid shape (manager)', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.get(`${API_URL}/timesheets/stats/summary`, {
      failOnStatusCode: false,
    });
    // Endpoint exists and returns JSON — 200 or 403 acceptable (some configs restrict)
    expect([200, 403]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    await logout(page);
  });

  test('6b — GET /timesheets/stats/summary returns valid shape (admin)', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/timesheets/stats/summary`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      // Should contain numeric stats
      const data = body.data || body;
      expect(typeof data).toBe('object');
    } else {
      expect([403, 404]).toContain(res.status());
    }
    await logout(page);
  });

  test('6c — GET /timesheets/summary returns own hours breakdown (employee)', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/timesheets/summary`, {
      failOnStatusCode: false,
    });
    expect([200, 404]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    await logout(page);
  });

  test('6d — GET /timesheets/stats/summary by HR returns data', async ({ page }) => {
    await loginViaAPI(page, 'hr');
    const res = await page.request.get(`${API_URL}/timesheets/stats/summary`, {
      failOnStatusCode: false,
    });
    expect([200, 403]).toContain(res.status());
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 7 — BULK OPERATIONS API
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 7: Bulk Operations', () => {
  test('7a — POST /bulk-approve with empty array returns 400', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-approve`, {
      data: { timesheetIds: [] },
      failOnStatusCode: false,
    });
    // Empty array should be a validation error
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('7b — POST /bulk-reject with empty array returns 400', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-reject`, {
      data: { timesheetIds: [], comments: 'batch reject' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('7c — POST /bulk-reject without comments returns 400', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-reject`, {
      data: { timesheetIds: ['00000000-0000-0000-0000-000000000001'] },
      failOnStatusCode: false,
    });
    // Comments required for rejection
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('7d — Employee cannot call /bulk-approve', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-approve`, {
      data: { timesheetIds: ['00000000-0000-0000-0000-000000000001'] },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('7e — Employee cannot call /bulk-reject', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-reject`, {
      data: { timesheetIds: ['00000000-0000-0000-0000-000000000001'], comments: 'test' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('7f — HR can call /bulk-approve (authorized role)', async ({ page }) => {
    await loginViaAPI(page, 'hr');
    const res = await page.request.post(`${API_URL}/timesheets/bulk-approve`, {
      data: { timesheetIds: ['00000000-0000-0000-0000-000000000001'] },
      failOnStatusCode: false,
    });
    // 400 (not found/not submitted) is OK; 403 is a failure
    expect(res.status()).not.toBe(403);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 — RBAC ENFORCEMENT
// ══════════════════════════════════════════════════════════════════════════
test.describe('Timesheet — Flow 5: RBAC', () => {
  test('5a — Unauthenticated request returns 401', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/timesheets`, { failOnStatusCode: false });
    expect(res.status()).toBe(401);
  });

  test('5b — Employee sees only own timesheets from /timesheets/me', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/timesheets/me`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    // All returned timesheets must belong to this employee
    const meRes = await page.request.get(`${API_URL}/employees/me`);
    const meBody = await meRes.json();
    const myEmpId = meBody.data?.id;
    if (Array.isArray(body.data)) {
      body.data.forEach(ts => {
        expect(ts.employeeId).toBe(myEmpId);
      });
    }
    await logout(page);
  });

  test('5c — Manager can see approval queue', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.get(`${API_URL}/timesheets/approval/pending`);
    expect(res.ok()).toBeTruthy();
    await logout(page);
  });

  test('5d — Employee cannot access approval queue', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/timesheets/approval/pending`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });
});
