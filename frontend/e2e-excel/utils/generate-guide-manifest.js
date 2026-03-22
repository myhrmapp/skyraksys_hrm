/**
 * Generate User Guide Content from Excel Workflow Definitions
 *
 * Reads the WorkflowsReady Excel sheet and generates:
 *   1. public/guides/guide-manifest.json  — manifest for the in-app help system
 *   2. Placeholder entries for each workflow (video URLs filled after recording)
 *
 * Run BEFORE recording videos to create the initial manifest:
 *   node e2e-excel/utils/generate-guide-manifest.js
 *
 * Run AFTER recording videos (the guide-reporter.js merges video paths in):
 *   npx playwright test -c playwright-guide.config.js business-workflows
 */
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const GUIDE_DIR = path.join(__dirname, '..', '..', 'public', 'guides');
const MANIFEST_PATH = path.join(GUIDE_DIR, 'guide-manifest.json');

fs.mkdirSync(path.join(GUIDE_DIR, 'videos'), { recursive: true });
fs.mkdirSync(path.join(GUIDE_DIR, 'screenshots'), { recursive: true });

const wb = xlsx.readFile(EXCEL_PATH);

let rows;
if (wb.SheetNames.includes('WorkflowsReady')) {
  rows = xlsx.utils.sheet_to_json(wb.Sheets['WorkflowsReady']);
} else if (wb.SheetNames.includes('BusinessWorkflows')) {
  rows = xlsx.utils.sheet_to_json(wb.Sheets['BusinessWorkflows'])
    .filter(r => (r.implementationStatus || 'ready') === 'ready');
} else {
  console.error('No WorkflowsReady or BusinessWorkflows sheet found');
  process.exit(1);
}

// Module categorization based on action field
const MODULE_MAP = {
  Employee_Onboarding: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2', order: 1 },
  Leave_Management: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02', order: 2 },
  Attendance: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32', order: 3 },
  Timesheet: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0', order: 4 },
  Payroll: { module: 'Payroll', icon: 'Payment', color: '#d32f2f', order: 5 },
  Tasks_and_Projects: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1', order: 6 },
  Reviews: { module: 'Reviews', icon: 'RateReview', color: '#f57c00', order: 7 },
  Organization_Mgmt: { module: 'Organization', icon: 'Business', color: '#00838f', order: 8 },
  User_Management: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1', order: 9 },
  RBAC: { module: 'Access Control', icon: 'Security', color: '#455a64', order: 10 },
  Navigation: { module: 'Navigation & UI', icon: 'Explore', color: '#795548', order: 11 },
  Reports_Settings: { module: 'Reports & Settings', icon: 'Assessment', color: '#607d8b', order: 12 },
  Employee_CRUD: { module: 'Employee Management', icon: 'People', color: '#1976d2', order: 1 },
  Cross_Module: { module: 'Cross-Module Workflows', icon: 'Hub', color: '#e91e63', order: 13 },
};

// Guess section from testId range
function guessSection(testId) {
  const num = parseInt(testId.replace('BW-', ''), 10);
  if (num < 20) return 'Employee_Onboarding';
  if (num < 40) return 'Leave_Management';
  if (num < 50) return 'Attendance';
  if (num < 70) return 'Timesheet';
  if (num < 90) return 'Payroll';
  if (num < 100) return 'Tasks_and_Projects';
  if (num < 110) return 'Reviews';
  if (num < 120) return 'Organization_Mgmt';
  if (num < 130) return 'User_Management';
  if (num < 150) return 'Cross_Module';
  if (num < 170) return 'RBAC';
  if (num < 180) return 'Navigation';
  if (num < 190) return 'Reports_Settings';
  return 'Employee_CRUD';
}

// Role display names
const ROLE_NAMES = {
  admin: 'Administrator',
  hr: 'HR Manager',
  manager: 'Team Lead / Manager',
  employee: 'Employee',
};

