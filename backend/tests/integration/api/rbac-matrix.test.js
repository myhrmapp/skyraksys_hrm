/**
 * rbac-matrix.test.js
 * ────────────────────
 * Systematic RBAC coverage for every major API endpoint.
 *
 * Strategy:
 *   - For every endpoint, test all 5 states:
 *       unauthenticated → 401
 *       employee (wrong role) → 403
 *       manager  (wrong role) → 403
 *       hr       (may/may not have access)
 *       admin    (always has access)
 *
 * A 200/201/404/422 means "the role was ALLOWED" (auth/authz passed).
 * A 403 means "the role was DENIED" (correct behavior we are verifying).
 * A 401 means "unauthenticated" (no token, or bad token).
 *
 * NOTE: This file does NOT test correctness of business logic — only that
 * the right roles are accepted/rejected at the route layer.
 */

const request    = require('supertest');
const app        = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER_UUID = '00000000-0000-4000-8000-000000000001';

/** 401 when no token supplied */
async function expectUnauth(method, path, body) {
  const req = request(app)[method](path);
  if (body) req.send(body).set('Content-Type', 'application/json');
  const res = await req;
  expect(res.status).toBe(401);
}

/** 403 when wrong role supplies a valid token */
async function expectForbidden(method, path, token, body) {
  const req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
  if (body) req.send(body).set('Content-Type', 'application/json');
  const res = await req;
  expect(res.status).toBe(403);
}

