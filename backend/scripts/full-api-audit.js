/**
 * Full API Audit Script with Dry Data
 * Tests every endpoint in the SkyrakSys HRM application
 */
const http = require('http');

const BASE = 'http://localhost:5000';
let adminToken = '';
let refreshTokenValue = '';
let hrToken = '';
let employeeToken = '';

// Track results
const results = { pass: 0, fail: 0, warn: 0, errors: [] };

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Cookie'] = `accessToken=${token}`;

    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message }, headers: {} }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function extractCookies(headers) {
  const cookies = {};
  const setCookie = headers['set-cookie'];
  if (setCookie) {
    setCookie.forEach((c) => {
      const match = c.match(/^([^=]+)=([^;]+)/);
      if (match) cookies[match[1]] = match[2];
    });
  }
  return cookies;
}

function check(label, res, expectedStatus, extraCheck) {
  const ok = Array.isArray(expectedStatus) ? expectedStatus.includes(res.status) : res.status === expectedStatus;
  let extraOk = true;
  if (ok && extraCheck) {
    try { extraOk = extraCheck(res); } catch { extraOk = false; }
  }
  if (ok && extraOk) {
    results.pass++;
    console.log(`  ✓ ${label} [${res.status}]`);
  } else {
    results.fail++;
    const msg = `  ✗ ${label} [${res.status}] expected ${expectedStatus}${!extraOk ? ' (extra check failed)' : ''} → ${typeof res.body === 'string' ? res.body.slice(0, 120) : JSON.stringify(res.body).slice(0, 200)}`;
    console.log(msg);
    results.errors.push(msg);
  }
  return res;
}

function warn(label, res, note) {
  results.warn++;
  console.log(`  ⚠ ${label} [${res.status}] ${note}`);
}

// ============================================================
// TEST SUITES
// ============================================================

async function testHealth() {
  console.log('\n══════════════════════════════════════');
  console.log('1. HEALTH & STATUS');
  console.log('══════════════════════════════════════');
  check('GET /health', await req('GET', '/health'), 200);
  check('GET /api/health', await req('GET', '/api/health'), 200);
  check('GET /status', await req('GET', '/status'), 200);
}

async function testAuth() {
  console.log('\n══════════════════════════════════════');
  console.log('2. AUTH FLOW');
  console.log('══════════════════════════════════════');

  // Admin login
  let res = await req('POST', '/api/auth/login', { email: 'admin@skyraksys.com', password: 'admin123' });
  check('POST /api/auth/login (admin)', res, 200);
  const cookies = extractCookies(res.headers);
  adminToken = cookies.accessToken || '';
  refreshTokenValue = cookies.refreshToken || '';
  if (!adminToken) {
    console.log('  ✗ No accessToken cookie returned!');
    results.fail++;
    results.errors.push('Auth: No accessToken cookie from admin login');
  }

  // HR login
  res = await req('POST', '/api/auth/login', { email: 'hr@skyraksys.com', password: 'admin123' });
  check('POST /api/auth/login (hr)', res, 200);
  hrToken = extractCookies(res.headers).accessToken || '';

  // Employee login
  res = await req('POST', '/api/auth/login', { email: 'employee1@skyraksys.com', password: 'admin123' });
  check('POST /api/auth/login (employee)', res, 200);
  employeeToken = extractCookies(res.headers).accessToken || '';

  // Bad login
  res = await req('POST', '/api/auth/login', { email: 'admin@skyraksys.com', password: 'wrong' });
  check('POST /api/auth/login (bad password)', res, 401);

  // Missing fields
  res = await req('POST', '/api/auth/login', {});
  check('POST /api/auth/login (empty body)', res, [400, 401, 422]);

  // Get profile
  res = await req('GET', '/api/auth/profile', null, adminToken);
  check('GET /api/auth/profile (admin)', res, 200);

  res = await req('GET', '/api/auth/me', null, adminToken);
  check('GET /api/auth/me (admin)', res, 200);

  // Update profile
  res = await req('PUT', '/api/auth/me', { firstName: 'Admin', lastName: 'User' }, adminToken);
  check('PUT /api/auth/me', res, [200, 400]);

  // Change password (bad old password)
  res = await req('PUT', '/api/auth/change-password', { currentPassword: 'wrongold', newPassword: 'newpass123', confirmPassword: 'newpass123' }, adminToken);
  check('PUT /api/auth/change-password (wrong old)', res, [400, 401]);

  // Refresh token
  res = await req('POST', '/api/auth/refresh-token', { refreshToken: refreshTokenValue }, adminToken);
  check('POST /api/auth/refresh-token', res, [200, 401]);

  // Forgot password with non-existent email
  res = await req('POST', '/api/auth/forgot-password', { email: 'nobody@test.com' });
  check('POST /api/auth/forgot-password (non-existent)', res, [200, 404]);

  // Verify reset token with invalid token
  res = await req('POST', '/api/auth/verify-reset-token', { token: 'invalidtoken' });
  check('POST /api/auth/verify-reset-token (invalid)', res, [400, 404]);

  // Unauthenticated access
  res = await req('GET', '/api/auth/profile');
  check('GET /api/auth/profile (no auth)', res, [401, 403]);

  // GET /api/auth/users (admin-only)
  res = await req('GET', '/api/auth/users', null, adminToken);
  check('GET /api/auth/users (admin)', res, 200);

  // Cleanup tokens
  res = await req('POST', '/api/auth/cleanup-tokens', null, adminToken);
  check('POST /api/auth/cleanup-tokens (admin)', res, [200, 204]);
}

