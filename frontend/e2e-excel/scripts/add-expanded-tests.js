/**
 * Add expanded E2E test data rows for Leave, Tasks, and Organization sheets.
 * Run: node e2e-excel/scripts/add-expanded-tests.js
 */
const XLSX = require('xlsx');
const path = require('path');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = XLSX.readFile(WORKBOOK_PATH);

// ─── New Leave test rows (LV-012 to LV-035) ───
const newLeaveRows = [
  // Employee Leave Requests page
  { testId: 'LV-012', description: 'Employee leave requests page loads', action: 'leaveRequestsPageLoad', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-013', description: 'View leave history', action: 'viewLeaveHistory', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-014', description: 'Click new request button', action: 'clickNewRequest', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-015', description: 'Submit request missing required fields', action: 'submitRequestMissingFields', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: 'FALSE', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-016', description: 'View leave balance summary cards', action: 'viewLeaveBalanceCards', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-017', description: 'Cancel pending leave request', action: 'cancelPendingRequest', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },

  // Leave Management (Admin/HR/Manager)
  { testId: 'LV-018', description: 'Leave management page loads (Admin)', action: 'leaveManagementPageLoad', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-019', description: 'Leave management page loads (HR)', action: 'leaveManagementPageLoad', enabled: 'TRUE', role: 'hr', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-020', description: 'Leave management page loads (Manager)', action: 'leaveManagementPageLoad', enabled: 'TRUE', role: 'manager', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-021', description: 'Search leave management requests', action: 'searchManagement', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '', searchTerm: 'admin' },
  { testId: 'LV-022', description: 'Filter management by status Pending', action: 'filterByStatus', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '', filterValue: 'Pending' },
  { testId: 'LV-023', description: 'Filter management by status Approved', action: 'filterByStatus', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '', filterValue: 'Approved' },
  { testId: 'LV-024', description: 'Verify approve/reject buttons visible', action: 'verifyApproveRejectButtons', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-025', description: 'Manager approves leave', action: 'approve', enabled: 'TRUE', role: 'manager', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-026', description: 'HR rejects leave', action: 'reject', enabled: 'TRUE', role: 'hr', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-027', description: 'Employee cannot access leave management', action: 'managementRBAC', enabled: 'TRUE', role: 'employee', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },

  // Leave Balance Admin
  { testId: 'LV-028', description: 'View leave balances page', action: 'viewBalances', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-029', description: 'Search leave balances', action: 'searchBalance', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '', searchTerm: 'admin' },

  // Leave Types Admin
  { testId: 'LV-030', description: 'View leave types page', action: 'viewLeaveTypes', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-031', description: 'Leave type count', action: 'leaveTypeCount', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-032', description: 'Edit leave type opens dialog', action: 'editType', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },

  // Leave Accrual Admin
  { testId: 'LV-033', description: 'Leave accrual page loads', action: 'accrualPageLoad', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-034', description: 'Run monthly accrual', action: 'runAccrual', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
  { testId: 'LV-035', description: 'Year-end carry forward', action: 'carryForward', enabled: 'TRUE', role: 'admin', leaveType: '', startDate: '', endDate: '', reason: '', expectSuccess: '', expectedElement: '', typeName: '', typeAllowance: '' },
];

// ─── New Tasks test rows (TSK-008 to TSK-022) ───
const newTaskRows = [
  // Project Task Configuration
  { testId: 'TSK-008', description: 'Project config page loads (Admin)', action: 'projectConfigPageLoad', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-009', description: 'Project config page loads (Manager)', action: 'projectConfigPageLoad', enabled: 'TRUE', role: 'manager', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-010', description: 'Projects tab shows projects', action: 'projectsTabLoad', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-011', description: 'Tasks tab loads', action: 'tasksTabLoad', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-012', description: 'Search projects', action: 'searchProjects', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: 'test', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-013', description: 'Add new project', action: 'addProject', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: 'TRUE', projectName: 'E2E Test Project', projectDesc: 'Automated test project', startDate: '2026-01-01', endDate: '2026-12-31', projectStatus: 'Planning', clientName: 'Automation Client' },
  { testId: 'TSK-014', description: 'Edit project opens dialog', action: 'editProject', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-015', description: 'Project count', action: 'projectCount', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-016', description: 'Add new task (Admin)', action: 'addTask', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: 'TRUE', taskName: 'E2E Test Task', taskDesc: 'Automated test task', taskStatus: 'Not Started', taskPriority: 'Medium' },
  { testId: 'TSK-017', description: 'Manager adds project', action: 'addProject', enabled: 'TRUE', role: 'manager', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: 'TRUE', projectName: 'Manager E2E Project', projectDesc: 'Manager test project', startDate: '2026-02-01', endDate: '2026-11-30', projectStatus: 'Active', clientName: '' },
  { testId: 'TSK-018', description: 'Employee accesses my tasks', action: 'pageLoad', enabled: 'TRUE', role: 'employee', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-019', description: 'Manager accesses my tasks', action: 'pageLoad', enabled: 'TRUE', role: 'manager', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-020', description: 'Employee cannot access project config', action: 'projectConfigRBAC', enabled: 'TRUE', role: 'employee', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-021', description: 'Delete last project', action: 'deleteProject', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
  { testId: 'TSK-022', description: 'Delete task (Admin)', action: 'deleteTask', enabled: 'TRUE', role: 'admin', expectedElement: '', searchTerm: '', filterValue: '', taskIndex: '', newStatus: '', expectSuccess: '' },
];

// ─── New Organization test rows (ORG-011 to ORG-025) ───
const newOrgRows = [
  // Organization Hub
  { testId: 'ORG-011', description: 'Organization page loads with tabs', action: 'orgPageLoad', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-012', description: 'Departments tab accessible', action: 'orgTabDepartments', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-013', description: 'Positions tab accessible', action: 'orgTabPositions', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-014', description: 'Holidays tab accessible', action: 'orgTabHolidays', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },

  // Extended Department tests
  { testId: 'ORG-015', description: 'Add department with form data', action: 'addDept', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: 'E2E Test Department', deptCode: 'E2E-DEPT', expectSuccess: 'TRUE', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '', deptDesc: 'Automation testing department', deptStatus: '' },
  { testId: 'ORG-016', description: 'HR adds department', action: 'addDept', enabled: 'TRUE', role: 'hr', expectedElement: '', deptName: 'HR E2E Dept', deptCode: 'HR-E2E', expectSuccess: 'TRUE', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-017', description: 'Department count', action: 'deptCount', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-018', description: 'Add department missing name validation', action: 'addDeptMissingName', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: 'FALSE', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-019', description: 'Cancel department dialog', action: 'cancelDeptDialog', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-020', description: 'Search department results', action: 'searchDept', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: 'E2E', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },

  // Extended Position tests 
  { testId: 'ORG-021', description: 'Add position with title', action: 'addPosition', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: 'TRUE', searchTerm: '', deptIndex: '', posTitle: 'E2E Test Position', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-022', description: 'Edit position opens dialog', action: 'editPosition', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
  { testId: 'ORG-023', description: 'Position count', action: 'positionCount', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },

  // Extended Holiday tests
  { testId: 'ORG-024', description: 'Add holiday with date', action: 'addHoliday', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: 'TRUE', searchTerm: '', deptIndex: '', posTitle: '', holidayName: 'E2E Test Holiday', holidayDate: '2026-07-04', posIndex: '' },
  { testId: 'ORG-025', description: 'Delete holiday', action: 'deleteHoliday', enabled: 'TRUE', role: 'admin', expectedElement: '', deptName: '', deptCode: '', expectSuccess: '', searchTerm: '', deptIndex: '', posTitle: '', holidayName: '', holidayDate: '', posIndex: '' },
];

// ─── Append rows to each sheet ───
function appendRows(sheetName, newRows) {
  const existingRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  const headers = Object.keys(existingRows[0]);
  
  // Normalize new rows to have all headers
  const normalizedNew = newRows.map(row => {
    const normalized = {};
    for (const h of headers) {
      normalized[h] = row[h] !== undefined ? row[h] : '';
    }
    // Add any extra columns from new rows not in original headers
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) {
        normalized[key] = row[key];
      }
    }
    return normalized;
  });
  
  const allRows = [...existingRows, ...normalizedNew];
  const newSheet = XLSX.utils.json_to_sheet(allRows);
  wb.Sheets[sheetName] = newSheet;
  
  console.log(`${sheetName}: ${existingRows.length} existing + ${newRows.length} new = ${allRows.length} total rows`);
}

appendRows('Leave', newLeaveRows);
appendRows('Tasks', newTaskRows);
appendRows('Organization', newOrgRows);

XLSX.writeFile(wb, WORKBOOK_PATH);
console.log('\nExcel updated successfully!');
