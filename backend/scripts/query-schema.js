const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();

    const [tc] = await db.sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='tasks' ORDER BY ordinal_position`
    );
    console.log('Task columns:', tc.map(c => c.column_name).join(', '));

    const [t] = await db.sequelize.query(
      `SELECT id, name FROM tasks WHERE "assignedTo" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466'`
    );
    console.log('\nTasks for Alice:', t.length);
    t.forEach(r => console.log(JSON.stringify(r)));

    const [lb] = await db.sequelize.query(
      `SELECT * FROM leave_balances WHERE "employeeId" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466'`
    );
    console.log('\nLeave balances:', lb.length);
    lb.forEach(r => console.log(JSON.stringify(r)));

    const [att] = await db.sequelize.query(
      `SELECT * FROM attendances WHERE "employeeId" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466' ORDER BY date DESC LIMIT 5`
    );
    console.log('\nAttendance records:', att.length);
    att.forEach(r => console.log(JSON.stringify(r)));

    const [ts] = await db.sequelize.query(
      `SELECT * FROM timesheets WHERE "employeeId" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466' ORDER BY "weekStartDate" DESC LIMIT 5`
    );
    console.log('\nTimesheet records:', ts.length);
    ts.forEach(r => console.log(JSON.stringify(r)));

    const [lr] = await db.sequelize.query(
      `SELECT id, "leaveTypeId", "startDate", "endDate", status, reason FROM leave_requests WHERE "employeeId" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466' ORDER BY "startDate" DESC LIMIT 5`
    );
    console.log('\nLeave requests (recent 5):', lr.length);
    lr.forEach(r => console.log(JSON.stringify(r)));

    const [ps] = await db.sequelize.query(
      `SELECT id, month, year, "basicSalary", "netSalary", status FROM payslips WHERE "employeeId" = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466'`
    );
    console.log('\nPayslips:', ps.length);
    ps.forEach(r => console.log(JSON.stringify(r)));

    const [pj] = await db.sequelize.query(`SELECT id, name FROM projects LIMIT 5`);
    console.log('\nProjects:');
    pj.forEach(r => console.log(r.id, r.name));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