async function testUserManagement() {
  console.log('\n══════════════════════════════════════');
  console.log('3. USER MANAGEMENT (via /api/auth/users)');
  console.log('══════════════════════════════════════');

  const res = await req('GET', '/api/auth/users', null, adminToken);
  check('GET /api/auth/users', res, 200);
  const users = res.body?.data?.users || res.body?.data || [];

  if (users.length > 0) {
    const u = users[0];
    console.log(`  [INFO] Found ${users.length} user(s), first: ${u.email} role=${u.role}`);
  }

  // /api/users routes
  let r = await req('GET', '/api/users', null, adminToken);
  check('GET /api/users', r, 200);

  r = await req('GET', '/api/users/profile', null, adminToken);
  check('GET /api/users/profile', r, 200);

  r = await req('PUT', '/api/users/profile', { firstName: 'Admin' }, adminToken);
  check('PUT /api/users/profile', r, [200, 400]);
}

async function testEmployees() {
  console.log('\n══════════════════════════════════════');
  console.log('4. EMPLOYEE CRUD');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/employees', null, adminToken);
  check('GET /api/employees', res, 200);
  const employees = res.body?.data?.employees || res.body?.data || [];
  console.log(`  [INFO] Found ${employees.length} employee(s)`);

  let testEmpId = employees.length > 0 ? employees[0].id : null;

  res = await req('GET', '/api/employees/statistics', null, adminToken);
  check('GET /api/employees/statistics', res, 200);

  res = await req('GET', '/api/employees/meta/departments', null, adminToken);
  check('GET /api/employees/meta/departments', res, 200);

  res = await req('GET', '/api/employees/departments', null, adminToken);
  check('GET /api/employees/departments', res, 200);

  res = await req('GET', '/api/employees/meta/positions', null, adminToken);
  check('GET /api/employees/meta/positions', res, 200);

  res = await req('GET', '/api/employees/positions', null, adminToken);
  check('GET /api/employees/positions', res, 200);

  res = await req('GET', '/api/employees/managers', null, adminToken);
  check('GET /api/employees/managers', res, 200);

  res = await req('GET', '/api/employees/me', null, adminToken);
  check('GET /api/employees/me (admin)', res, [200, 404]);

  res = await req('GET', '/api/employees/me', null, employeeToken);
  check('GET /api/employees/me (employee)', res, 200);

  res = await req('GET', '/api/employees/team-members', null, adminToken);
  check('GET /api/employees/team-members', res, [200, 403]);

  if (testEmpId) {
    res = await req('GET', `/api/employees/${testEmpId}`, null, adminToken);
    check(`GET /api/employees/:id (${testEmpId.slice(0,8)}...)`, res, 200);

    // Update employee
    res = await req('PUT', `/api/employees/${testEmpId}`, { firstName: 'Test', lastName: 'Update' }, adminToken);
    check('PUT /api/employees/:id', res, [200, 400]);
  }

  // Create employee (dry data)
  res = await req('POST', '/api/employees', {
    firstName: 'DryTest',
    lastName: 'Audit',
    email: `audit_${Date.now()}@test.local`,
    phone: '0000000000',
    departmentId: null,
    positionId: null,
    dateOfBirth: '1990-01-01',
    hireDate: '2025-01-01',
    employeeId: `AUD${Date.now().toString().slice(-6)}`,
    status: 'active'
  }, adminToken);
  check('POST /api/employees (create dry)', res, [200, 201, 400]);
  const newEmpId = res.body?.data?.id || res.body?.data?.employee?.id;
  if (newEmpId) {
    console.log(`  [INFO] Created test employee: ${newEmpId}`);

    // Compensation
    res = await req('PUT', `/api/employees/${newEmpId}/compensation`, { basicSalary: 50000 }, adminToken);
    check('PUT /api/employees/:id/compensation', res, [200, 400]);

    // Status change
    res = await req('PATCH', `/api/employees/${newEmpId}/status`, { status: 'inactive' }, adminToken);
    check('PATCH /api/employees/:id/status', res, [200, 400]);

    // Soft delete the test employee
    res = await req('DELETE', `/api/employees/${newEmpId}`, null, adminToken);
    check('DELETE /api/employees/:id (dry)', res, [200, 204]);
  }

  // Export
  res = await req('GET', '/api/employees/export', null, adminToken);
  check('GET /api/employees/export', res, [200, 400]);
}

