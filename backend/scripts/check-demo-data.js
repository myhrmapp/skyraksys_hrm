/**
 * Quick sanity-check for mobile demo data.
 * cd backend && node scripts/check-demo-data.js
 */
const db = require('../models');

const ALICE = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466';

(async () => {
  await db.sequelize.authenticate();
  console.log('\n=== Demo Data Check ===\n');

  const [lb] = await db.sequelize.query(
    `SELECT lt.name, lb."totalTaken" AS used, lb."balance"
     FROM leave_balances lb
     JOIN leave_types lt ON lt.id = lb."leaveTypeId"
     WHERE lb."employeeId" = '${ALICE}'
     ORDER BY lt.name`
  );
  console.log(`Leave balances (${lb.length} types):`);
  lb.forEach(r => console.log(`  ${r.name}: ${r.used} taken, ${r.balance} remaining`));

  const [pending] = await db.sequelize.query(
    `SELECT status, COUNT(*) AS cnt FROM leave_requests GROUP BY status ORDER BY status`
  );
  console.log('\nLeave requests by status:');
  pending.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));

  const [ps] = await db.sequelize.query(
    `SELECT month, year, "netPay" FROM payslips WHERE "employeeId" = '${ALICE}' ORDER BY year, month`
  );
  console.log(`\nAlice payslips (${ps.length}):`);
  ps.forEach(r => console.log(`  ${r.month}/${r.year}: ₹${r.netPay}`));

  const [att] = await db.sequelize.query(
    `SELECT date, "checkIn", "checkOut", status
     FROM attendances WHERE "employeeId" = '${ALICE}'
     ORDER BY date DESC LIMIT 5`
  );
  console.log(`\nAlice recent attendance (${att.length} shown):`);
  att.forEach(r => { const ci = r.checkIn ? (r.checkIn+'').slice(11,16) : '-'; const co = r.checkOut ? (r.checkOut+'').slice(11,16) : '-'; console.log(`  ${r.date}: ${r.status} | in=${ci} out=${co}`); });

  const [ts] = await db.sequelize.query(
    `SELECT "weekStartDate", status, "totalHoursWorked" FROM timesheets WHERE "employeeId" = '${ALICE}' ORDER BY "weekStartDate" DESC LIMIT 4`
  );
  console.log(`\nAlice timesheets (${ts.length}):`);
  ts.forEach(r => console.log(`  ${r.weekStartDate}: ${r.status} | ${r.totalHoursWorked}h`));

  console.log('\n✅ Data check complete.\n');
  process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