/** Auth passed: 2xx, 404 (not found), or 422 (validation error) are all "allowed through" */
async function expectAllowed(method, path, token, body) {
  const req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
  if (body) req.send(body).set('Content-Type', 'application/json');
  const res = await req;
  expect([200, 201, 204, 400, 404, 409, 422]).toContain(res.status);
  // Specifically must NOT be 401 or 403
  expect(res.status).not.toBe(401);
  expect(res.status).not.toBe(403);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('RBAC Matrix — Route-level Access Control', () => {
  let helper;
  let adminToken, hrToken, managerToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    ({ token: adminToken }    = await helper.createAdminUser());
    ({ token: hrToken }       = await helper.createHRUser());
    ({ token: managerToken }  = await helper.createManagerUser());
    ({ token: employeeToken } = await helper.createEmployeeUser());
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // ── AUTH ──────────────────────────────────────────────────────────────────

  describe('Auth endpoints (public — no auth needed)', () => {
    it('POST /api/auth/login — accepts unauthenticated (returns 400/401/422 on bad creds, not 403)', async () => {
      const res = await request(app).post('/api/auth/login')
        .send({ email: 'x@x.com', password: 'bad' });
      expect(res.status).not.toBe(403);
    });
  });

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────

  describe('GET /api/employees', () => {
    it('401 without token', () => expectUnauth('get', '/api/employees'));
    it('admin allowed',    () => expectAllowed('get', '/api/employees', adminToken));
    it('hr allowed',       () => expectAllowed('get', '/api/employees', hrToken));
    it('manager allowed',  () => expectAllowed('get', '/api/employees', managerToken));
    it('employee allowed (own data filtered)', () => expectAllowed('get', '/api/employees', employeeToken));
  });

  describe('POST /api/employees', () => {
    const body = {
      firstName: 'RBAC', lastName: 'Test', email: `rbac_${Date.now()}@test.com`,
      hireDate: '2026-01-01', role: 'employee', password: 'Password123!'
    };
    it('401 without token', () => expectUnauth('post', '/api/employees', body));
    it('admin allowed',    () => expectAllowed('post', '/api/employees', adminToken, body));
    it('hr allowed',       () => expectAllowed('post', '/api/employees', hrToken, { ...body, email: `rbac_hr_${Date.now()}@test.com` }));
    it('manager forbidden', () => expectForbidden('post', '/api/employees', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/employees', employeeToken, body));
  });

  describe('DELETE /api/employees/:id', () => {
    it('401 without token', () => expectUnauth('delete', `/api/employees/${PLACEHOLDER_UUID}`));
    it('admin allowed (404 if not found)', () => expectAllowed('delete', `/api/employees/${PLACEHOLDER_UUID}`, adminToken));
    it('hr allowed (404 if not found)',    () => expectAllowed('delete', `/api/employees/${PLACEHOLDER_UUID}`, hrToken));
    it('manager forbidden', () => expectForbidden('delete', `/api/employees/${PLACEHOLDER_UUID}`, managerToken));
    it('employee forbidden', () => expectForbidden('delete', `/api/employees/${PLACEHOLDER_UUID}`, employeeToken));
  });

  // ── LEAVE ─────────────────────────────────────────────────────────────────

  describe('GET /api/leaves', () => {
    it('401 without token', () => expectUnauth('get', '/api/leaves'));
    it('admin allowed',     () => expectAllowed('get', '/api/leaves', adminToken));
    it('hr allowed',        () => expectAllowed('get', '/api/leaves', hrToken));
    it('manager allowed',   () => expectAllowed('get', '/api/leaves', managerToken));
    it('employee allowed (own data)', () => expectAllowed('get', '/api/leaves', employeeToken));
  });

  describe('PUT /api/leaves/:id/approve', () => {
    it('401 without token', () => expectUnauth('put', `/api/leaves/${PLACEHOLDER_UUID}/approve`));
    it('admin allowed (404 if not found)', () => expectAllowed('put', `/api/leaves/${PLACEHOLDER_UUID}/approve`, adminToken, {}));
    it('hr allowed',    () => expectAllowed('put', `/api/leaves/${PLACEHOLDER_UUID}/approve`, hrToken, {}));
    it('manager allowed', () => expectAllowed('put', `/api/leaves/${PLACEHOLDER_UUID}/approve`, managerToken, {}));
    it('employee forbidden', () => expectForbidden('put', `/api/leaves/${PLACEHOLDER_UUID}/approve`, employeeToken, {}));
  });

  // ── PAYROLL ───────────────────────────────────────────────────────────────

  describe('GET /api/payroll', () => {
    it('401 without token', () => expectUnauth('get', '/api/payroll'));
    it('admin allowed',     () => expectAllowed('get', '/api/payroll', adminToken));
    it('hr allowed',        () => expectAllowed('get', '/api/payroll', hrToken));
    it('manager forbidden', () => expectForbidden('get', '/api/payroll', managerToken));
    it('employee forbidden', () => expectForbidden('get', '/api/payroll', employeeToken));
  });

  describe('POST /api/payroll/calculate', () => {
    const body = { employeeId: PLACEHOLDER_UUID, payPeriodStart: '2026-01-01', payPeriodEnd: '2026-01-31' };
    it('401 without token', () => expectUnauth('post', '/api/payroll/calculate', body));
    it('admin allowed',     () => expectAllowed('post', '/api/payroll/calculate', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/payroll/calculate', hrToken, body));
    it('manager forbidden', () => expectForbidden('post', '/api/payroll/calculate', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/payroll/calculate', employeeToken, body));
  });

  // ── SALARY STRUCTURES ─────────────────────────────────────────────────────

  describe('POST /api/salary-structures', () => {
    const body = { employeeId: PLACEHOLDER_UUID, basicSalary: 50000 };
    it('401 without token', () => expectUnauth('post', '/api/salary-structures', body));
    it('admin allowed',     () => expectAllowed('post', '/api/salary-structures', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/salary-structures', hrToken, body));
    it('manager forbidden', () => expectForbidden('post', '/api/salary-structures', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/salary-structures', employeeToken, body));
  });

  // ── DEPARTMENTS ───────────────────────────────────────────────────────────

  describe('GET /api/departments', () => {
    it('401 without token', () => expectUnauth('get', '/api/departments'));
    it('admin allowed',     () => expectAllowed('get', '/api/departments', adminToken));
    it('hr allowed',        () => expectAllowed('get', '/api/departments', hrToken));
    it('manager allowed',   () => expectAllowed('get', '/api/departments', managerToken));
    it('employee allowed',  () => expectAllowed('get', '/api/departments', employeeToken));
  });

  describe('POST /api/departments', () => {
    const body = { name: `RBACDept_${Date.now()}` };
    it('401 without token', () => expectUnauth('post', '/api/departments', body));
    it('admin allowed',     () => expectAllowed('post', '/api/departments', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/departments', hrToken, { name: `RBACDept_hr_${Date.now()}` }));
    it('manager forbidden', () => expectForbidden('post', '/api/departments', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/departments', employeeToken, body));
  });

  describe('DELETE /api/departments/:id', () => {
    it('401 without token', () => expectUnauth('delete', `/api/departments/${PLACEHOLDER_UUID}`));
    it('admin allowed (404 ok)', () => expectAllowed('delete', `/api/departments/${PLACEHOLDER_UUID}`, adminToken));
    it('hr forbidden',      () => expectForbidden('delete', `/api/departments/${PLACEHOLDER_UUID}`, hrToken));
    it('manager forbidden', () => expectForbidden('delete', `/api/departments/${PLACEHOLDER_UUID}`, managerToken));
    it('employee forbidden', () => expectForbidden('delete', `/api/departments/${PLACEHOLDER_UUID}`, employeeToken));
  });

  // ── PROJECTS ──────────────────────────────────────────────────────────────

  describe('GET /api/projects', () => {
    it('401 without token', () => expectUnauth('get', '/api/projects'));
    it('admin allowed',     () => expectAllowed('get', '/api/projects', adminToken));
    it('hr allowed',        () => expectAllowed('get', '/api/projects', hrToken));
    it('manager allowed',   () => expectAllowed('get', '/api/projects', managerToken));
    it('employee allowed',  () => expectAllowed('get', '/api/projects', employeeToken));
  });

  describe('POST /api/projects', () => {
    const body = { name: `RBACProj_${Date.now()}`, startDate: '2026-01-01' };
    it('401 without token', () => expectUnauth('post', '/api/projects', body));
    it('admin allowed',     () => expectAllowed('post', '/api/projects', adminToken, body));
    it('hr forbidden',      () => expectForbidden('post', '/api/projects', hrToken, body));
    it('manager allowed',   () => expectAllowed('post', '/api/projects', managerToken, { ...body, name: `RBACProj_mgr_${Date.now()}` }));
    it('employee forbidden', () => expectForbidden('post', '/api/projects', employeeToken, body));
  });

  describe('DELETE /api/projects/:id', () => {
    it('401 without token', () => expectUnauth('delete', `/api/projects/${PLACEHOLDER_UUID}`));
    it('admin allowed (404 ok)', () => expectAllowed('delete', `/api/projects/${PLACEHOLDER_UUID}`, adminToken));
    it('hr forbidden',           () => expectForbidden('delete', `/api/projects/${PLACEHOLDER_UUID}`, hrToken));
    it('manager forbidden',      () => expectForbidden('delete', `/api/projects/${PLACEHOLDER_UUID}`, managerToken));
    it('employee forbidden',     () => expectForbidden('delete', `/api/projects/${PLACEHOLDER_UUID}`, employeeToken));
  });

  // ── TASKS ─────────────────────────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    const body = { title: 'RBAC Task', projectId: PLACEHOLDER_UUID };
    it('401 without token', () => expectUnauth('post', '/api/tasks', body));
    it('admin allowed',     () => expectAllowed('post', '/api/tasks', adminToken, body));
    it('hr forbidden',      () => expectForbidden('post', '/api/tasks', hrToken, body));
    it('manager allowed',   () => expectAllowed('post', '/api/tasks', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/tasks', employeeToken, body));
  });

  // ── HOLIDAYS ─────────────────────────────────────────────────────────────

  describe('POST /api/holidays', () => {
    const body = { name: `RBAC Holiday ${Date.now()}`, date: '2026-12-25', type: 'public' };
    it('401 without token', () => expectUnauth('post', '/api/holidays', body));
    it('admin allowed',     () => expectAllowed('post', '/api/holidays', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/holidays', hrToken, { ...body, date: '2026-12-26' }));
    it('manager forbidden', () => expectForbidden('post', '/api/holidays', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/holidays', employeeToken, body));
  });

  // ── SYSTEM CONFIG ────────────────────────────────────────────────────────

  describe('GET /api/system-config/audit-trail', () => {
    it('401 without token', () => expectUnauth('get', '/api/system-config/audit-trail'));
    it('admin allowed',     () => expectAllowed('get', '/api/system-config/audit-trail', adminToken));
    it('hr forbidden',      () => expectForbidden('get', '/api/system-config/audit-trail', hrToken));
    it('manager forbidden', () => expectForbidden('get', '/api/system-config/audit-trail', managerToken));
    it('employee forbidden', () => expectForbidden('get', '/api/system-config/audit-trail', employeeToken));
  });

  // ── PERFORMANCE REVIEWS ───────────────────────────────────────────────────

  describe('POST /api/employee-reviews', () => {
    const body = {
      employeeId: PLACEHOLDER_UUID, reviewPeriod: 'Q1 2026',
      reviewType: 'quarterly', overallRating: 4
    };
    it('401 without token', () => expectUnauth('post', '/api/employee-reviews', body));
    it('admin allowed',     () => expectAllowed('post', '/api/employee-reviews', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/employee-reviews', hrToken, body));
    it('manager allowed',   () => expectAllowed('post', '/api/employee-reviews', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/employee-reviews', employeeToken, body));
  });

  // ── RESTORE (admin only) ──────────────────────────────────────────────────

  describe('GET /api/restore/employee-reviews', () => {
    it('401 without token', () => expectUnauth('get', '/api/restore/employee-reviews'));
    it('admin allowed',     () => expectAllowed('get', '/api/restore/employee-reviews', adminToken));
    it('hr forbidden',      () => expectForbidden('get', '/api/restore/employee-reviews', hrToken));
    it('manager forbidden', () => expectForbidden('get', '/api/restore/employee-reviews', managerToken));
    it('employee forbidden', () => expectForbidden('get', '/api/restore/employee-reviews', employeeToken));
  });

  // ── AUDIT LOGS (admin only) ───────────────────────────────────────────────

  describe('GET /api/admin/audit-logs', () => {
    it('401 without token', () => expectUnauth('get', '/api/admin/audit-logs'));
    it('admin allowed',     () => expectAllowed('get', '/api/admin/audit-logs', adminToken));
    it('hr forbidden',      () => expectForbidden('get', '/api/admin/audit-logs', hrToken));
    it('manager forbidden', () => expectForbidden('get', '/api/admin/audit-logs', managerToken));
    it('employee forbidden', () => expectForbidden('get', '/api/admin/audit-logs', employeeToken));
  });

  // ── PAYSLIP TEMPLATES (admin only) ────────────────────────────────────────

  describe('POST /api/payslip-templates', () => {
    const body = { name: `RBAC Template ${Date.now()}` };
    it('401 without token', () => expectUnauth('post', '/api/payslip-templates', body));
    it('admin allowed',     () => expectAllowed('post', '/api/payslip-templates', adminToken, body));
    it('hr allowed',        () => expectAllowed('post', '/api/payslip-templates', hrToken, body));
    it('manager forbidden', () => expectForbidden('post', '/api/payslip-templates', managerToken, body));
    it('employee forbidden', () => expectForbidden('post', '/api/payslip-templates', employeeToken, body));
  });
});