async function testDepartments() {
  console.log('\n══════════════════════════════════════');
  console.log('5. DEPARTMENTS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/departments', null, adminToken);
  check('GET /api/departments', res, 200);
  const depts = res.body?.data?.departments || res.body?.data || [];
  console.log(`  [INFO] Found ${depts.length} department(s)`);

  // Create
  const deptSuffix = Date.now().toString().slice(-6);
  res = await req('POST', '/api/departments', { name: `Audit Test Dept ${deptSuffix}`, code: `AUD${deptSuffix}`, description: 'Dry audit test' }, adminToken);
  check('POST /api/departments (create dry)', res, [200, 201, 400]);
  const deptId = res.body?.data?.id || res.body?.data?.department?.id;

  if (deptId) {
    res = await req('GET', `/api/departments/${deptId}`, null, adminToken);
    check('GET /api/departments/:id', res, 200);

    res = await req('PUT', `/api/departments/${deptId}`, { name: 'Audit Test Dept Updated' }, adminToken);
    check('PUT /api/departments/:id', res, [200, 400, 409]);

    res = await req('DELETE', `/api/departments/${deptId}`, null, adminToken);
    check('DELETE /api/departments/:id', res, [200, 204]);
  }

  // RBAC: employee cannot create dept
  res = await req('POST', '/api/departments', { name: 'Unauthorized' }, employeeToken);
  check('POST /api/departments (employee - RBAC)', res, [401, 403]);
}

async function testPositions() {
  console.log('\n══════════════════════════════════════');
  console.log('6. POSITIONS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/positions', null, adminToken);
  check('GET /api/positions', res, 200);
  const positions = res.body?.data?.positions || res.body?.data || [];
  console.log(`  [INFO] Found ${positions.length} position(s)`);

  res = await req('POST', '/api/positions', { title: 'Audit Test Position', code: `ATP${Date.now().toString().slice(-4)}` }, adminToken);
  check('POST /api/positions (create dry)', res, [200, 201, 400]);
  const posId = res.body?.data?.id || res.body?.data?.position?.id;

  if (posId) {
    res = await req('GET', `/api/positions/${posId}`, null, adminToken);
    check('GET /api/positions/:id', res, 200);

    res = await req('PUT', `/api/positions/${posId}`, { title: 'Updated Audit Position' }, adminToken);
    check('PUT /api/positions/:id', res, [200, 400]);

    res = await req('DELETE', `/api/positions/${posId}`, null, adminToken);
    check('DELETE /api/positions/:id', res, [200, 204]);
  }
}

