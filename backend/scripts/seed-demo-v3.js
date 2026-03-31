/**
 * Rich Demo Seed Script — v3
 * ===========================
 * Creates comprehensive demo records for the demo-v3.spec.js walkthrough.
 * Uses DYNAMIC dates relative to today so screens always look current.
 *
 * Run BEFORE the demo. After the demo, run with --purge to clean up.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed-demo-v3.js          # seed demo data
 *   node scripts/seed-demo-v3.js --purge  # remove demo data
 *
 * What this creates / ensures:
 *   1.  Alice personal details filled (address, bank, statutory)
 *   2.  Attendance records — Alice, Bob, Manager (past 20 working days)
 *   3.  Timesheets — Alice & Bob (past 4 weeks, mix of Approved/Submitted)
 *   4.  Leave requests — Alice & Bob (Approved, Pending, Rejected mix)
 *   5.  Employee reviews — 6 reviews across employees (different statuses)
 *   6.  Payslips — 2 months for Alice & Bob (with full earnings/deductions)
 *   7.  Holidays — 10 Indian holidays for current year
 *   8.  Soft-deleted records — for Restore screen (1 review, 1 balance, 1 user-stub)
 *   9.  Pending leave + submitted timesheet for Manager approval scenes
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const today = new Date();
const currentYear = today.getFullYear();

/** YYYY-MM-DD string for today + offsetDays */
function dateStr(offsetDays = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/** Monday of the current week */
function thisMonday() {
  const d = new Date(today);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

/** Monday of N weeks ago (0 = current week) */
function mondayWeeksAgo(n) {
  const d = new Date(thisMonday());
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().split('T')[0];
}

/** Sunday of a week starting on the given Monday */
function sundayOf(mondayStr) {
  const d = new Date(mondayStr);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

/** ISO week number */
function weekNumber(dateString) {
  const d = new Date(dateString);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
}

/** Generate working days going backwards from yesterday */
function workingDaysBack(count) {
  const days = [];
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  while (days.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() - 1);
  }
  return days;
}

// ──────────────────────────────────────────────────────────────
// Fixed IDs for demo-v3 records (purge-safe)
// ──────────────────────────────────────────────────────────────
const DEMO_PREFIX = 'd3';
const demoId = (n) => `${DEMO_PREFIX}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const IDS = {
  // Leave requests
  aliceLeave1: demoId(1),  aliceLeave2: demoId(2),  aliceLeave3: demoId(3),
  aliceLeave4: demoId(4),  bobLeave1: demoId(5),    bobLeave2: demoId(6),
  bobLeave3: demoId(7),    managerPendingLeave: demoId(8),
  // Timesheets
  aliceTS1: demoId(11), aliceTS2: demoId(12), aliceTS3: demoId(13), aliceTS4: demoId(14),
  bobTS1: demoId(15),   bobTS2: demoId(16),   bobTS3: demoId(17),   bobTS4: demoId(18),
  // Reviews
  rev1: demoId(21), rev2: demoId(22), rev3: demoId(23),
  rev4: demoId(24), rev5: demoId(25), rev6: demoId(26),
  // Soft-deleted records for Restore screen
  softRev: demoId(31), softBalance: demoId(32),
  // Holidays
  hol: (n) => demoId(40 + n),
  // Payroll data + Payslips
  payrollAlice1: demoId(51), payrollAlice2: demoId(52),
  payrollBob1: demoId(53),   payrollBob2: demoId(54),
  payslipAlice1: demoId(61), payslipAlice2: demoId(62),
  payslipBob1: demoId(63),   payslipBob2: demoId(64),
  // Attendance (bulk — use uuid)
};

// All demo IDs for purge
const ALL_DEMO_IDS = Object.values(IDS).filter(v => typeof v === 'string');

// ──────────────────────────────────────────────────────────────
// SEED
// ──────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  SkyrakSys HRM — Demo v3 Seed\n');
  await db.sequelize.authenticate();
  console.log('✓  Connected to database');

  // ── Resolve existing entities ────────────────────────────────
  const alice = await db.Employee.findOne({ where: { email: 'employee1@skyraksys.com' } });
  const bob = await db.Employee.findOne({ where: { email: 'employee2@skyraksys.com' } });
  const manager = await db.Employee.findOne({ where: { email: 'lead@skyraksys.com' } });
  const hr = await db.Employee.findOne({ where: { email: 'hr@skyraksys.com' } });

  if (!alice || !bob || !manager) {
    console.error('✗  Missing employees. Run the comprehensive seed first.');
    process.exit(1);
  }
  console.log(`✓  Found employees: Alice(${alice.id}), Bob(${bob.id}), Manager(${manager.id})`);

  const leaveType = await db.LeaveType.findOne({ order: [['createdAt', 'ASC']] });
  const casualLeave = await db.LeaveType.findOne({ where: { name: 'Casual Leave' } });
  const annualLeave = await db.LeaveType.findOne({ where: { name: 'Annual Leave' } });
  if (!leaveType) { console.error('✗  No leave types found.'); process.exit(1); }

  // Prefer the project with the most tasks
  const projects = await db.Project.findAll({ where: { status: 'Active' } });
  let project, tasks;
  for (const p of projects) {
    const t = await db.Task.findAll({ where: { projectId: p.id } });
    if (!project || t.length > tasks.length) { project = p; tasks = t; }
  }
  if (!project || tasks.length === 0) { console.error('✗  No projects/tasks found.'); process.exit(1); }
  console.log(`✓  Using project "${project.name}" with ${tasks.length} tasks`);

  const aliceUser = await db.User.findOne({ where: { email: 'employee1@skyraksys.com' } });
  const managerUser = await db.User.findOne({ where: { email: 'lead@skyraksys.com' } });
  const hrUser = await db.User.findOne({ where: { email: 'hr@skyraksys.com' } });
  const template = await db.PayslipTemplate.findOne({ where: { isDefault: true } });

  // ══════════════════════════════════════════════════════════════
  // 1. ALICE PERSONAL DETAILS
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 1. Alice personal details ──');
  await db.Employee.update({
    dateOfBirth: '1995-06-15',
    gender: 'Female',
    maritalStatus: 'Single',
    address: '42 MG Road, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560034',
    emergencyContactName: 'Robert Brown',
    emergencyContactPhone: '9876543222',
    emergencyContactRelation: 'Father',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCPD1234E',
    uanNumber: '100234567890',
    pfNumber: 'KA/BLR/0012345/000/0001234',
    bankName: 'HDFC Bank',
    bankAccountNumber: '50100234567890',
    ifscCode: 'HDFC0001234',
    bankBranch: 'Koramangala Branch',
    accountHolderName: 'Alice Brown',
    workLocation: 'Bangalore Office',
    joiningDate: '2024-03-01',
    confirmationDate: '2024-09-01',
    probationPeriod: 6,
    noticePeriod: 30,
  }, { where: { id: alice.id } });
  console.log('  ✓ Alice personal/bank/statutory info updated');

  // ══════════════════════════════════════════════════════════════
  // 2. ATTENDANCE — Alice, Bob, Manager (past 20 working days)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 2. Attendance records ──');
  // Clean old demo attendance
  for (const emp of [alice, bob, manager]) {
    await db.Attendance.destroy({ where: { employeeId: emp.id }, force: true });
  }

  const workDays = workingDaysBack(20);

  for (const emp of [alice, bob, manager]) {
    for (let i = 0; i < workDays.length; i++) {
      const day = workDays[i];
      const checkInH = 8 + Math.floor(Math.random() * 2);
      const checkInM = Math.floor(Math.random() * 30);
      const checkOutH = 17 + Math.floor(Math.random() * 2);
      const checkOutM = Math.floor(Math.random() * 30);
      const isLate = checkInH >= 9 && checkInM > 15;
      const status = i === 5 ? 'half-day' : (isLate ? 'late' : 'present');
      const hours = (checkOutH - checkInH) + (checkOutM - checkInM) / 60;

      await db.Attendance.create({
        id: uuidv4(),
        employeeId: emp.id,
        date: day,
        checkIn: `${day}T${String(checkInH).padStart(2, '0')}:${String(checkInM).padStart(2, '0')}:00.000Z`,
        checkOut: `${day}T${String(checkOutH).padStart(2, '0')}:${String(checkOutM).padStart(2, '0')}:00.000Z`,
        status,
        hoursWorked: parseFloat(hours.toFixed(2)),
        overtimeHours: hours > 9 ? parseFloat((hours - 9).toFixed(2)) : 0,
        lateMinutes: isLate ? checkInM : 0,
        earlyLeaveMinutes: 0,
        breakDuration: 60,
        source: 'web',
        ipAddress: '192.168.1.100',
      });
    }
  }
  console.log(`  ✓ Created ${workDays.length} attendance records × 3 employees`);

  // ══════════════════════════════════════════════════════════════
  // 3. TIMESHEETS — Alice & Bob (past 4 weeks)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 3. Timesheets ──');
  // Clean ALL existing timesheets for demo employees to avoid unique constraint conflicts
  for (const emp of [alice, bob]) {
    await db.Timesheet.destroy({ where: { employeeId: emp.id }, force: true });
  }

  const tsConfigs = [
    // Alice
    { id: IDS.aliceTS1, emp: alice.id, weeksAgo: 3, hours: [8,8,7,8,8,0,0], status: 'Approved', desc: 'HRM API endpoints development' },
    { id: IDS.aliceTS2, emp: alice.id, weeksAgo: 2, hours: [7,8,8,8,7,2,0], status: 'Approved', desc: 'Authentication module refactoring' },
    { id: IDS.aliceTS3, emp: alice.id, weeksAgo: 1, hours: [8,8,8,8,8,0,0], status: 'Approved', desc: 'Employee profile feature implementation' },
    { id: IDS.aliceTS4, emp: alice.id, weeksAgo: 0, hours: [8,8,8,8,6,0,0], status: 'Submitted', desc: 'Payroll integration and testing' },
    // Bob
    { id: IDS.bobTS1, emp: bob.id, weeksAgo: 3, hours: [8,7,8,8,8,0,0], status: 'Approved', desc: 'Frontend component library setup' },
    { id: IDS.bobTS2, emp: bob.id, weeksAgo: 2, hours: [8,8,8,7,8,0,0], status: 'Approved', desc: 'Dashboard widgets implementation' },
    { id: IDS.bobTS3, emp: bob.id, weeksAgo: 1, hours: [8,8,8,8,8,1,0], status: 'Approved', desc: 'Employee management UI' },
    { id: IDS.bobTS4, emp: bob.id, weeksAgo: 0, hours: [8,8,7,8,8,0,0], status: 'Submitted', desc: 'Leave management frontend' },
  ];

  for (let idx = 0; idx < tsConfigs.length; idx++) {
    const ts = tsConfigs[idx];
    const mon = mondayWeeksAgo(ts.weeksAgo);
    const sun = sundayOf(mon);
    const wk = weekNumber(mon);
    const total = ts.hours.reduce((a, b) => a + b, 0);
    const taskId = tasks[idx % tasks.length].id;

    await db.Timesheet.create({
      id: ts.id,
      employeeId: ts.emp,
      projectId: project.id,
      taskId,
      weekStartDate: mon,
      weekEndDate: sun,
      weekNumber: wk,
      year: new Date(mon).getFullYear(),
      totalHoursWorked: total,
      mondayHours: ts.hours[0], tuesdayHours: ts.hours[1], wednesdayHours: ts.hours[2],
      thursdayHours: ts.hours[3], fridayHours: ts.hours[4], saturdayHours: ts.hours[5], sundayHours: ts.hours[6],
      description: ts.desc,
      status: ts.status,
      submittedAt: new Date(),
      approvedAt: ts.status === 'Approved' ? new Date() : null,
      approvedBy: ts.status === 'Approved' ? manager.id : null,
    });
  }
  console.log(`  ✓ Created ${tsConfigs.length} timesheets (Alice: 4, Bob: 4)`);

  // ══════════════════════════════════════════════════════════════
  // 4. LEAVE REQUESTS — mixed statuses
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 4. Leave requests ──');
  const leaveIds = [IDS.aliceLeave1, IDS.aliceLeave2, IDS.aliceLeave3, IDS.aliceLeave4,
                    IDS.bobLeave1, IDS.bobLeave2, IDS.bobLeave3, IDS.managerPendingLeave];
  for (const id of leaveIds) {
    await db.LeaveRequest.destroy({ where: { id }, force: true }).catch(() => {});
  }

  const leaveConfigs = [
    // Alice — Approved past leaves
    { id: IDS.aliceLeave1, emp: alice.id, type: leaveType.id, start: dateStr(-25), end: dateStr(-24), days: 2, reason: 'Dental appointment and follow-up', status: 'Approved' },
    { id: IDS.aliceLeave2, emp: alice.id, type: (casualLeave || leaveType).id, start: dateStr(-14), end: dateStr(-14), days: 1, reason: 'Personal errand', status: 'Approved' },
    // Alice — Pending
    { id: IDS.aliceLeave3, emp: alice.id, type: (annualLeave || leaveType).id, start: dateStr(7), end: dateStr(11), days: 5, reason: 'Annual family vacation — planned well in advance.', status: 'Pending' },
    // Alice — Rejected
    { id: IDS.aliceLeave4, emp: alice.id, type: leaveType.id, start: dateStr(-5), end: dateStr(-3), days: 3, reason: 'Extended weekend trip', status: 'Rejected' },
    // Bob — Approved
    { id: IDS.bobLeave1, emp: bob.id, type: leaveType.id, start: dateStr(-20), end: dateStr(-19), days: 2, reason: 'Doctor visit', status: 'Approved' },
    // Bob — Pending
    { id: IDS.bobLeave2, emp: bob.id, type: (casualLeave || leaveType).id, start: dateStr(3), end: dateStr(4), days: 2, reason: 'Family function', status: 'Pending' },
    // Bob — Approved
    { id: IDS.bobLeave3, emp: bob.id, type: (annualLeave || leaveType).id, start: dateStr(-35), end: dateStr(-33), days: 3, reason: 'Short vacation', status: 'Approved' },
    // Manager — Pending (for admin/HR approval demo)
    { id: IDS.managerPendingLeave, emp: manager.id, type: (casualLeave || leaveType).id, start: dateStr(5), end: dateStr(5), days: 1, reason: 'Personal appointment', status: 'Pending' },
  ];

  for (const lr of leaveConfigs) {
    await db.LeaveRequest.create({
      id: lr.id,
      employeeId: lr.emp,
      leaveTypeId: lr.type,
      startDate: lr.start,
      endDate: lr.end,
      totalDays: lr.days,
      reason: lr.reason,
      status: lr.status,
      approvedBy: lr.status === 'Approved' ? manager.id : null,
      approvedAt: lr.status === 'Approved' ? new Date() : null,
      rejectedBy: lr.status === 'Rejected' ? manager.id : null,
      rejectedAt: lr.status === 'Rejected' ? new Date() : null,
      rejectionReason: lr.status === 'Rejected' ? 'Team capacity constraints during sprint' : null,
    });
  }
  console.log(`  ✓ Created ${leaveConfigs.length} leave requests (3 Approved, 3 Pending, 1 Rejected, 1 Manager)`);

  // ══════════════════════════════════════════════════════════════
  // 5. EMPLOYEE REVIEWS — multiple statuses
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 5. Employee reviews ──');
  // Clean ALL existing reviews for demo employees to avoid unique constraint on [employeeId, reviewPeriod]
  for (const emp of [alice, bob, manager]) {
    await db.EmployeeReview.destroy({ where: { employeeId: emp.id }, force: true }).catch(() => {});
  }

  const reviewConfigs = [
    // Alice reviews
    { id: IDS.rev1, emp: alice.id, reviewer: managerUser.id, period: `Annual ${currentYear - 1}`, type: 'annual', rating: 4.2, tech: 4.5, comm: 4.0, team: 4.3, lead: 3.8, punct: 4.5, status: 'completed', achievements: 'Delivered HRM backend ahead of schedule. Mentored junior developers.', goals: 'Lead a feature team. Obtain AWS certification.', comments: 'Exceptional work ethic. Strong technical skills and great team player.' },
    { id: IDS.rev2, emp: alice.id, reviewer: managerUser.id, period: `Q1 ${currentYear}`, type: 'quarterly', rating: 4.0, tech: 4.2, comm: 3.8, team: 4.0, lead: 3.5, punct: 4.2, status: 'completed', achievements: 'Completed payroll integration module.', goals: 'Improve code review turnaround time.', comments: 'Consistent performer. Good collaboration with cross-functional teams.' },
    { id: IDS.rev3, emp: alice.id, reviewer: managerUser.id, period: `Q2 ${currentYear}`, type: 'quarterly', rating: null, tech: null, comm: null, team: null, lead: null, punct: null, status: 'pending_employee_input', achievements: null, goals: null, comments: null },
    // Bob reviews
    { id: IDS.rev4, emp: bob.id, reviewer: managerUser.id, period: `Annual ${currentYear - 1}`, type: 'annual', rating: 3.8, tech: 4.0, comm: 3.5, team: 4.0, lead: 3.2, punct: 4.0, status: 'completed', achievements: 'Built responsive dashboard components. Improved page load by 40%.', goals: 'Learn backend technologies. Contribute to architecture decisions.', comments: 'Strong frontend skills. Could improve communication in standups.' },
    { id: IDS.rev5, emp: bob.id, reviewer: managerUser.id, period: `Q1 ${currentYear}`, type: 'quarterly', rating: 3.9, tech: 4.1, comm: 3.7, team: 4.0, lead: 3.4, punct: 3.8, status: 'pending_approval', achievements: 'Delivered employee management UI.', goals: 'Take ownership of a full-stack feature.', comments: 'Good improvement in communication. Keep it up.' },
    // Manager self-review (reviewed by HR)
    { id: IDS.rev6, emp: manager.id, reviewer: hrUser.id, period: `Annual ${currentYear - 1}`, type: 'annual', rating: 4.5, tech: 4.3, comm: 4.5, team: 4.8, lead: 4.7, punct: 4.2, status: 'completed', achievements: 'Led engineering team through successful HRM launch. Zero critical incidents in production.', goals: 'Scale team to 10 engineers. Implement CI/CD pipeline.', comments: 'Outstanding leadership and technical guidance.' },
  ];

  for (const rv of reviewConfigs) {
    await db.EmployeeReview.create({
      id: rv.id,
      employeeId: rv.emp,
      reviewerId: rv.reviewer,
      reviewPeriod: rv.period,
      reviewType: rv.type,
      overallRating: rv.rating,
      technicalSkills: rv.tech,
      communication: rv.comm,
      teamwork: rv.team,
      leadership: rv.lead,
      punctuality: rv.punct,
      status: rv.status,
      achievements: rv.achievements,
      goals: rv.goals,
      reviewerComments: rv.comments,
      reviewDate: rv.status === 'completed' ? new Date() : null,
      nextReviewDate: dateStr(90),
      hrApproved: rv.status === 'completed',
      hrApprovedBy: rv.status === 'completed' ? hrUser.id : null,
      hrApprovedAt: rv.status === 'completed' ? new Date() : null,
    });
  }
  console.log(`  ✓ Created ${reviewConfigs.length} employee reviews`);

  // ══════════════════════════════════════════════════════════════
  // 6. PAYSLIPS — 2 months for Alice & Bob
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 6. Payslips ──');

  // Clean demo payslips and payroll data first (FK: payslips reference payroll_data)
  // Delete ALL payslips for demo employees, then ALL payroll data, to avoid unique constraint conflicts
  for (const emp of [alice, bob]) {
    await db.Payslip.destroy({ where: { employeeId: emp.id }, force: true }).catch(() => {});
    await db.PayrollData.destroy({ where: { employeeId: emp.id }, force: true }).catch(() => {});
  }

  const currMonthIdx = today.getMonth(); // 0-indexed: 0=Jan, 2=Mar, etc.
  const prevMonthIdx = currMonthIdx === 0 ? 11 : currMonthIdx - 1;
  const twoMonthsIdx = prevMonthIdx === 0 ? 11 : prevMonthIdx - 1;
  const prevMonthNum = prevMonthIdx + 1; // 1-indexed for DB
  const twoMonthsNum = twoMonthsIdx + 1;
  const prevMonthYear = currMonthIdx === 0 ? currentYear - 1 : currentYear;
  const twoMonthsYear = prevMonthIdx === 0 ? prevMonthYear - 1 : prevMonthYear;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const companyInfo = {
    name: 'SKYRAKSYS TECHNOLOGIES LLP',
    address: 'Plot-No: 27E, G.S.T. Road, Guduvanchery, Chennai',
    email: 'info@skyraksys.com',
    phone: '+91 89398 88577',
  };

  const payslipConfigs = [
    { payrollId: IDS.payrollAlice1, payslipId: IDS.payslipAlice1, emp: alice, month: twoMonthsNum, year: twoMonthsYear, basic: 60000, hra: 24000, allowances: 12000, pf: 7200, tds: 8000, pt: 2400 },
    { payrollId: IDS.payrollAlice2, payslipId: IDS.payslipAlice2, emp: alice, month: prevMonthNum, year: prevMonthYear, basic: 60000, hra: 24000, allowances: 12000, pf: 7200, tds: 8000, pt: 2400 },
    { payrollId: IDS.payrollBob1,   payslipId: IDS.payslipBob1,   emp: bob,   month: twoMonthsNum, year: twoMonthsYear, basic: 55000, hra: 22000, allowances: 11000, pf: 6600, tds: 7500, pt: 2400 },
    { payrollId: IDS.payrollBob2,   payslipId: IDS.payslipBob2,   emp: bob,   month: prevMonthNum, year: prevMonthYear, basic: 55000, hra: 22000, allowances: 11000, pf: 6600, tds: 7500, pt: 2400 },
  ];

  for (const ps of payslipConfigs) {
    const gross = ps.basic + ps.hra + ps.allowances;
    const totalDed = ps.pf + ps.tds + ps.pt;
    const net = gross - totalDed;
    const mIdx = ps.month - 1; // 0-indexed for monthNames
    const periodStart = `${ps.year}-${String(ps.month).padStart(2, '0')}-01`;
    const periodEnd = new Date(ps.year, ps.month, 0).toISOString().split('T')[0]; // last day of month
    const payPeriodStr = `${monthNames[mIdx]} ${ps.year}`;

    try {
      // Create PayrollData first
      await db.PayrollData.create({
        id: ps.payrollId,
        employeeId: ps.emp.id,
        payPeriod: payPeriodStr,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        totalWorkingDays: 22,
        presentDays: 21,
        absentDays: 1,
        lopDays: 0,
        paidDays: 22,
        overtimeHours: 0,
        grossSalary: gross,
        totalDeductions: totalDed,
        netSalary: net,
        paymentMode: 'bank_transfer',
        status: 'paid',
        createdBy: hrUser.id,
      });

    // Create Payslip
    await db.Payslip.create({
      id: ps.payslipId,
      employeeId: ps.emp.id,
      payrollDataId: ps.payrollId,
      payPeriod: payPeriodStr,
      month: ps.month,
      year: ps.year,
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      templateId: template ? template.id : null,
      employeeInfo: {
        employeeId: ps.emp.employeeId,
        name: `${ps.emp.firstName} ${ps.emp.lastName}`,
        department: 'Engineering',
        designation: 'Software Engineer',
        dateOfJoining: ps.emp.hireDate || '2024-03-01',
        panNumber: ps.emp.id === alice.id ? 'ABCPD1234E' : 'XYZPW5678F',
        bankAccount: ps.emp.id === alice.id ? '50100234567890' : '40200123456789',
        bankName: 'HDFC Bank',
      },
      companyInfo,
      earnings: { basicSalary: ps.basic, hra: ps.hra, specialAllowance: ps.allowances },
      deductions: { pf: ps.pf, incomeTax: ps.tds, professionalTax: ps.pt },
      attendance: { totalDays: 22, presentDays: 21, leaves: 1, holidays: 1, lop: 0 },
      grossEarnings: gross,
      totalDeductions: totalDed,
      netPay: net,
      netPayInWords: `Rupees ${Math.floor(net / 1000)} Thousand ${net % 1000 > 0 ? 'and ' + (net % 1000) : ''} Only`,
      payslipNumber: `SKY/${ps.year}/${String(ps.month).padStart(2, '0')}/${ps.emp.employeeId}`,
      payDate: periodEnd,
      generatedDate: periodEnd,
      generatedBy: hrUser ? hrUser.id : null,
      status: 'finalized',
      version: 1,
      isLocked: true,
    });
    console.log(`    ✓ Payslip: ${payPeriodStr} for ${ps.emp.firstName}`);
    } catch (e) {
      console.log(`    ⚠ Payslip ${payPeriodStr} for ${ps.emp.firstName} skipped: ${e.message}`);
      // If payroll data was created but payslip failed, rollback payroll data
      await db.PayrollData.destroy({ where: { id: ps.payrollId }, force: true }).catch(() => {});
    }
  }
  console.log(`  ✓ Created ${payslipConfigs.length} payroll records + payslips`);

  // ══════════════════════════════════════════════════════════════
  // 7. HOLIDAYS — Indian public holidays for current year
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 7. Holidays ──');
  // Clean demo holidays
  for (let i = 0; i < 12; i++) {
    await db.Holiday.destroy({ where: { id: IDS.hol(i) } }).catch(() => {});
  }

  const holidays = [
    { name: 'Republic Day',        date: `${currentYear}-01-26`, type: 'public' },
    { name: 'Holi',                date: `${currentYear}-03-14`, type: 'public' },
    { name: 'Good Friday',         date: `${currentYear}-04-18`, type: 'restricted' },
    { name: 'Eid ul-Fitr',         date: `${currentYear}-03-31`, type: 'public' },
    { name: 'May Day',             date: `${currentYear}-05-01`, type: 'public' },
    { name: 'Independence Day',    date: `${currentYear}-08-15`, type: 'public' },
    { name: 'Gandhi Jayanti',      date: `${currentYear}-10-02`, type: 'public' },
    { name: 'Diwali',              date: `${currentYear}-10-20`, type: 'public' },
    { name: 'Christmas',           date: `${currentYear}-12-25`, type: 'public' },
    { name: 'Company Foundation',  date: `${currentYear}-06-15`, type: 'company' },
  ];

  for (let i = 0; i < holidays.length; i++) {
    await db.Holiday.create({
      id: IDS.hol(i),
      name: holidays[i].name,
      date: holidays[i].date,
      type: holidays[i].type,
      year: currentYear,
      isRecurring: holidays[i].type === 'public',
      description: `${holidays[i].name} — ${holidays[i].type} holiday`,
      isActive: true,
    });
  }
  console.log(`  ✓ Created ${holidays.length} holidays for ${currentYear}`);

  // ══════════════════════════════════════════════════════════════
  // 8. SOFT-DELETED RECORDS — for Restore screen
  // ══════════════════════════════════════════════════════════════
  console.log('\n── 8. Soft-deleted records (for Restore) ──');

  // 8a. Soft-deleted review
  await db.EmployeeReview.destroy({ where: { id: IDS.softRev }, force: true }).catch(() => {});
  await db.EmployeeReview.create({
    id: IDS.softRev,
    employeeId: bob.id,
    reviewerId: managerUser.id,
    reviewPeriod: `Probation ${currentYear - 1}`,
    reviewType: 'probationary',
    overallRating: 3.5,
    technicalSkills: 3.5,
    communication: 3.2,
    teamwork: 3.8,
    status: 'completed',
    reviewerComments: 'Good progress during probation period.',
    reviewDate: new Date(),
    hrApproved: true,
    hrApprovedBy: hrUser ? hrUser.id : null,
    hrApprovedAt: new Date(),
  });
  // Now soft-delete it
  await db.EmployeeReview.destroy({ where: { id: IDS.softRev } });
  console.log('  ✓ Created soft-deleted review (for restore-tab-reviews)');

  // 8b. Soft-deleted leave balance
  await db.LeaveBalance.destroy({ where: { id: IDS.softBalance }, force: true }).catch(() => {});
  await db.LeaveBalance.create({
    id: IDS.softBalance,
    employeeId: bob.id,
    leaveTypeId: leaveType.id,
    year: currentYear - 1,
    totalAccrued: 12,
    totalTaken: 5,
    totalPending: 0,
    balance: 7,
    carryForward: 0,
  });
  // Soft-delete it
  await db.LeaveBalance.destroy({ where: { id: IDS.softBalance } });
  console.log('  ✓ Created soft-deleted leave balance (for restore-tab-balances)');

  // Note: We don't create a soft-deleted user because that would create login issues.
  // The restore-tab-users tab will simply show "no records" or any pre-existing soft-deleted users.

  // ══════════════════════════════════════════════════════════════
  // 9. SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Demo v3 data ready!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Attendance:       ${workDays.length} days × 3 employees`);
  console.log(`  Timesheets:       8 (Alice: 4, Bob: 4)`);
  console.log(`  Leave requests:   8 (3 Approved, 3 Pending, 1 Rejected, 1 Manager)`);
  console.log(`  Reviews:          6 active + 1 soft-deleted`);
  console.log(`  Payslips:         4 (Alice: 2, Bob: 2)`);
  console.log(`  Holidays:         ${holidays.length}`);
  console.log(`  Soft-deleted:     1 review + 1 leave balance`);
  console.log('');
  console.log('  Ready to record! Run:');
  console.log('  cd frontend && npx playwright test -c playwright-demo-v3.config.js demo-v3 --headed');
  console.log('');
  console.log('  After recording, purge:');
  console.log('  cd backend && node scripts/seed-demo-v3.js --purge');
  console.log('');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────────
// PURGE
// ──────────────────────────────────────────────────────────────
async function purge() {
  console.log('\n🧹  SkyrakSys HRM — Demo v3 Purge\n');
  await db.sequelize.authenticate();
  console.log('✓  Connected to database');

  // Resolve employees
  const alice = await db.Employee.findOne({ where: { email: 'employee1@skyraksys.com' } });
  const bob = await db.Employee.findOne({ where: { email: 'employee2@skyraksys.com' } });
  const manager = await db.Employee.findOne({ where: { email: 'lead@skyraksys.com' } });

  // Delete payslips first (FK dependency)
  for (const id of [IDS.payslipAlice1, IDS.payslipAlice2, IDS.payslipBob1, IDS.payslipBob2]) {
    const r = await db.Payslip.findByPk(id, { paranoid: false });
    if (r) { await r.destroy({ force: true }); console.log(`  ✓ Deleted payslip ${id}`); }
  }
  // Delete payroll data
  for (const id of [IDS.payrollAlice1, IDS.payrollAlice2, IDS.payrollBob1, IDS.payrollBob2]) {
    const r = await db.PayrollData.findByPk(id, { paranoid: false });
    if (r) { await r.destroy({ force: true }); console.log(`  ✓ Deleted payroll ${id}`); }
  }

  // Delete demo leave requests
  const leaveIds = [IDS.aliceLeave1, IDS.aliceLeave2, IDS.aliceLeave3, IDS.aliceLeave4,
                    IDS.bobLeave1, IDS.bobLeave2, IDS.bobLeave3, IDS.managerPendingLeave];
  for (const id of leaveIds) {
    const r = await db.LeaveRequest.findByPk(id, { paranoid: false });
    if (r) { await r.destroy({ force: true }); console.log(`  ✓ Deleted leave ${id}`); }
  }

  // Delete demo timesheets
  for (const id of [IDS.aliceTS1, IDS.aliceTS2, IDS.aliceTS3, IDS.aliceTS4,
                     IDS.bobTS1, IDS.bobTS2, IDS.bobTS3, IDS.bobTS4]) {
    const r = await db.Timesheet.findByPk(id, { paranoid: false });
    if (r) { await r.destroy({ force: true }); console.log(`  ✓ Deleted timesheet ${id}`); }
  }

  // Delete demo reviews (including soft-deleted)
  for (const id of [IDS.rev1, IDS.rev2, IDS.rev3, IDS.rev4, IDS.rev5, IDS.rev6, IDS.softRev]) {
    const r = await db.EmployeeReview.findByPk(id, { paranoid: false });
    if (r) { await r.destroy({ force: true }); console.log(`  ✓ Deleted review ${id}`); }
  }

  // Delete soft-deleted leave balance
  const bal = await db.LeaveBalance.findByPk(IDS.softBalance, { paranoid: false });
  if (bal) { await bal.destroy({ force: true }); console.log(`  ✓ Deleted leave balance ${IDS.softBalance}`); }

  // Delete demo holidays
  for (let i = 0; i < 12; i++) {
    const h = await db.Holiday.findByPk(IDS.hol(i));
    if (h) { await h.destroy({ force: true }); console.log(`  ✓ Deleted holiday ${h.name}`); }
  }

  // Delete demo attendance
  if (alice) { const c = await db.Attendance.destroy({ where: { employeeId: alice.id }, force: true }); console.log(`  ✓ Deleted ${c} Alice attendance`); }
  if (bob) { const c = await db.Attendance.destroy({ where: { employeeId: bob.id }, force: true }); console.log(`  ✓ Deleted ${c} Bob attendance`); }
  if (manager) { const c = await db.Attendance.destroy({ where: { employeeId: manager.id }, force: true }); console.log(`  ✓ Deleted ${c} Manager attendance`); }

  console.log('\n✅  Demo v3 records purged.\n');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────────
// ENTRY
// ──────────────────────────────────────────────────────────────
(async () => {
  try {
    if (process.argv.includes('--purge')) await purge();
    else await seed();
  } catch (err) {
    console.error('\n❌  Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
