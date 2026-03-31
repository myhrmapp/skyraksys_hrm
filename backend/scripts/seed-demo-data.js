/**
 * Seed rich demo data for Alice Brown (employee1@skyraksys.com)
 * Run: cd backend && node scripts/seed-demo-data.js
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../models');

const ALICE_EMP_ID = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466';
const ALICE_USER_ID = '687a44cf-a895-4c2b-ab44-bb48c502944f';
const MANAGER_EMP_ID = '99611b65-7a22-4b67-9749-ee6586db49f8';

// Reference IDs (from existing data)
const PROJECT_HRM = '1e2e6c22-d954-4298-8d37-b6c1c49549c0';
const TASK_BACKEND = 'd02a0b7e-65bb-4ce8-a2ae-5a10e4e87741';
const TASK_API = 'f10db9e4-5be5-4fc3-a354-287873a3d0ce';

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connected to database.\n');

    // ── 1. Update Alice's personal details (fill in NULLs) ──
    console.log('Updating Alice personal details...');
    await db.sequelize.query(`
      UPDATE employees SET
        "dateOfBirth" = '1995-06-15',
        "gender" = 'Female',
        "maritalStatus" = 'Single',
        "address" = '42 MG Road, Koramangala',
        "city" = 'Bangalore',
        "state" = 'Karnataka',
        "pinCode" = '560034',
        "emergencyContactName" = 'Robert Brown',
        "emergencyContactPhone" = '9876543222',
        "emergencyContactRelation" = 'Father',
        "aadhaarNumber" = '1234-5678-9012',
        "panNumber" = 'ABCPD1234E',
        "uanNumber" = '100234567890',
        "pfNumber" = 'KA/BLR/0012345/000/0001234',
        "bankName" = 'HDFC Bank',
        "bankAccountNumber" = '50100234567890',
        "ifscCode" = 'HDFC0001234',
        "bankBranch" = 'Koramangala Branch',
        "accountHolderName" = 'Alice Brown',
        "workLocation" = 'Bangalore Office',
        "joiningDate" = '2024-03-01',
        "confirmationDate" = '2024-09-01',
        "probationPeriod" = 6,
        "noticePeriod" = 30
      WHERE id = '${ALICE_EMP_ID}'
    `);
    console.log('  ✓ Personal, bank, statutory info updated\n');

    // ── 2. Attendance — past 20 working days ──
    console.log('Creating attendance records...');
    // First delete existing attendance except E2E test data
    await db.sequelize.query(`
      DELETE FROM attendances WHERE "employeeId" = '${ALICE_EMP_ID}'
    `);

    const attendanceRecords = [];
    const today = new Date('2026-03-28');
    let dayCount = 0;
    const d = new Date(today);
    d.setDate(d.getDate() - 1); // start from yesterday

    while (dayCount < 20) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) { // skip weekends
        const dateStr = d.toISOString().split('T')[0];
        const checkInHour = 8 + Math.floor(Math.random() * 2); // 8 or 9
        const checkInMin = Math.floor(Math.random() * 30);
        const checkOutHour = 17 + Math.floor(Math.random() * 2); // 17 or 18
        const checkOutMin = Math.floor(Math.random() * 30);

        const isLate = checkInHour >= 9 && checkInMin > 15;
        const status = dayCount === 5 ? 'half-day' : (isLate ? 'late' : 'present');
        const hoursWorked = (checkOutHour - checkInHour) + ((checkOutMin - checkInMin) / 60);

        const checkIn = `${dateStr}T${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00.000Z`;
        const checkOut = `${dateStr}T${String(checkOutHour).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00.000Z`;

        attendanceRecords.push({
          id: uuidv4(),
          employeeId: ALICE_EMP_ID,
          date: dateStr,
          checkIn,
          checkOut,
          status,
          hoursWorked: hoursWorked.toFixed(2),
          overtimeHours: hoursWorked > 9 ? (hoursWorked - 9).toFixed(2) : '0.00',
          lateMinutes: isLate ? checkInMin : 0,
          earlyLeaveMinutes: 0,
          breakDuration: 60,
          source: 'web',
          notes: null,
          ipAddress: '192.168.1.100'
        });
        dayCount++;
      }
      d.setDate(d.getDate() - 1);
    }

    for (const rec of attendanceRecords) {
      await db.sequelize.query(`
        INSERT INTO attendances (id, "employeeId", date, "checkIn", "checkOut", status, "hoursWorked", "overtimeHours", "lateMinutes", "earlyLeaveMinutes", "breakDuration", source, notes, "ipAddress", "createdAt", "updatedAt")
        VALUES ('${rec.id}', '${rec.employeeId}', '${rec.date}', '${rec.checkIn}', '${rec.checkOut}', '${rec.status}', ${rec.hoursWorked}, ${rec.overtimeHours}, ${rec.lateMinutes}, ${rec.earlyLeaveMinutes}, ${rec.breakDuration}, '${rec.source}', ${rec.notes ? `'${rec.notes}'` : 'NULL'}, '${rec.ipAddress}', NOW(), NOW())
      `);
    }
    console.log(`  ✓ Created ${attendanceRecords.length} attendance records\n`);

    // ── 3. Timesheets — past 4 weeks ──
    console.log('Creating timesheet records...');
    await db.sequelize.query(`
      DELETE FROM timesheets WHERE "employeeId" = '${ALICE_EMP_ID}'
    `);

    const timesheetWeeks = [
      { start: '2026-03-02', end: '2026-03-08', weekNum: 10, hours: [8, 8, 7, 8, 8, 0, 0], status: 'Approved', desc: 'HRM API endpoints development' },
      { start: '2026-03-09', end: '2026-03-15', weekNum: 11, hours: [7, 8, 8, 8, 7, 2, 0], status: 'Approved', desc: 'Authentication module refactoring' },
      { start: '2026-03-16', end: '2026-03-22', weekNum: 12, hours: [8, 8, 8, 8, 8, 0, 0], status: 'Approved', desc: 'Employee profile feature implementation' },
      { start: '2026-03-23', end: '2026-03-29', weekNum: 13, hours: [8, 8, 8, 8, 6, 0, 0], status: 'Submitted', desc: 'Payroll integration and testing' },
    ];

    for (let i = 0; i < timesheetWeeks.length; i++) {
      const w = timesheetWeeks[i];
      const total = w.hours.reduce((a, b) => a + b, 0);
      const taskId = i % 2 === 0 ? TASK_BACKEND : TASK_API;
      await db.sequelize.query(`
        INSERT INTO timesheets (id, "employeeId", "projectId", "taskId", "weekStartDate", "weekEndDate", "weekNumber", year, "totalHoursWorked", "mondayHours", "tuesdayHours", "wednesdayHours", "thursdayHours", "fridayHours", "saturdayHours", "sundayHours", description, status, "submittedAt", "approvedAt", "approvedBy", "createdAt", "updatedAt")
        VALUES ('${uuidv4()}', '${ALICE_EMP_ID}', '${PROJECT_HRM}', '${taskId}', '${w.start}', '${w.end}', ${w.weekNum}, 2026, ${total}, ${w.hours[0]}, ${w.hours[1]}, ${w.hours[2]}, ${w.hours[3]}, ${w.hours[4]}, ${w.hours[5]}, ${w.hours[6]}, '${w.desc}', '${w.status}', NOW(), ${w.status === 'Approved' ? 'NOW()' : 'NULL'}, ${w.status === 'Approved' ? `'${MANAGER_EMP_ID}'` : 'NULL'}, NOW(), NOW())
      `);
    }
    console.log(`  ✓ Created ${timesheetWeeks.length} timesheet records\n`);

    // ── 4. Enrich payslip data (fill in earnings, deductions, employee info) ──
    console.log('Enriching payslip data...');
    const payslipEnrichment = {
      employeeInfo: JSON.stringify({
        employeeId: 'EMP0004',
        name: 'Alice Brown',
        department: 'Engineering',
        designation: 'Software Engineer',
        dateOfJoining: '2024-03-01',
        panNumber: 'ABCPD1234E',
        uanNumber: '100234567890',
        bankAccount: '50100234567890',
        bankName: 'HDFC Bank'
      }),
      companyInfo: JSON.stringify({
        name: 'SkyrakSys Technologies',
        address: '123 Tech Park, Bangalore, Karnataka 560001',
        logo: null
      }),
      earnings: JSON.stringify({
        basicSalary: 60000,
        hra: 24000,
        specialAllowance: 12000,
        transportAllowance: 0,
        medicalAllowance: 0

      }),
      deductions: JSON.stringify({
        pf: 7200,
        incomeTax: 8000,
        professionalTax: 2400,
        esi: 0
      }),
      attendance: JSON.stringify({
        totalDays: 22,
        presentDays: 20,
        leaves: 2,
        holidays: 1,
        lop: 0
      })
    };

    await db.sequelize.query(`
      UPDATE payslips SET
        "employeeInfo" = '${payslipEnrichment.employeeInfo}'::jsonb,
        "companyInfo" = '${payslipEnrichment.companyInfo}'::jsonb,
        earnings = '${payslipEnrichment.earnings}'::jsonb,
        deductions = '${payslipEnrichment.deductions}'::jsonb,
        attendance = '${payslipEnrichment.attendance}'::jsonb,
        "grossEarnings" = 96000,
        "totalDeductions" = 17600,
        "netPay" = 78400,
        "netPayInWords" = 'Seventy-Eight Thousand Four Hundred Rupees Only',
        "payDate" = CASE WHEN month = 2 THEN '2026-02-28'::timestamp ELSE '2026-03-28'::timestamp END,
        "generatedDate" = CASE WHEN month = 2 THEN '2026-02-28'::timestamp ELSE '2026-03-28'::timestamp END,
        "paymentMethod" = 'bank_transfer',
        "paymentReference" = 'NEFT/' || to_char(NOW(), 'YYYYMMDD') || '/SKY' || LPAD(CAST(FLOOR(RANDOM()*99999) AS TEXT), 5, '0')
      WHERE "employeeId" = '${ALICE_EMP_ID}'
    `);
    console.log('  ✓ Payslips enriched with full earnings/deductions\n');

    // ── 5. Update leave requests to have a good mix ──
    console.log('Updating leave request statuses...');
    // Get all leave requests for Alice
    const [leaves] = await db.sequelize.query(`
      SELECT id, status, "startDate" FROM leave_requests
      WHERE "employeeId" = '${ALICE_EMP_ID}'
      ORDER BY "startDate" ASC
    `);
    console.log(`  Found ${leaves.length} leave requests`);

    // Make first few Approved, some Pending, 1-2 Rejected
    for (let i = 0; i < leaves.length; i++) {
      let newStatus;
      if (i < 5) newStatus = 'Approved';
      else if (i < 8) newStatus = 'Pending';
      else if (i < 10) newStatus = 'Rejected';
      else newStatus = 'Approved';

      if (leaves[i].status !== newStatus) {
        await db.sequelize.query(`
          UPDATE leave_requests SET status = '${newStatus}', "updatedAt" = NOW()
          WHERE id = '${leaves[i].id}'
        `);
      }
    }
    console.log('  ✓ Leave statuses: 5 Approved → 3 Pending → 2 Rejected → rest Approved\n');

    // ── 6. Verify final state ──
    console.log('=== Final Data Summary for Alice Brown ===');
    const [attCount] = await db.sequelize.query(`SELECT COUNT(*) as c FROM attendances WHERE "employeeId" = '${ALICE_EMP_ID}'`);
    const [tsCount] = await db.sequelize.query(`SELECT COUNT(*) as c FROM timesheets WHERE "employeeId" = '${ALICE_EMP_ID}'`);
    const [lrCount] = await db.sequelize.query(`SELECT COUNT(*) as c, string_agg(status::text, ', ') as statuses FROM leave_requests WHERE "employeeId" = '${ALICE_EMP_ID}'`);
    const [psCount] = await db.sequelize.query(`SELECT COUNT(*) as c FROM payslips WHERE "employeeId" = '${ALICE_EMP_ID}'`);
    const [rvCount] = await db.sequelize.query(`SELECT COUNT(*) as c FROM employee_reviews WHERE "employeeId" = '${ALICE_EMP_ID}'`);
    const [tkCount] = await db.sequelize.query(`SELECT COUNT(*) as c FROM tasks WHERE "assignedTo" = '${ALICE_EMP_ID}'`);

    console.log(`  Attendance:     ${attCount[0].c} records`);
    console.log(`  Timesheets:     ${tsCount[0].c} records`);
    console.log(`  Leave requests: ${lrCount[0].c} (${lrCount[0].statuses})`);
    console.log(`  Payslips:       ${psCount[0].c} records`);
    console.log(`  Reviews:        ${rvCount[0].c} records`);
    console.log(`  Tasks:          ${tkCount[0].c} records`);

    console.log('\n✅ Demo data seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