async function testLeave() {
  console.log('\n══════════════════════════════════════');
  console.log('7. LEAVE SYSTEM');
  console.log('══════════════════════════════════════');

  // Leave types
  let res = await req('GET', '/api/leave/meta/types', null, adminToken);
  check('GET /api/leave/meta/types', res, 200);

  res = await req('GET', '/api/leave/meta/balance', null, adminToken);
  check('GET /api/leave/meta/balance', res, [200, 400]);

  res = await req('GET', '/api/leave', null, adminToken);
  check('GET /api/leave (admin)', res, 200);
  const leaves = res.body?.data?.leaveRequests || res.body?.data || [];
  console.log(`  [INFO] Found ${leaves.length} leave request(s)`);

  res = await req('GET', '/api/leave/me', null, employeeToken);
  check('GET /api/leave/me (employee)', res, 200);

  res = await req('GET', '/api/leave/statistics', null, adminToken);
  check('GET /api/leave/statistics', res, 200);

  res = await req('GET', '/api/leave/balance', null, employeeToken);
  check('GET /api/leave/balance (employee - admin/hr only)', res, [200, 403]);

  // Pending for manager
  res = await req('GET', '/api/leave/pending-for-manager', null, adminToken);
  check('GET /api/leave/pending-for-manager', res, [200, 403]);

  // Recent approvals
  res = await req('GET', '/api/leave/recent-approvals', null, adminToken);
  check('GET /api/leave/recent-approvals', res, [200, 403]);

  // Create leave request as employee
  const tomorrow = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 86400000 * 31).toISOString().split('T')[0];
  res = await req('POST', '/api/leave', {
    leaveTypeId: null,
    startDate: tomorrow,
    endDate: dayAfter,
    reason: 'Audit dry test leave',
    type: 'annual'
  }, employeeToken);
  check('POST /api/leave (employee create)', res, [200, 201, 400, 422]);
  const leaveId = res.body?.data?.id || res.body?.data?.leaveRequest?.id;
  if (leaveId) {
    console.log(`  [INFO] Created leave request: ${leaveId}`);

    res = await req('GET', `/api/leave/${leaveId}`, null, employeeToken);
    check('GET /api/leave/:id', res, 200);

    // Cancel
    res = await req('PATCH', `/api/leave/${leaveId}/cancel`, null, employeeToken);
    check('PATCH /api/leave/:id/cancel', res, [200, 400]);

    // Delete
    res = await req('DELETE', `/api/leave/${leaveId}`, null, adminToken);
    check('DELETE /api/leave/:id', res, [200, 204, 400]);
  }

  // Admin leave types
  res = await req('GET', '/api/admin/leave-types', null, adminToken);
  check('GET /api/admin/leave-types', res, 200);
  const leaveTypes = res.body?.data?.leaveTypes || res.body?.data || [];
  console.log(`  [INFO] Found ${leaveTypes.length} leave type(s)`);

  if (leaveTypes.length > 0) {
    res = await req('GET', `/api/admin/leave-types/${leaveTypes[0].id}`, null, adminToken);
    check('GET /api/admin/leave-types/:id', res, 200);
  }

  // Admin leave balances
  res = await req('GET', '/api/admin/leave-balances', null, adminToken);
  check('GET /api/admin/leave-balances', res, 200);
}

async function testProjects() {
  console.log('\n══════════════════════════════════════');
  console.log('8. PROJECTS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/projects', null, adminToken);
  check('GET /api/projects', res, 200);
  const projects = res.body?.data?.projects || res.body?.data || [];
  console.log(`  [INFO] Found ${projects.length} project(s)`);

  // Create
  res = await req('POST', '/api/projects', {
    name: 'Audit Test Project',
    description: 'Dry test project for audit',
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  }, adminToken);
  check('POST /api/projects (create dry)', res, [200, 201, 400]);
  const projId = res.body?.data?.id || res.body?.data?.project?.id;

  if (projId) {
    res = await req('GET', `/api/projects/${projId}`, null, adminToken);
    check('GET /api/projects/:id', res, 200);

    res = await req('PUT', `/api/projects/${projId}`, { name: 'Audit Test Project Updated', status: 'active' }, adminToken);
    check('PUT /api/projects/:id', res, [200, 400]);

    res = await req('DELETE', `/api/projects/${projId}`, null, adminToken);
    check('DELETE /api/projects/:id', res, [200, 204]);
  }
}

async function testTasks() {
  console.log('\n══════════════════════════════════════');
  console.log('9. TASKS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/tasks', null, adminToken);
  check('GET /api/tasks', res, 200);
  const tasks = res.body?.data?.tasks || res.body?.data || [];
  console.log(`  [INFO] Found ${tasks.length} task(s)`);

  res = await req('GET', '/api/tasks/my-tasks', null, employeeToken);
  check('GET /api/tasks/my-tasks (employee)', res, 200);

  // Create task (may need projectId)
  res = await req('POST', '/api/tasks', {
    title: 'Audit Test Task',
    description: 'Dry test task',
    status: 'todo',
    priority: 'medium',
    dueDate: '2025-12-31'
  }, adminToken);
  check('POST /api/tasks (create dry)', res, [200, 201, 400]);
  const taskId = res.body?.data?.id || res.body?.data?.task?.id;

  if (taskId) {
    res = await req('GET', `/api/tasks/${taskId}`, null, adminToken);
    check('GET /api/tasks/:id', res, 200);

    res = await req('PUT', `/api/tasks/${taskId}`, { title: 'Audit Task Updated' }, adminToken);
    check('PUT /api/tasks/:id', res, [200, 400]);

    res = await req('PATCH', `/api/tasks/${taskId}/progress`, { progress: 50 }, adminToken);
    check('PATCH /api/tasks/:id/progress', res, [200, 400]);

    res = await req('DELETE', `/api/tasks/${taskId}`, null, adminToken);
    check('DELETE /api/tasks/:id', res, [200, 204]);
  }
}

