/**
 * Route File Existence Verification
 * Checks that all route imports in config/routes.js point to existing files
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying all route files exist...\n');

// List of route files imported in config/routes.js
const routeFiles = [
  'auth.routes.js',
  'user.routes.js',
  'employee.routes.js',
  'department.routes.js',
  'position.routes.js',
  'project.routes.js',
  'task.routes.js',
  'timesheet.routes.js',
  'leave.routes.js',
  'leave-balance-admin.routes.js',
  'leave-type-admin.routes.js',
  'leave-accrual.routes.js',
  'attendance.routes.js',
  'holiday.routes.js',
  'payrollDataRoutes.js',
  'payslipRoutes.js',
  'payslipTemplateRoutes.js',
  'salaryStructureRoutes.js',
  'performance.routes.js',
  'employee-review.routes.js',
  'goal.routes.js',
  'client.routes.js',
  'invoice.routes.js',
  'invoice-template.routes.js',
  'dashboard.routes.js',
  'settings.routes.js',
  'email.routes.js',
  'notification.routes.js',
  'admin.routes.js',
  'admin-config.routes.js',
  'system-config.routes.js',
  'restore.routes.js',
  'vault.routes.js',
  'debug.routes.js'
];

const routesDir = path.join(__dirname, 'backend', 'routes');
let allExist = true;
let missingFiles = [];
let foundFiles = [];

routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (fs.existsSync(filePath)) {
    foundFiles.push(file);
    console.log(`✅ ${file}`);
  } else {
    missingFiles.push(file);
    allExist = false;
    console.log(`❌ ${file} - NOT FOUND`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Total routes: ${routeFiles.length}`);
console.log(`   Found: ${foundFiles.length}`);
console.log(`   Missing: ${missingFiles.length}`);

if (allExist) {
  console.log('\n✅ SUCCESS: All route files exist!\n');
  process.exit(0);
} else {
  console.log('\n❌ ERROR: Some route files are missing:\n');
  missingFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');
  process.exit(1);
}
