/**
 * Rich Demo Seed Script — v2
 * ===========================
 * Creates targeted demo records to support the demo-v2.spec.js walkthrough.
 * Run BEFORE the demo. After the demo, run with --purge to clean up.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed-demo-rich.js          # seed demo data
 *   node scripts/seed-demo-rich.js --purge  # remove demo data
 *
 * What this creates:
 *   1. One PENDING leave request from Alice Brown  → for Manager approval scene
 *   2. One SUBMITTED timesheet from Alice Brown    → for Manager approval scene
 *   3. Ensures Alice has rich attendance data for My Attendance scene
 *   4. Ensures performance review data exists       → for Reviews scene
 */

const db = require('../models');

// ──────────────────────────────────────────────────────────────
// Known entity IDs from comprehensive-seed.js + seed-demo-data.js
// ──────────────────────────────────────────────────────────────
const ALICE_EMP_ID   = 'bcfc9f4d-2e9f-412d-80c7-5b2f5fde4466';
const MANAGER_EMP_ID = '99611b65-7a22-4b67-9749-ee6586db49f8';
// PROJECT_HRM and TASK_BACKEND are resolved dynamically at runtime

// Fixed IDs for demo-v2 records so purge is deterministic
const DEMO_LEAVE_ID      = 'd2000001-d200-4200-8200-d20000000001';
const DEMO_TIMESHEET_ID  = 'd2000001-d200-4200-8200-d20000000002';
const DEMO_REVIEW_ID     = 'd2000001-d200-4200-8200-d20000000003';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Returns ISO date string for today + offsetDays */
function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/** Returns the Monday of the next week from today */
function nextWeekMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return d.toISOString().split('T')[0];
}

