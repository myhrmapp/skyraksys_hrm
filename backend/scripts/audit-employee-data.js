const db = require('../models');

(async () => {
  await db.sequelize.authenticate();
  const empId = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466';
  const userId = '687a44cf-a895-4c2b-ab44-bb48c502944f';

  // Employee record
  const [emp] = await db.sequelize.query(`SELECT id, "firstName", "lastName", email, "userId", "departmentId", "positionId" FROM employees WHERE id='${empId}'`);
  console.log('Employee:', JSON.stringify(emp[0]));

  // User record
  const [usr] = await db.sequelize.query(`SELECT id, email, role, "isActive" FROM users WHERE id='${userId}'`);
  console.log('User:', JSON.stringify(usr[0]));

  // Leave requests
  const [leaves] = await db.sequelize.query(`SELECT COUNT(*) as cnt FROM leave_requests WHERE "employeeId"='${empId}'`);
  console.log('Leave requests:', leaves[0].cnt);

  // Attendance
  const [att] = await db.sequelize.query(`SELECT COUNT(*) as cnt FROM attendances WHERE "employeeId"='${empId}'`);
  console.log('Attendance:', att[0].cnt);

  // Timesheets
  const [ts] = await db.sequelize.query(`SELECT COUNT(*) as cnt FROM timesheets WHERE "employeeId"='${empId}'`);
  console.log('Timesheets:', ts[0].cnt);

  // Tasks
  const [tasks] = await db.sequelize.query(`SELECT COUNT(*) as cnt FROM tasks WHERE "assignedTo"='${empId}'`);
  console.log('Tasks:', tasks[0].cnt);

  // Payslips
  const [ps] = await db.sequelize.query(`SELECT COUNT(*) as cnt, string_agg(status::text, ',') as statuses FROM payslips WHERE "employeeId"='${empId}'`);
  console.log('Payslips:', ps[0].cnt, 'statuses:', ps[0].statuses);

  // Payroll data
  const [pd] = await db.sequelize.query(`SELECT COUNT(*) as cnt, string_agg(status::text, ',') as statuses FROM payroll_data WHERE "employeeId"='${empId}'`);
  console.log('Payroll data:', pd[0].cnt, 'statuses:', pd[0].statuses);

  // Reviews
  const [rev] = await db.sequelize.query(`SELECT COUNT(*) as cnt FROM employee_reviews WHERE "employeeId"='${empId}'`);
  console.log('Reviews:', rev[0].cnt);

  // Salary structure
  const [sal] = await db.sequelize.query(`SELECT id, "basicSalary", hra, "isActive" FROM salary_structures WHERE "employeeId"='${empId}'`);
  console.log('Salary:', JSON.stringify(sal));

  // Check /employees/me route - what does it need?
  const [empFull] = await db.sequelize.query(`SELECT e.id, e."firstName", e."lastName", e.email, e."userId", u.email as "userEmail", u.role FROM employees e JOIN users u ON e."userId" = u.id WHERE e.id='${empId}'`);
  console.log('Employee+User join:', JSON.stringify(empFull[0]));

  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