// Build guide entries
const guides = rows.map(row => {
  const section = guessSection(row.testId);
  const meta = MODULE_MAP[section] || { module: 'General', icon: 'Help', color: '#757575', order: 99 };
  const videoFile = `${row.testId}.webm`;
  const videoExists = fs.existsSync(path.join(GUIDE_DIR, 'videos', videoFile));

  return {
    testId: row.testId,
    title: row.description,
    module: meta.module,
    icon: meta.icon,
    color: meta.color,
    order: meta.order,
    action: row.action,
    role: row.role || 'admin',
    roleDisplay: ROLE_NAMES[row.role] || row.role || 'Administrator',
    tags: (row.tags || '').split(/[,\s]+/).map(t => t.trim().replace(/^@/, '')).filter(Boolean),
    videoUrl: videoExists ? `guides/videos/${videoFile}` : null,
    screenshotUrl: fs.existsSync(path.join(GUIDE_DIR, 'screenshots', `${row.testId}.png`))
      ? `guides/screenshots/${row.testId}.png` : null,
    steps: generateSteps(row),
    duration: null,
    status: videoExists ? 'recorded' : 'pending',
    recordedAt: videoExists ? fs.statSync(path.join(GUIDE_DIR, 'videos', videoFile)).mtime.toISOString() : null,
  };
});