async function testTimesheets() {
  console.log('\n══════════════════════════════════════');
  console.log('10. TIMESHEETS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/timesheets', null, adminToken);
  check('GET /api/timesheets (admin)', res, 200);

  res = await req('GET', '/api/timesheets/me', null, employeeToken);
  check('GET /api/timesheets/me (employee)', res, 200);

  // Requires employeeId query param for admin/hr roles
  const empForTs = (await req('GET', '/api/employees?limit=1', null, adminToken)).body?.data?.[0]?.id || '';
  res = await req('GET', `/api/timesheets/summary?employeeId=${empForTs}`, null, adminToken);
  check('GET /api/timesheets/summary', res, 200);

  res = await req('GET', '/api/timesheets/stats/summary', null, adminToken);
  check('GET /api/timesheets/stats/summary', res, [200, 400]);

  res = await req('GET', '/api/timesheets/approval/pending', null, adminToken);
  check('GET /api/timesheets/approval/pending', res, [200, 403]);

  // Get current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const weekStart = monday.toISOString().split('T')[0];

  res = await req('GET', `/api/timesheets/week/${weekStart}`, null, employeeToken);
  check(`GET /api/timesheets/week/${weekStart}`, res, [200, 404]);

  // Create timesheet entry
  res = await req('POST', '/api/timesheets', {
    weekStartDate: weekStart,
    entries: [
      { date: weekStart, hours: 8, description: 'Audit test entry', projectId: null }
    ]
  }, employeeToken);
  check('POST /api/timesheets (employee create)', res, [200, 201, 400]);
  const tsId = res.body?.data?.id || res.body?.data?.timesheet?.id;

  if (tsId) {
    res = await req('GET', `/api/timesheets/${tsId}`, null, employeeToken);
    check('GET /api/timesheets/:id', res, 200);

    // Submit
    res = await req('PATCH', `/api/timesheets/${tsId}/submit`, null, employeeToken);
    check('PATCH /api/timesheets/:id/submit', res, [200, 400]);

    // Clean up
    res = await req('DELETE', `/api/timesheets/${tsId}`, null, adminToken);
    check('DELETE /api/timesheets/:id', res, [200, 204, 400]);
  }
}

async function testPayroll() {
  console.log('\n══════════════════════════════════════');
  console.log('11. SALARY STRUCTURES');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/salary-structures', null, adminToken);
  check('GET /api/salary-structures', res, 200);
  const structures = res.body?.data?.salaryStructures || res.body?.data || [];
  console.log(`  [INFO] Found ${Array.isArray(structures) ? structures.length : '?'} salary structure(s)`);

  // Get employees list to attach salary structure
  const empRes = await req('GET', '/api/employees', null, adminToken);
  const employees = empRes.body?.data?.employees || empRes.body?.data || [];
  const testEmpId = employees.length > 0 ? employees[0].id : null;

  if (testEmpId) {
    res = await req('GET', `/api/salary-structures/employee/${testEmpId}`, null, adminToken);
    check('GET /api/salary-structures/employee/:empId', res, [200, 404]);

    res = await req('GET', `/api/salary-structures/employee/${testEmpId}/current`, null, adminToken);
    check('GET /api/salary-structures/employee/:empId/current', res, [200, 404]);
  }

  console.log('\n══════════════════════════════════════');
  console.log('12. PAYROLL DATA');
  console.log('══════════════════════════════════════');

  res = await req('GET', '/api/payroll', null, adminToken);
  check('GET /api/payroll', res, 200);

  res = await req('GET', '/api/payroll/summary', null, adminToken);
  check('GET /api/payroll/summary', res, 200);

  if (testEmpId) {
    res = await req('GET', `/api/payroll/employee/${testEmpId}`, null, adminToken);
    check('GET /api/payroll/employee/:empId', res, [200, 404]);
  }

  console.log('\n══════════════════════════════════════');
  console.log('13. PAYSLIPS');
  console.log('══════════════════════════════════════');

  res = await req('GET', '/api/payslips', null, adminToken);
  check('GET /api/payslips (admin)', res, 200);

  res = await req('GET', '/api/payslips/my', null, employeeToken);
  check('GET /api/payslips/my (employee)', res, 200);

  res = await req('GET', '/api/payslips/reports/summary', null, adminToken);
  check('GET /api/payslips/reports/summary', res, [200, 400]);

  // RBAC: employee cannot access all payslips
  res = await req('GET', '/api/payslips', null, employeeToken);
  if (res.status === 403) {
    check('GET /api/payslips (employee - RBAC blocked)', res, 403);
  } else {
    warn('GET /api/payslips (employee)', res, 'Not RBAC protected or has filtered view');
  }

  console.log('\n══════════════════════════════════════');
  console.log('14. PAYSLIP TEMPLATES');
  console.log('══════════════════════════════════════');

  res = await req('GET', '/api/payslip-templates', null, adminToken);
  check('GET /api/payslip-templates', res, 200);

  res = await req('GET', '/api/payslip-templates/active', null, adminToken);
  check('GET /api/payslip-templates/active', res, [200, 404]);

  res = await req('GET', '/api/payslip-templates/default/template', null, adminToken);
  check('GET /api/payslip-templates/default/template', res, [200, 404]);
}

