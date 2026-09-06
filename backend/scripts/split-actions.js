const fs = require('fs');
const path = require('path');

const specPath = 'd:\\skyraksys_hrm1\\skyraksys_hrm_app\\frontend\\e2e\\specs\\business-workflows.spec.js';
const actionsDir = 'd:\\skyraksys_hrm1\\skyraksys_hrm_app\\frontend\\e2e\\actions';

if (!fs.existsSync(actionsDir)) {
  fs.mkdirSync(actionsDir, { recursive: true });
}

let code = fs.readFileSync(specPath, 'utf8');

const blockStartStr = `if (action === 'onboarding' || action === 'onboardingFull') {`;
const blockStartIndex = code.indexOf(blockStartStr);

const blockEndStr = `else {
        console.warn(\`[BW] Unknown action "\${action}" for test \${row.testId} \u2014 skipping\`);
        test.skip();
      }`;
const fallbackEndStr = blockEndStr.replace(/\r\n/g, '\n');
const fallbackEndStr2 = blockEndStr.replace(/\n/g, '\r\n');
const fallbackEndStr3 = blockEndStr.replace('\u2014', '—'); // em dash
const fallbackEndStr4 = blockEndStr.replace('\u2014', '?'); 

// Let's just find "else {" and "test.skip()" and "}"
const testSkipIdx = code.lastIndexOf('test.skip();');
if (testSkipIdx === -1) {
  console.log('Cannot find test.skip();');
  process.exit(1);
}
// Find the closing brace after test.skip()
const endOfIfIndex = code.indexOf('}', testSkipIdx) + 1;

const theIfElseBlock = code.substring(blockStartIndex, endOfIfIndex);
const beforeIf = code.substring(0, blockStartIndex);
const afterIf = code.substring(endOfIfIndex);

const actionRegistryCode = `// @ts-check
const EmployeePage = require('../pages/EmployeePage');
const LeavePage = require('../pages/LeavePage');
const AttendancePage = require('../pages/AttendancePage');
const PayrollPage = require('../pages/PayrollPage');
const TimesheetPage = require('../pages/TimesheetPage');
const TasksPage = require('../pages/TasksPage');
const ReviewsPage = require('../pages/ReviewsPage');
const OrganizationPage = require('../pages/OrganizationPage');
const UserManagementPage = require('../pages/UserManagementPage');
const { verifyEmployeeInDB, verifyLeaveInDB, verifyDepartmentInDB, verifyProjectInDB, verifyReviewInDB, verifyUserInDB, deleteRecordViaAPI } = require('../utils/api-verify');

class ActionRegistry {
  static async execute(action, context) {
    const { test, page, row, expect, loginAs, waitForPageReady, navigateTo, ROUTE_MAP } = context;

    ${theIfElseBlock.split('\\n').join('\\n    ')}
  }
}

module.exports = { ActionRegistry };
`;

fs.writeFileSync(path.join(actionsDir, 'action-registry.js'), actionRegistryCode);

const newSpecCode = beforeIf + `const { ActionRegistry } = require('../actions/action-registry');
      
      const context = {
        test, page, row, expect, loginAs, waitForPageReady, navigateTo, ROUTE_MAP,
        EmployeePage, LeavePage, AttendancePage, PayrollPage, TimesheetPage, TasksPage, ReviewsPage, OrganizationPage, UserManagementPage,
        verifyEmployeeInDB, verifyLeaveInDB, verifyDepartmentInDB, verifyProjectInDB, verifyReviewInDB, verifyUserInDB, deleteRecordViaAPI
      };

      await ActionRegistry.execute(action, context);
` + afterIf;

fs.writeFileSync(specPath, newSpecCode);

console.log('Successfully extracted ActionRegistry!');