// Auto-generate step descriptions from action
function generateSteps(row) {
  const steps = [];
  const role = ROLE_NAMES[row.role] || row.role || 'Administrator';

  steps.push(`Log in as **${role}**`);

  const action = row.action || '';
  if (action.startsWith('onboarding')) {
    steps.push('Navigate to **Employees** → Click **Add Employee**');
    steps.push('Fill in personal details (name, email, phone)');
    if (action === 'onboardingFull') steps.push('Click **Next** → Fill employment info (department, position)');
    if (action === 'onboardingCreateLogin') steps.push('Search employee → Click **Create Login**');
  } else if (action.startsWith('leave')) {
    if (action.includes('Request')) steps.push('Navigate to **Leave Request** → Select leave type');
    if (action.includes('Submit')) steps.push('Fill start/end dates and reason → Click **Submit**');
    if (action.includes('Approve')) steps.push('Navigate to **Leave Management** → Click **Approve**');
    if (action.includes('Reject')) steps.push('Navigate to **Leave Management** → Click **Reject**');
    if (action.includes('Cancel')) steps.push('Navigate to **My Leaves** → Click **Cancel** on pending request');
    if (action.includes('Balance')) steps.push('Navigate to **Leave Requests** → View balance cards');
    if (action.includes('Admin')) steps.push('Open **Leave Management** → Search and filter requests');
    if (action.includes('Types')) steps.push('Open **Leave Types** → Add / Edit / Delete leave types');
  } else if (action.startsWith('attendance')) {
    if (action.includes('CheckIn')) steps.push('Navigate to **My Attendance** → Click **Check In** then **Check Out**');
    if (action.includes('Admin')) steps.push('Navigate to **Attendance Management** → Use filters/mark attendance');
    if (action.includes('Month')) steps.push('Navigate to **My Attendance** → Change month/year dropdowns');
  } else if (action.startsWith('timesheet')) {
    if (action.includes('Weekly')) steps.push('Navigate to **Timesheets** → Add task → Fill weekly hours');
    if (action.includes('Submit')) steps.push('Click **Submit** to send timesheet for approval');
    if (action.includes('Approve')) steps.push('Navigate to **Timesheet Approvals** → Click **Approve**');
    if (action.includes('Reject')) steps.push('Navigate to **Timesheet Approvals** → Click **Reject** with comments');
    if (action.includes('History')) steps.push('Navigate to **Timesheet History** → View/export past timesheets');
    if (action.includes('Bulk')) steps.push('Select multiple timesheets → Use **Bulk Approve**');
  } else if (action.startsWith('payroll')) {
    if (action.includes('Page')) steps.push('Navigate to **Payroll Management** → Review tabs');
    if (action.includes('Generate')) steps.push('Go to **Generate** tab → Click **Validate & Generate**');
    if (action.includes('Finalize')) steps.push('Select payroll records → Click **Finalize**');
    if (action.includes('Paid')) steps.push('Select finalized records → Click **Mark as Paid**');
    if (action.includes('Employee')) steps.push('Navigate to **My Payslips** → View summary and history');
    if (action.includes('Download')) steps.push('Click **Download** on a payslip row');
    if (action.includes('Search')) steps.push('Use search bar → Click **Export**');
    if (action.includes('Template')) steps.push('Navigate to **Payroll Template Config**');
  } else if (action.startsWith('task') || action.startsWith('project')) {
    if (action.includes('View')) steps.push('Navigate to **My Tasks** → Use priority filter');
    if (action.includes('Status')) steps.push('Click status dropdown on a task → Select new status');
    if (action.includes('Create') && action.includes('project')) steps.push('Navigate to **Project Config** → Click **Add Project** → Fill form');
    if (action.includes('Create') && action.includes('task')) steps.push('Navigate to **Task Config** → Click **Add Task** → Fill form');
  } else if (action.startsWith('review')) {
    if (action.includes('Create')) steps.push('Navigate to **Reviews** → Click **New Review** → Fill form');
    if (action.includes('Self')) steps.push('Navigate to **Reviews** → Click **Self-Assess** on your review');
    if (action.includes('Approve')) steps.push('Navigate to **Reviews** → Click **Approve** → Confirm');
    if (action.includes('Search')) steps.push('Use search bar and status filter on **Reviews** page');
    if (action.includes('Edit')) steps.push('Click **Edit** on a review → Make changes or **Cancel**');
  } else if (action.startsWith('org')) {
    if (action.includes('Dept')) steps.push('Navigate to **Organization** → **Departments** tab');
    if (action.includes('Position')) steps.push('Navigate to **Organization** → **Positions** tab');
    if (action.includes('Holiday')) steps.push('Navigate to **Organization** → **Holidays** tab');
    steps.push('Use **Add**, **Edit**, or **Delete** buttons');
  } else if (action.startsWith('user')) {
    steps.push('Navigate to **User Management**');
    if (action.includes('Create')) steps.push('Go to **Create** tab → Fill email, name, password, role');
    if (action.includes('Search')) steps.push('Go to **Manage** tab → Search and filter users');
    if (action.includes('Validation')) steps.push('Test form validation by submitting empty/mismatched data');
  } else if (action.startsWith('rbac') || action === 'accessControl') {
    steps.push(`Attempt to access a restricted page as **${role}**`);
    steps.push('Verify access is granted or denied based on role');
  } else if (action.startsWith('nav')) {
    steps.push('Verify sidebar navigation items are visible');
    if (action.includes('Profile')) steps.push('Click profile avatar → Verify dropdown menu');
    if (action.includes('404')) steps.push('Navigate to a non-existent URL → Verify 404 page');
  } else if (action.startsWith('employee')) {
    if (action.includes('Create')) steps.push('Add → Edit → Delete an employee end-to-end');
    if (action.includes('Search')) steps.push('Use search bar and status/department filters');
    if (action.includes('Export')) steps.push('Click **Export** button → Verify download');
    if (action.includes('Tab')) steps.push('Click through Personal, Employment, Emergency, Statutory tabs');
  } else {
    steps.push(`Execute the **${row.description}** workflow`);
  }

  steps.push('Verify the expected outcome');
  return steps;
}

// Group by module
const byModule = {};
for (const g of guides) {
  if (!byModule[g.module]) {
    byModule[g.module] = { module: g.module, icon: g.icon, color: g.color, order: g.order, guides: [] };
  }
  byModule[g.module].guides.push(g);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  appName: 'SkyrakSys HRM',
  version: '1.0.0',
  totalGuides: guides.length,
  totalWithVideo: guides.filter(g => g.videoUrl).length,
  modules: Object.values(byModule).sort((a, b) => a.order - b.order),
  guides,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log('\n📖 User Guide Manifest Generated');
console.log(`   ${guides.length} guide entries`);
console.log(`   ${guides.filter(g => g.videoUrl).length} with recorded videos`);
console.log(`   ${Object.keys(byModule).length} modules`);
console.log(`   → ${MANIFEST_PATH}\n`);
console.log('Modules:');
for (const [name, m] of Object.entries(byModule)) {
  console.log(`   ${name}: ${m.guides.length} guides`);
}
console.log('\nNext steps:');
console.log('  1. Record videos: npx playwright test -c playwright-guide.config.js business-workflows');
console.log('  2. Rebuild frontend: npm run build (or dev server picks up public/ changes)');
console.log('  3. Access in-app: Click "Help & Support" → User Guides\n');