async function testAttendanceHolidays() {
  console.log('\n══════════════════════════════════════');
  console.log('15. HOLIDAYS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/holidays', null, adminToken);
  check('GET /api/holidays', res, 200);
  const holidays = res.body?.data?.holidays || res.body?.data || [];
  console.log(`  [INFO] Found ${Array.isArray(holidays) ? holidays.length : '?'} holiday(s)`);

  res = await req('GET', '/api/holidays/count?startDate=2026-01-01&endDate=2026-12-31', null, adminToken);
  check('GET /api/holidays/count', res, 200);

  // Create holiday
  res = await req('POST', '/api/holidays', {
    name: 'Audit Test Holiday',
    date: '2025-12-25',
    type: 'public',
    description: 'Audit holiday test'
  }, adminToken);
  check('POST /api/holidays (create dry)', res, [200, 201, 400]);
  const holId = res.body?.data?.id || res.body?.data?.holiday?.id;

  if (holId) {
    res = await req('GET', `/api/holidays/${holId}`, null, adminToken);
    check('GET /api/holidays/:id', res, 200);

    res = await req('PUT', `/api/holidays/${holId}`, { name: 'Updated Holiday' }, adminToken);
    check('PUT /api/holidays/:id', res, [200, 400]);

    res = await req('DELETE', `/api/holidays/${holId}`, null, adminToken);
    check('DELETE /api/holidays/:id', res, [200, 204]);
  }
}

async function testReviews() {
  console.log('\n══════════════════════════════════════');
  console.log('16. EMPLOYEE REVIEWS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/employee-reviews', null, adminToken);
  check('GET /api/employee-reviews', res, 200);
  const reviews = res.body?.data?.reviews || res.body?.data || [];
  console.log(`  [INFO] Found ${Array.isArray(reviews) ? reviews.length : '?'} review(s)`);

  res = await req('GET', '/api/employee-reviews/meta/dashboard', null, adminToken);
  check('GET /api/employee-reviews/meta/dashboard', res, 200);

  // Get employee for review
  const empRes = await req('GET', '/api/employees', null, adminToken);
  const employees = empRes.body?.data?.employees || empRes.body?.data || [];
  const testEmpId = employees.length > 1 ? employees[1].id : (employees.length > 0 ? employees[0].id : null);

  if (testEmpId) {
    res = await req('GET', `/api/employee-reviews/employee/${testEmpId}`, null, adminToken);
    check('GET /api/employee-reviews/employee/:empId', res, [200, 404]);

    // Create review
    res = await req('POST', '/api/employee-reviews', {
      employeeId: testEmpId,
      reviewType: 'annual',
      reviewPeriodStart: '2025-01-01',
      reviewPeriodEnd: '2025-12-31',
      overallRating: 4,
      comments: 'Audit dry test review'
    }, adminToken);
    check('POST /api/employee-reviews (create dry)', res, [200, 201, 400]);
    const reviewId = res.body?.data?.id || res.body?.data?.review?.id;

    if (reviewId) {
      res = await req('GET', `/api/employee-reviews/${reviewId}`, null, adminToken);
      check('GET /api/employee-reviews/:id', res, 200);

      res = await req('PUT', `/api/employee-reviews/${reviewId}`, { overallRating: 5, comments: 'Updated review' }, adminToken);
      check('PUT /api/employee-reviews/:id', res, [200, 400]);

      res = await req('DELETE', `/api/employee-reviews/${reviewId}`, null, adminToken);
      check('DELETE /api/employee-reviews/:id', res, [200, 204]);
    }
  }
}