/** Returns the Sunday of the next week from today */
function nextWeekSunday() {
  const d = new Date(nextWeekMonday());
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

/** Returns ISO week number for a date string */
function getWeekNumber(dateString) {
  const d = new Date(dateString);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  return weekNo;
}

// ──────────────────────────────────────────────────────────────
// SEED
// ──────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  SkyrakSys HRM — Demo v2 Seed\n');

  await db.sequelize.authenticate();
  console.log('✓  Connected to database');

  // ── 1. Resolve first leave type ──────────────────────────────
  const leaveType = await db.LeaveType.findOne({ order: [['createdAt', 'ASC']] });
  if (!leaveType) {
    console.error('✗  No leave types found. Run the comprehensive seed first.');
    process.exit(1);
  }
  console.log(`✓  Using leave type: "${leaveType.name}" (${leaveType.id})`);

  // ── 1b. Resolve a real project + task ────────────────────────
  const project = await db.Project.findOne({ order: [['createdAt', 'ASC']] });
  const task    = await db.Task.findOne({ order: [['createdAt', 'ASC']] });
  if (!project || !task) {
    console.error('✗  No projects or tasks found. Run the comprehensive seed first.');
    process.exit(1);
  }
  console.log(`✓  Using project: "${project.name}" (${project.id})`);
  console.log(`✓  Using task:    "${task.name}" (${task.id})`);

  // ── 2. Pending leave request → Manager approval scene ────────
  const existingLeave = await db.LeaveRequest.findByPk(DEMO_LEAVE_ID, { paranoid: false });
  if (existingLeave) {
    // Reset to Pending in case it was approved/soft-deleted during a previous demo run
    await existingLeave.update(
      { status: 'Pending', approvedAt: null, approvedBy: null, rejectedAt: null, rejectedBy: null, rejectionReason: null, deletedAt: null },
      { paranoid: false }
    );
    console.log('✓  Leave request reset to Pending');
  } else {
    const monday = nextWeekMonday();
    const friday = (() => { const d = new Date(monday); d.setDate(d.getDate() + 4); return d.toISOString().split('T')[0]; })();
    await db.LeaveRequest.create({
      id: DEMO_LEAVE_ID,
      employeeId: ALICE_EMP_ID,
      leaveTypeId: leaveType.id,
      startDate: monday,
      endDate: friday,
      totalDays: 5,
      reason: 'Annual family vacation — planned well in advance.',
      status: 'Pending',
    });
    console.log(`✓  Created pending leave request: ${monday} → ${friday}`);
  }

  // ── 3. Submitted timesheet → Manager approval scene ──────────
  const existingTS = await db.Timesheet.findByPk(DEMO_TIMESHEET_ID, { paranoid: false });
  if (existingTS) {
    await existingTS.update({ status: 'Submitted', approvedAt: null, approvedBy: null, deletedAt: null }, { paranoid: false });
    console.log('✓  Timesheet reset to Submitted');
  } else {
    // Use current week
    const monday = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    })();
    const sunday = (() => { const d = new Date(monday); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; })();
    const weekNo = getWeekNumber(monday);
    const year = new Date(monday).getFullYear();

    await db.Timesheet.create({
      id: DEMO_TIMESHEET_ID,
      employeeId: ALICE_EMP_ID,
      projectId: project.id,
      taskId: task.id,
      weekStartDate: monday,
      weekEndDate: sunday,
      weekNumber: weekNo,
      year,
      totalHoursWorked: 40,
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
      description: 'Full feature implementation and code review.',
      status: 'Submitted',
      submittedAt: new Date(),
    });
    console.log(`✓  Created submitted timesheet: week ${weekNo} (${monday} → ${sunday})`);
  }

  // ── 4. Performance review ────────────────────────────────────
  const reviewCount = await db.EmployeeReview.count({ where: { employeeId: ALICE_EMP_ID } });
  if (reviewCount === 0) {
    // Check for EmployeeReview model existence
    if (db.EmployeeReview) {
      try {
        await db.EmployeeReview.create({
          id: DEMO_REVIEW_ID,
          employeeId: ALICE_EMP_ID,
          reviewerId: MANAGER_EMP_ID,
          reviewType: 'Annual',
          reviewPeriodStart: `${new Date().getFullYear() - 1}-01-01`,
          reviewPeriodEnd: `${new Date().getFullYear() - 1}-12-31`,
          status: 'Completed',
          overallRating: 4,
          comments: 'Exceptional work ethic and strong technical skills. Delivered all projects on time.',
        });
        console.log('✓  Created performance review record');
      } catch (e) {
        console.log(`  (skipped review: ${e.message})`);
      }
    }
  } else {
    console.log(`✓  Performance reviews already exist (${reviewCount})`);
  }

  // ── 5. Summary ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log(' Demo v2 data ready!');
  console.log('═══════════════════════════════════════════════');
  console.log('  Pending leave:       DEMO_LEAVE_ID');
  console.log('  Submitted timesheet: DEMO_TIMESHEET_ID');
  console.log('\n  Ready to record. Run the demo:');
  console.log('  cd frontend && npx playwright test -c playwright-demo-hd.config.js demo-v2');
  console.log('\n  After recording, purge:');
  console.log('  cd backend && node scripts/seed-demo-rich.js --purge\n');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────────
// PURGE
// ──────────────────────────────────────────────────────────────

async function purge() {
  console.log('\n🧹  SkyrakSys HRM — Demo v2 Purge\n');

  await db.sequelize.authenticate();
  console.log('✓  Connected to database');

  const destroyById = async (Model, id, label) => {
    const row = await Model.findByPk(id, { paranoid: false });
    if (row) {
      await row.destroy({ force: true });
      console.log(`✓  Deleted ${label} (${id})`);
    } else {
      console.log(`  (${label} not found — skipping)`);
    }
  };

  await destroyById(db.LeaveRequest, DEMO_LEAVE_ID, 'demo leave request');
  await destroyById(db.Timesheet,    DEMO_TIMESHEET_ID, 'demo timesheet');

  if (db.EmployeeReview) {
    await destroyById(db.EmployeeReview, DEMO_REVIEW_ID, 'demo performance review');
  }

  console.log('\n✅  Demo v2 records purged successfully.\n');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────────────────────

const isPurge = process.argv.includes('--purge');

(async () => {
  try {
    if (isPurge) {
      await purge();
    } else {
      await seed();
    }
  } catch (err) {
    console.error('\n❌  Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
