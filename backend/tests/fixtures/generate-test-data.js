const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Generate comprehensive test data for SkyrakSys HRM
 * This script creates an Excel file with multiple sheets containing test scenarios
 */

// Ensure fixtures directory exists
const fixturesDir = path.join(__dirname, '../fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Test Data Sheets
const testData = {
  Users: [
    {
      firstName: 'Admin', lastName: 'User', email: 'admin@skyraksys.com', password: 'admin123', role: 'admin', isActive: true, scenario: 'Admin Login'
    },
    {
      firstName: 'HR', lastName: 'Manager', email: 'hr@skyraksys.com', password: 'hr123', role: 'hr', isActive: true, scenario: 'HR Operations'
    },
    {
      firstName: 'John', lastName: 'Manager', email: 'john.manager@skyraksys.com', password: 'manager123', role: 'manager', isActive: true, scenario: 'Manager Approval'
    },
    {
      firstName: 'Jane', lastName: 'Employee', email: 'jane.employee@skyraksys.com', password: 'employee123', role: 'employee', isActive: true, scenario: 'Employee Self-Service'
    },
    {
      firstName: 'Bob', lastName: 'Smith', email: 'bob.smith@skyraksys.com', password: 'employee123', role: 'employee', isActive: true, scenario: 'Employee with Manager'
    },
    {
      firstName: 'Inactive', lastName: 'User', email: 'inactive@skyraksys.com', password: 'inactive123', role: 'employee', isActive: false, scenario: 'Inactive Account Test'
    },
    {
      firstName: 'Locked', lastName: 'User', email: 'locked@skyraksys.com', password: 'locked123', role: 'employee', isActive: true, isLocked: true, scenario: 'Account Lockout Test'
    }
  ],

  Employees: [
    {
      employeeId: 'EMP001', firstName: 'Alice', lastName: 'Johnson', email: 'alice@skyraksys.com', phone: '9876543210',
      hireDate: '2023-01-15', status: 'Active', employmentType: 'Full-time', departmentCode: 'IT', positionCode: 'SE',
      aadhaarNumber: '123456789012', panNumber: 'ABCDE1234F', uanNumber: 'UAN001', pfNumber: 'PF001',
      bankName: 'HDFC Bank', bankAccountNumber: '50200012345678', ifscCode: 'HDFC0001234',
      basicSalary: 50000, scenario: 'Regular Employee'
    },
    {
      employeeId: 'EMP002', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@skyraksys.com', phone: '9876543211',
      hireDate: '2023-06-01', status: 'Active', employmentType: 'Full-time', departmentCode: 'HR', positionCode: 'HRM',
      aadhaarNumber: '123456789013', panNumber: 'BCDEF2345G', uanNumber: 'UAN002', pfNumber: 'PF002',
      bankName: 'ICICI Bank', bankAccountNumber: '50200012345679', ifscCode: 'ICIC0001234',
      basicSalary: 45000, scenario: 'HR Employee'
    },
    {
      employeeId: 'EMP003', firstName: 'Diana', lastName: 'Prince', email: 'diana@skyraksys.com', phone: '9876543212',
      hireDate: '2024-01-10', status: 'On Leave', employmentType: 'Full-time', departmentCode: 'IT', positionCode: 'SSE',
      aadhaarNumber: '123456789014', panNumber: 'CDEFG3456H', uanNumber: 'UAN003', pfNumber: 'PF003',
      bankName: 'SBI', bankAccountNumber: '50200012345680', ifscCode: 'SBIN0001234',
      basicSalary: 60000, scenario: 'Employee on Leave'
    },
    {
      employeeId: 'EMP004', firstName: 'Eve', lastName: 'Anderson', email: 'eve@skyraksys.com', phone: '9876543213',
      hireDate: '2022-03-20', status: 'Active', employmentType: 'Contract', departmentCode: 'FIN', positionCode: 'ACC',
      aadhaarNumber: '123456789015', panNumber: 'DEFGH4567I', uanNumber: 'UAN004', pfNumber: 'PF004',
      bankName: 'Axis Bank', bankAccountNumber: '50200012345681', ifscCode: 'UTIB0001234',
      basicSalary: 40000, scenario: 'Contract Employee'
    },
    {
      employeeId: 'EMP005', firstName: 'Frank', lastName: 'Miller', email: 'frank@skyraksys.com', phone: '9876543214',
      hireDate: '2024-09-01', status: 'Active', employmentType: 'Intern', departmentCode: 'IT', positionCode: 'INT',
      aadhaarNumber: '123456789016', panNumber: 'EFGHI5678J', bankName: 'HDFC Bank',
      bankAccountNumber: '50200012345682', ifscCode: 'HDFC0001234',
      basicSalary: 15000, scenario: 'Intern'
    }
  ],

  Departments: [
    { name: 'Information Technology', code: 'IT', description: 'IT Department', scenario: 'Core Department' },
    { name: 'Human Resources', code: 'HR', description: 'HR Department', scenario: 'Core Department' },
    { name: 'Finance', code: 'FIN', description: 'Finance Department', scenario: 'Core Department' },
    { name: 'Marketing', code: 'MKT', description: 'Marketing Department', scenario: 'Additional Department' },
    { name: 'Operations', code: 'OPS', description: 'Operations Department', scenario: 'Additional Department' }
  ],

  Positions: [
    { title: 'Software Engineer', code: 'SE', description: 'Software Engineer', departmentCode: 'IT', minSalary: 40000, maxSalary: 80000, scenario: 'IT Position' },
    { title: 'Senior Software Engineer', code: 'SSE', description: 'Senior Software Engineer', departmentCode: 'IT', minSalary: 60000, maxSalary: 120000, scenario: 'IT Position' },
    { title: 'HR Manager', code: 'HRM', description: 'HR Manager', departmentCode: 'HR', minSalary: 50000, maxSalary: 100000, scenario: 'HR Position' },
    { title: 'Accountant', code: 'ACC', description: 'Accountant', departmentCode: 'FIN', minSalary: 35000, maxSalary: 70000, scenario: 'Finance Position' },
    { title: 'Intern', code: 'INT', description: 'Intern', departmentCode: 'IT', minSalary: 10000, maxSalary: 20000, scenario: 'Entry Level' }
  ],

  LeaveTypes: [
    { name: 'Casual Leave', code: 'CL', defaultDays: 12, carryForward: true, maxCarryForward: 5, description: 'Casual Leave', scenario: 'Standard Leave' },
    { name: 'Sick Leave', code: 'SL', defaultDays: 10, carryForward: false, maxCarryForward: 0, description: 'Sick Leave', scenario: 'Standard Leave' },
    { name: 'Earned Leave', code: 'EL', defaultDays: 15, carryForward: true, maxCarryForward: 10, description: 'Earned Leave', scenario: 'Standard Leave' },
    { name: 'Maternity Leave', code: 'ML', defaultDays: 180, carryForward: false, maxCarryForward: 0, description: 'Maternity Leave', scenario: 'Special Leave' },
    { name: 'Paternity Leave', code: 'PL', defaultDays: 15, carryForward: false, maxCarryForward: 0, description: 'Paternity Leave', scenario: 'Special Leave' }
  ],

  Projects: [
    { name: 'HRM System', code: 'PRJ001', description: 'Internal HRM System', status: 'Active', startDate: '2023-01-01', scenario: 'Active Project' },
    { name: 'Client Portal', code: 'PRJ002', description: 'Client Management Portal', status: 'Active', startDate: '2023-06-01', scenario: 'Active Project' },
    { name: 'Mobile App', code: 'PRJ003', description: 'Mobile Application', status: 'In Progress', startDate: '2024-01-01', scenario: 'Ongoing Project' },
    { name: 'Data Migration', code: 'PRJ004', description: 'Legacy Data Migration', status: 'Completed', startDate: '2022-01-01', endDate: '2022-12-31', scenario: 'Completed Project' }
  ],

  Tasks: [
    { name: 'Backend Development', projectCode: 'PRJ001', description: 'API Development', status: 'In Progress', scenario: 'Active Task' },
    { name: 'Frontend Development', projectCode: 'PRJ001', description: 'UI Development', status: 'In Progress', scenario: 'Active Task' },
    { name: 'Database Design', projectCode: 'PRJ001', description: 'Schema Design', status: 'Completed', scenario: 'Completed Task' },
    { name: 'Testing', projectCode: 'PRJ001', description: 'QA Testing', status: 'Open', scenario: 'Pending Task' },
    { name: 'Deployment', projectCode: 'PRJ001', description: 'Production Deployment', status: 'Open', scenario: 'Pending Task' }
  ],

  LeaveRequests: [
    { employeeId: 'EMP001', leaveTypeCode: 'CL', startDate: '2024-02-01', endDate: '2024-02-02', reason: 'Family function', status: 'Pending', scenario: 'Pending Approval' },
    { employeeId: 'EMP001', leaveTypeCode: 'SL', startDate: '2024-01-15', endDate: '2024-01-16', reason: 'Fever', status: 'Approved', scenario: 'Approved Leave' },
    { employeeId: 'EMP002', leaveTypeCode: 'EL', startDate: '2024-03-01', endDate: '2024-03-05', reason: 'Vacation', status: 'Pending', scenario: 'Long Leave' },
    { employeeId: 'EMP003', leaveTypeCode: 'CL', startDate: '2024-01-20', endDate: '2024-01-20', reason: 'Personal work', status: 'Rejected', rejectionReason: 'Insufficient balance', scenario: 'Rejected Leave' },
    { employeeId: 'EMP004', leaveTypeCode: 'SL', startDate: '2024-02-10', endDate: '2024-02-12', reason: 'Medical checkup', status: 'Approved', scenario: 'Medical Leave' }
  ],

  Timesheets: [
    { employeeId: 'EMP001', projectCode: 'PRJ001', taskName: 'Backend Development', weekStartDate: '2024-01-15', weekEndDate: '2024-01-21',
      mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8, saturdayHours: 0, sundayHours: 0,
      totalHours: 40, status: 'Submitted', scenario: 'Full Week' },
    { employeeId: 'EMP001', projectCode: 'PRJ001', taskName: 'Backend Development', weekStartDate: '2024-01-22', weekEndDate: '2024-01-28',
      mondayHours: 8, tuesdayHours: 6, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8, saturdayHours: 0, sundayHours: 0,
      totalHours: 38, status: 'Approved', scenario: 'Partial Week' },
    { employeeId: 'EMP002', projectCode: 'PRJ002', taskName: 'Frontend Development', weekStartDate: '2024-01-15', weekEndDate: '2024-01-21',
      mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8, saturdayHours: 4, sundayHours: 0,
      totalHours: 44, status: 'Submitted', scenario: 'Overtime' },
    { employeeId: 'EMP003', projectCode: 'PRJ001', taskName: 'Database Design', weekStartDate: '2024-01-15', weekEndDate: '2024-01-21',
      mondayHours: 8, tuesdayHours: 8, wednesdayHours: 0, thursdayHours: 0, fridayHours: 0, saturdayHours: 0, sundayHours: 0,
      totalHours: 16, status: 'Draft', scenario: 'Leave in Middle' }
  ],

  PayrollData: [
    { employeeId: 'EMP001', month: 1, year: 2024, basicSalary: 50000, hra: 20000, allowances: 5000, grossSalary: 75000,
      pfDeduction: 6000, esiDeduction: 562, tds: 3000, professionalTax: 200, totalDeductions: 9762, netSalary: 65238,
      presentDays: 22, absentDays: 0, totalWorkingDays: 22, scenario: 'Full Attendance' },
    { employeeId: 'EMP001', month: 2, year: 2024, basicSalary: 50000, hra: 20000, allowances: 5000, grossSalary: 75000,
      pfDeduction: 6000, esiDeduction: 562, tds: 3000, professionalTax: 200, totalDeductions: 9762, netSalary: 65238,
      presentDays: 20, absentDays: 2, totalWorkingDays: 22, scenario: 'With Absences' },
    { employeeId: 'EMP002', month: 1, year: 2024, basicSalary: 45000, hra: 18000, allowances: 4000, grossSalary: 67000,
      pfDeduction: 5400, esiDeduction: 502, tds: 2500, professionalTax: 200, totalDeductions: 8602, netSalary: 58398,
      presentDays: 22, absentDays: 0, totalWorkingDays: 22, scenario: 'Regular Payroll' }
  ],

  TestScenarios: [
    { module: 'Authentication', scenario: 'User Login', steps: '1. Enter email 2. Enter password 3. Click login', expectedResult: 'User logged in successfully', priority: 'High' },
    { module: 'Authentication', scenario: 'Invalid Login', steps: '1. Enter wrong password 2. Click login', expectedResult: 'Error: Invalid credentials', priority: 'High' },
    { module: 'Authentication', scenario: 'Account Lockout', steps: '1. Failed login 5 times', expectedResult: 'Account locked', priority: 'High' },
    { module: 'Employee Management', scenario: 'Create Employee', steps: '1. Navigate to Add Employee 2. Fill form 3. Submit', expectedResult: 'Employee created', priority: 'High' },
    { module: 'Employee Management', scenario: 'Update Employee', steps: '1. Edit employee 2. Update fields 3. Save', expectedResult: 'Employee updated', priority: 'High' },
    { module: 'Employee Management', scenario: 'Delete Employee', steps: '1. Select employee 2. Click delete 3. Confirm', expectedResult: 'Employee soft-deleted', priority: 'Medium' },
    { module: 'Leave Management', scenario: 'Submit Leave Request', steps: '1. Select leave type 2. Choose dates 3. Add reason 4. Submit', expectedResult: 'Leave request submitted', priority: 'High' },
    { module: 'Leave Management', scenario: 'Approve Leave', steps: '1. Manager views pending 2. Approve request', expectedResult: 'Leave approved, balance deducted', priority: 'High' },
    { module: 'Leave Management', scenario: 'Reject Leave', steps: '1. Manager views pending 2. Reject with reason', expectedResult: 'Leave rejected, notification sent', priority: 'Medium' },
    { module: 'Timesheet Management', scenario: 'Create Weekly Timesheet', steps: '1. Select project/task 2. Enter hours 3. Submit', expectedResult: 'Timesheet submitted for approval', priority: 'High' },
    { module: 'Timesheet Management', scenario: 'Approve Timesheet', steps: '1. Manager views submitted 2. Approve', expectedResult: 'Timesheet approved', priority: 'High' },
    { module: 'Payroll Management', scenario: 'Generate Payslip', steps: '1. Select month 2. Choose employees 3. Generate', expectedResult: 'Payslips generated with calculations', priority: 'High' },
    { module: 'Payroll Management', scenario: 'Email Payslip', steps: '1. Select payslip 2. Click email', expectedResult: 'Payslip emailed to employee', priority: 'Medium' },
    { module: 'Role-Based Access', scenario: 'Admin Access All', steps: '1. Login as admin 2. Access all modules', expectedResult: 'Full access granted', priority: 'High' },
    { module: 'Role-Based Access', scenario: 'Employee Restricted Access', steps: '1. Login as employee 2. Try to access admin features', expectedResult: 'Access denied', priority: 'High' }
  ]
};

// Create workbook and sheets
const workbook = XLSX.utils.book_new();

Object.keys(testData).forEach(sheetName => {
  const worksheet = XLSX.utils.json_to_sheet(testData[sheetName]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
});

// Write to file
const filePath = path.join(fixturesDir, 'test-data.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`✅ Test data Excel file created: ${filePath}`);
console.log(`📊 Sheets created: ${Object.keys(testData).join(', ')}`);
console.log(`📈 Total test records: ${Object.values(testData).reduce((sum, arr) => sum + arr.length, 0)}`);