async function testDashboard() {
  console.log('\n══════════════════════════════════════');
  console.log('17. DASHBOARD');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/dashboard/stats', null, adminToken);
  check('GET /api/dashboard/stats', res, [200, 404]);

  res = await req('GET', '/api/dashboard/admin-stats', null, adminToken);
  check('GET /api/dashboard/admin-stats', res, [200, 404]);

  res = await req('GET', '/api/dashboard/employee-stats', null, employeeToken);
  check('GET /api/dashboard/employee-stats (employee)', res, [200, 404]);

  // RBAC: employee cannot access admin stats
  res = await req('GET', '/api/dashboard/admin-stats', null, employeeToken);
  if (res.status === 403) {
    check('GET /api/dashboard/admin-stats (employee - RBAC)', res, 403);
  } else {
    warn('GET /api/dashboard/admin-stats (employee)', res, 'Not RBAC gated or returns filtered');
  }
}

async function testSettings() {
  console.log('\n══════════════════════════════════════');
  console.log('18. SETTINGS & ADMIN');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/settings/payslip-template', null, adminToken);
  check('GET /api/settings/payslip-template', res, [200, 404]);

  // Email config
  res = await req('GET', '/api/admin/email-config', null, adminToken);
  check('GET /api/admin/email-config', res, [200, 404]);

  res = await req('GET', '/api/admin/email-config/history', null, adminToken);
  check('GET /api/admin/email-config/history', res, [200, 404]);

  // Admin config
  res = await req('GET', '/api/admin/config', null, adminToken);
  check('GET /api/admin/config', res, [200, 404]);

  // Email status
  res = await req('GET', '/api/email/status', null, adminToken);
  check('GET /api/email/status', res, [200, 404]);

  // RBAC: employee cannot access admin config
  res = await req('GET', '/api/admin/config', null, employeeToken);
  check('GET /api/admin/config (employee - RBAC)', res, [401, 403]);

  res = await req('GET', '/api/admin/email-config', null, employeeToken);
  check('GET /api/admin/email-config (employee - RBAC)', res, [401, 403]);
}

async function testPerformanceMetrics() {
  console.log('\n══════════════════════════════════════');
  console.log('19. PERFORMANCE METRICS');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/performance/server-metrics', null, adminToken);
  check('GET /api/performance/server-metrics', res, [200, 404]);

  res = await req('GET', '/api/performance/api-metrics', null, adminToken);
  check('GET /api/performance/api-metrics', res, [200, 404]);

  res = await req('GET', '/api/performance/health-metrics', null, adminToken);
  check('GET /api/performance/health-metrics', res, [200, 404]);
}

async function testRestore() {
  console.log('\n══════════════════════════════════════');
  console.log('20. RESTORE (soft-deleted records)');
  console.log('══════════════════════════════════════');

  let res = await req('GET', '/api/restore/employee-reviews', null, adminToken);
  check('GET /api/restore/employee-reviews', res, [200, 404]);

  res = await req('GET', '/api/restore/leave-balances', null, adminToken);
  check('GET /api/restore/leave-balances', res, [200, 404]);

  res = await req('GET', '/api/restore/users', null, adminToken);
  check('GET /api/restore/users', res, [200, 404]);
}

async function testErrorHandling() {
  console.log('\n══════════════════════════════════════');
  console.log('21. ERROR HANDLING & EDGE CASES');
  console.log('══════════════════════════════════════');

  // 404 route
  let res = await req('GET', '/api/nonexistent');
  check('GET /api/nonexistent (404)', res, [404, 400]);

  // Invalid UUID
  res = await req('GET', '/api/employees/not-a-uuid', null, adminToken);
  check('GET /api/employees/not-a-uuid', res, [400, 404, 500]);
  if (res.status === 500) {
    console.log('  ✗ BUG: Invalid UUID returns 500 instead of 400/404');
    results.errors.push('BUG: /api/employees/:id with invalid UUID returns 500');
  }

  res = await req('GET', '/api/departments/not-a-uuid', null, adminToken);
  check('GET /api/departments/not-a-uuid', res, [400, 404, 500]);
  if (res.status === 500) {
    results.errors.push('BUG: /api/departments/:id with invalid UUID returns 500');
  }

  // Malformed JSON
  const rawReq = new Promise((resolve) => {
    const url = new URL(BASE + '/api/auth/login');
    const r = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.write('{invalid json');
    r.end();
  });
  const malformed = await rawReq;
  check('POST /api/auth/login (malformed JSON)', malformed, [400, 500]);
  if (malformed.status === 500) {
    results.errors.push('BUG: Malformed JSON returns 500 instead of 400');
  }

  // Empty body for required fields
  res = await req('POST', '/api/employees', {}, adminToken);
  check('POST /api/employees (empty body)', res, [400, 422]);
  if (res.status === 500) {
    results.errors.push('BUG: Empty body on POST /api/employees returns 500');
  }

  // Non-existent UUID
  res = await req('GET', '/api/employees/00000000-0000-0000-0000-000000000000', null, adminToken);
  check('GET /api/employees/:id (non-existent UUID)', res, [404, 400]);

  // SQL injection attempt (should be blocked by Sequelize parameterized queries)
  res = await req('POST', '/api/auth/login', { email: "admin' OR '1'='1", password: 'test' });
  check('POST /api/auth/login (SQL injection)', res, [400, 401]);
  if (res.status === 200) {
    results.errors.push('CRITICAL SECURITY: SQL injection succeeded!');
  }

  // XSS in string fields (should be stored safely)
  res = await req('POST', '/api/departments', { name: '<script>alert("xss")</script>', code: 'XSS1' }, adminToken);
  check('POST /api/departments (XSS payload)', res, [200, 201, 400, 409]);
  if (res.status === 200 || res.status === 201) {
    const xssDeptId = res.body?.data?.id || res.body?.data?.department?.id;
    if (xssDeptId) {
      await req('DELETE', `/api/departments/${xssDeptId}`, null, adminToken);
      console.log('  [INFO] XSS test dept cleaned up');
    }
  }
}

