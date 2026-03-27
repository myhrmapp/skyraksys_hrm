/**
 * Timesheet Seed Script
 * Creates realistic timesheet records for active employees across last 12 weeks.
 * Run: node scripts/seed-timesheets.js
 */
'use strict';

const db = require('../models');
const { v4: uuidv4 } = require('uuid');

// Returns the Monday of the week containing `date`
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns ISO week number
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Random hours between min and max rounded to 0.5
function randHours(min, max) {
  return Math.round((Math.min(min, max) + Math.random() * Math.abs(max - min)) * 2) / 2;
}

const STATUSES = ['Approved', 'Approved', 'Approved', 'Submitted', 'Submitted', 'Rejected'];
const DESCRIPTIONS = [
  'Feature development and code review',
  'Bug fixing and testing',
  'Sprint planning and estimation',
  'Documentation and deployment',
  'Client meetings and coordination',
  'Infrastructure setup and maintenance',
  'Performance optimization work',
  'Unit testing and QA',
];

async function seed() {
  try {
    // Fetch needed FKs from DB
    const [employees, tasks] = await Promise.all([
      db.Employee.findAll({ where: { status: 'Active' }, attributes: ['id', 'employeeId', 'firstName'], limit: 10 }),
      db.Task.findAll({ attributes: ['id', 'name', 'projectId'], limit: 50 }),
    ]);

    if (employees.length === 0) { console.error('No active employees found. Run the main seeder first.'); process.exit(1); }
    if (tasks.length === 0) { console.error('No tasks found. Run the main seeder first.'); process.exit(1); }

    // Derive project→task mapping from tasks (avoids fetching WF-Test projects with no tasks)
    const tasksByProject = {};
    for (const t of tasks) {
      if (!t.projectId) continue;
      if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = [];
      tasksByProject[t.projectId].push(t);
    }
    const projectIds = Object.keys(tasksByProject);
    if (projectIds.length === 0) { console.error('No tasks with valid projectId found.'); process.exit(1); }

    console.log(`Found ${employees.length} employees, ${projectIds.length} projects (with tasks), ${tasks.length} tasks`);

    // Check existing timesheet count
    const existingCount = await db.Timesheet.count();
    if (existingCount > 0) {
      console.log(`⚠️  ${existingCount} timesheets already exist. Appending new data...`);
    }

    const records = [];
    const now = new Date();
    const seenKeys = new Set();

    // For each employee, create timesheets for last 12 weeks
    for (const emp of employees) {
      for (let weeksAgo = 12; weeksAgo >= 1; weeksAgo--) {
        const weekDate = new Date(now);
        weekDate.setDate(weekDate.getDate() - weeksAgo * 7);
        const monday = getMondayOf(weekDate);

        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const weekNumber = getISOWeek(monday);
        const year = monday.getFullYear();

        // Pick a project that actually has tasks
        const projId = projectIds[Math.floor(Math.random() * projectIds.length)];
        const projectTasks = tasksByProject[projId];
        const task = projectTasks[Math.floor(Math.random() * projectTasks.length)];
        const proj = { id: projId };

        // Deduplicate by unique constraint: employeeId + weekStartDate + projectId + taskId
        const key = `${emp.id}_${monday.toISOString().slice(0,10)}_${proj.id}_${task.id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const monH = randHours(7, 9);
        const tueH = randHours(7, 9);
        const wedH = randHours(7, 9);
        const thuH = randHours(7, 9);
        const friH = randHours(6, 8);
        const satH = Math.random() > 0.85 ? randHours(2, 4) : 0; // occasional Saturday
        const sunH = 0;
        const total = monH + tueH + wedH + thuH + friH + satH + sunH;

        const rawStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        // Current / last week → Submitted or Draft; older → Approved/Rejected
        const status = weeksAgo <= 1 ? 'Submitted' : rawStatus;

        const submittedAt = status !== 'Draft'
          ? new Date(friday(monday).getTime() + 18 * 3600000) // Friday 6pm
          : null;
        const approvedAt = status === 'Approved'
          ? new Date(submittedAt.getTime() + randHours(1, 48) * 3600000)
          : null;
        const rejectedAt = status === 'Rejected'
          ? new Date(submittedAt.getTime() + randHours(1, 48) * 3600000)
          : null;

        records.push({
          id: uuidv4(),
          employeeId: emp.id,
          projectId: proj.id,
          taskId: task.id,
          weekStartDate: monday.toISOString().slice(0, 10),
          weekEndDate: sunday.toISOString().slice(0, 10),
          weekNumber,
          year,
          mondayHours: monH,
          tuesdayHours: tueH,
          wednesdayHours: wedH,
          thursdayHours: thuH,
          fridayHours: friH,
          saturdayHours: satH,
          sundayHours: sunH,
          totalHoursWorked: total,
          description: DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)],
          status,
          submittedAt,
          approvedAt,
          rejectedAt,
          approverComments: status === 'Approved' ? 'Good work this week.' : (status === 'Rejected' ? 'Please correct the hours logged.' : null),
          approvedBy: null,
          createdAt: submittedAt || monday,
          updatedAt: approvedAt || rejectedAt || submittedAt || monday,
          deletedAt: null,
        });
      }
    }

    function friday(monday) {
      const d = new Date(monday);
      d.setDate(d.getDate() + 4);
      return d;
    }

    console.log(`Inserting ${records.length} timesheet records...`);
    await db.Timesheet.bulkCreate(records, { ignoreDuplicates: true });
    console.log(`✅  Done! ${records.length} timesheets seeded.`);

    // Summary per employee
    for (const emp of employees) {
      const count = records.filter(r => r.employeeId === emp.id).length;
      console.log(`   ${emp.firstName} (${emp.employeeId}): ${count} timesheets`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