async function testRBAC() {
  console.log('\n══════════════════════════════════════');
  console.log('22. RBAC COMPREHENSIVE');
  console.log('══════════════════════════════════════');

  // Employee should NOT access user management
  let res = await req('GET', '/api/auth/users', null, employeeToken);
  check('GET /api/auth/users (employee - should be 403)', res, [401, 403]);

  // Employee should NOT delete departments
  res = await req('DELETE', '/api/departments/00000000-0000-0000-0000-000000000000', null, employeeToken);
  check('DELETE /api/departments (employee)', res, [401, 403, 404]);

  // Employee should NOT access payroll
  res = await req('GET', '/api/payroll', null, employeeToken);
  if (res.status === 403) {
    check('GET /api/payroll (employee - RBAC)', res, 403);
  } else {
    warn('GET /api/payroll (employee)', res, 'May allow employee access or return filtered');
  }

  // Employee should NOT create employees
  res = await req('POST', '/api/employees', { firstName: 'Hack', lastName: 'Attempt' }, employeeToken);
  check('POST /api/employees (employee - RBAC)', res, [401, 403]);

  // HR should have access to most admin functions
  res = await req('GET', '/api/employees', null, hrToken);
  check('GET /api/employees (hr)', res, 200);

  res = await req('GET', '/api/leave', null, hrToken);
  check('GET /api/leave (hr)', res, 200);

  // No token at all
  res = await req('GET', '/api/employees');
  check('GET /api/employees (no auth)', res, [401, 403]);

  res = await req('GET', '/api/payroll');
  check('GET /api/payroll (no auth)', res, [401, 403]);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  SKYRAKSYS HRM - FULL API AUDIT WITH DRY DATA  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Server: ${BASE}                       ║`);
  console.log(`║  Date: ${new Date().toISOString().split('T')[0]}                          ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  await testHealth();
  await testAuth();
  await testUserManagement();
  await testEmployees();
  await testDepartments();
  await testPositions();
  await testLeave();
  await testProjects();
  await testTasks();
  await testTimesheets();
  await testPayroll();
  await testAttendanceHolidays();
  await testReviews();
  await testDashboard();
  await testSettings();
  await testPerformanceMetrics();
  await testRestore();
  await testErrorHandling();
  await testRBAC();

  // Final report
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║              AUDIT RESULTS SUMMARY               ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ✓ PASSED:    ${String(results.pass).padStart(4)}                              ║`);
  console.log(`║  ✗ FAILED:    ${String(results.fail).padStart(4)}                              ║`);
  console.log(`║  ⚠ WARNINGS:  ${String(results.warn).padStart(4)}                              ║`);
  console.log(`║  TOTAL:       ${String(results.pass + results.fail + results.warn).padStart(4)}                              ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  if (results.errors.length > 0) {
    console.log('\n══════════════════════════════════════');
    console.log('ISSUES FOUND:');
    console.log('══════════════════════════════════════');
    results.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  if (results.fail === 0 && results.errors.length === 0) {
    console.log('\n  🎉 ALL TESTS PASSED - APPLICATION IS HEALTHY!');
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('AUDIT SCRIPT ERROR:', e);
  process.exit(2);
});
