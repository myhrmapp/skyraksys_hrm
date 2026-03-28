'use strict';

/**
 * COMPREHENSIVE SEEDER - SkyRakSys HRM
 * =====================================
 * Seeds ALL required data for a fresh installation:
 *   1. Departments (5)
 *   2. Positions (11)  
 *   3. Users (5) with bcrypt passwords
 *   4. Employees (5) linked to users
 *   5. Leave Types (5)
 *   6. Leave Balances (all employees × all leave types)
 *   7. Projects (3)
 *   8. Tasks (6)
 *   9. Salary Structures (5)
 *   10. Payslip Templates (4)
 * 
 * Usage:
 *   npx sequelize-cli db:seed:all
 *   npx sequelize-cli db:seed:undo:all   (to remove all seeded data)
 * 
 * Default credentials (change SEED_DEFAULT_PASSWORD in .env):
 *   admin@skyraksys.com     / admin123  (Admin)
 *   hr@skyraksys.com        / admin123  (HR)
 *   lead@skyraksys.com      / admin123  (Manager)
 *   employee1@skyraksys.com / admin123  (Employee)
 *   employee2@skyraksys.com / admin123  (Employee)
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // =================================================================
      // SAFETY: Skip if data already exists
      // =================================================================
      const [existingUsers] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM users;`
      );
      if (parseInt(existingUsers[0].count) > 0) {
        console.log('⚠️  Database already contains data. Skipping seed.');
        console.log('   To re-seed: npx sequelize-cli db:seed:undo:all && npx sequelize-cli db:seed:all');
        return;
      }

      const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'admin123';
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      const hashedPassword = await bcrypt.hash(defaultPassword, bcryptRounds);
      const now = new Date();
      const currentYear = now.getFullYear();

      // =================================================================
      // 1. DEPARTMENTS
      // =================================================================
      const deptIds = {
        hr: uuidv4(), engineering: uuidv4(), sales: uuidv4(),
        marketing: uuidv4(), finance: uuidv4()
      };

      await queryInterface.bulkInsert('departments', [
        { id: deptIds.hr, name: 'Human Resources', code: 'HR', description: 'Employee management and HR services', isActive: true, createdAt: now, updatedAt: now },
        { id: deptIds.engineering, name: 'Engineering', code: 'ENG', description: 'Software development and engineering', isActive: true, createdAt: now, updatedAt: now },
        { id: deptIds.sales, name: 'Sales', code: 'SALES', description: 'Sales and business development', isActive: true, createdAt: now, updatedAt: now },
        { id: deptIds.marketing, name: 'Marketing', code: 'MKT', description: 'Marketing and brand management', isActive: true, createdAt: now, updatedAt: now },
        { id: deptIds.finance, name: 'Finance', code: 'FIN', description: 'Financial planning and accounting', isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 5 Departments created');

      // =================================================================
      // 2. POSITIONS
      // =================================================================
      const posIds = {
        hrManager: uuidv4(), hrExecutive: uuidv4(),
        softwareEngineer: uuidv4(), seniorSoftwareEngineer: uuidv4(), teamLead: uuidv4(),
        salesExecutive: uuidv4(), salesManager: uuidv4(),
        marketingExecutive: uuidv4(), marketingManager: uuidv4(),
        accountant: uuidv4(), financeManager: uuidv4()
      };

      await queryInterface.bulkInsert('positions', [
        { id: posIds.hrManager, title: 'HR Manager', code: 'HR-MGR', description: 'Manages HR operations', level: 'Manager', departmentId: deptIds.hr, minSalary: 60000, maxSalary: 120000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.hrExecutive, title: 'HR Executive', code: 'HR-EXEC', description: 'HR administrative tasks', level: 'Mid', departmentId: deptIds.hr, minSalary: 30000, maxSalary: 60000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.softwareEngineer, title: 'Software Engineer', code: 'ENG-SE', description: 'Develops software applications', level: 'Mid', departmentId: deptIds.engineering, minSalary: 40000, maxSalary: 80000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.seniorSoftwareEngineer, title: 'Senior Software Engineer', code: 'ENG-SSE', description: 'Senior level development', level: 'Senior', departmentId: deptIds.engineering, minSalary: 60000, maxSalary: 120000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.teamLead, title: 'Team Lead', code: 'ENG-TL', description: 'Leads engineering teams', level: 'Lead', departmentId: deptIds.engineering, minSalary: 80000, maxSalary: 150000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.salesExecutive, title: 'Sales Executive', code: 'SAL-EXEC', description: 'Handles sales activities', level: 'Mid', departmentId: deptIds.sales, minSalary: 25000, maxSalary: 55000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.salesManager, title: 'Sales Manager', code: 'SAL-MGR', description: 'Manages sales team', level: 'Manager', departmentId: deptIds.sales, minSalary: 60000, maxSalary: 120000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.marketingExecutive, title: 'Marketing Executive', code: 'MKT-EXEC', description: 'Handles marketing campaigns', level: 'Mid', departmentId: deptIds.marketing, minSalary: 30000, maxSalary: 60000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.marketingManager, title: 'Marketing Manager', code: 'MKT-MGR', description: 'Manages marketing strategies', level: 'Manager', departmentId: deptIds.marketing, minSalary: 60000, maxSalary: 120000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.accountant, title: 'Accountant', code: 'FIN-ACC', description: 'Handles accounting', level: 'Mid', departmentId: deptIds.finance, minSalary: 30000, maxSalary: 60000, isActive: true, createdAt: now, updatedAt: now },
        { id: posIds.financeManager, title: 'Finance Manager', code: 'FIN-MGR', description: 'Manages financial operations', level: 'Manager', departmentId: deptIds.finance, minSalary: 70000, maxSalary: 140000, isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 11 Positions created');

      // =================================================================
      // 3. USERS
      // =================================================================
      const userIds = {
        admin: uuidv4(), hrManager: uuidv4(), teamLead: uuidv4(),
        employee1: uuidv4(), employee2: uuidv4()
      };

      await queryInterface.bulkInsert('users', [
        { id: userIds.admin, firstName: 'System', lastName: 'Administrator', email: 'admin@skyraksys.com', password: hashedPassword, role: 'admin', isActive: true, failedLoginAttempts: 0, createdAt: now, updatedAt: now },
        { id: userIds.hrManager, firstName: 'Sarah', lastName: 'Johnson', email: 'hr@skyraksys.com', password: hashedPassword, role: 'hr', isActive: true, failedLoginAttempts: 0, createdAt: now, updatedAt: now },
        { id: userIds.teamLead, firstName: 'John', lastName: 'Smith', email: 'lead@skyraksys.com', password: hashedPassword, role: 'manager', isActive: true, failedLoginAttempts: 0, createdAt: now, updatedAt: now },
        { id: userIds.employee1, firstName: 'Alice', lastName: 'Brown', email: 'employee1@skyraksys.com', password: hashedPassword, role: 'employee', isActive: true, failedLoginAttempts: 0, createdAt: now, updatedAt: now },
        { id: userIds.employee2, firstName: 'Bob', lastName: 'Wilson', email: 'employee2@skyraksys.com', password: hashedPassword, role: 'employee', isActive: true, failedLoginAttempts: 0, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 5 Users created');

      // =================================================================
      // 4. EMPLOYEES
      // =================================================================
      const empIds = {
        admin: uuidv4(), hrManager: uuidv4(), teamLead: uuidv4(),
        employee1: uuidv4(), employee2: uuidv4()
      };

      await queryInterface.bulkInsert('employees', [
        { id: empIds.admin, employeeId: 'EMP0001', firstName: 'System', lastName: 'Administrator', email: 'admin@skyraksys.com', phone: '9876543210', hireDate: '2024-01-01', status: 'Active', departmentId: deptIds.hr, positionId: posIds.hrManager, userId: userIds.admin, nationality: 'Indian', employmentType: 'Full-time', probationPeriod: 0, noticePeriod: 90, createdAt: now, updatedAt: now },
        { id: empIds.hrManager, employeeId: 'EMP0002', firstName: 'Sarah', lastName: 'Johnson', email: 'hr@skyraksys.com', phone: '9876543211', hireDate: '2024-01-15', status: 'Active', departmentId: deptIds.hr, positionId: posIds.hrManager, userId: userIds.hrManager, nationality: 'Indian', employmentType: 'Full-time', probationPeriod: 6, noticePeriod: 60, createdAt: now, updatedAt: now },
        { id: empIds.teamLead, employeeId: 'EMP0003', firstName: 'John', lastName: 'Smith', email: 'lead@skyraksys.com', phone: '9876543212', hireDate: '2024-02-01', status: 'Active', departmentId: deptIds.engineering, positionId: posIds.teamLead, userId: userIds.teamLead, nationality: 'Indian', employmentType: 'Full-time', probationPeriod: 6, noticePeriod: 60, createdAt: now, updatedAt: now },
        { id: empIds.employee1, employeeId: 'EMP0004', firstName: 'Alice', lastName: 'Brown', email: 'employee1@skyraksys.com', phone: '9876543213', hireDate: '2024-03-01', status: 'Active', departmentId: deptIds.engineering, positionId: posIds.softwareEngineer, managerId: empIds.teamLead, userId: userIds.employee1, nationality: 'Indian', employmentType: 'Full-time', probationPeriod: 6, noticePeriod: 30, createdAt: now, updatedAt: now },
        { id: empIds.employee2, employeeId: 'EMP0005', firstName: 'Bob', lastName: 'Wilson', email: 'employee2@skyraksys.com', phone: '9876543214', hireDate: '2024-03-15', status: 'Active', departmentId: deptIds.engineering, positionId: posIds.softwareEngineer, managerId: empIds.teamLead, userId: userIds.employee2, nationality: 'Indian', employmentType: 'Full-time', probationPeriod: 6, noticePeriod: 30, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 5 Employees created');

      // Update department managers  
      await queryInterface.sequelize.query(
        `UPDATE departments SET "managerId" = '${empIds.admin}' WHERE id = '${deptIds.hr}';`
      );
      await queryInterface.sequelize.query(
        `UPDATE departments SET "managerId" = '${empIds.teamLead}' WHERE id = '${deptIds.engineering}';`
      );

      // =================================================================
      // 5. LEAVE TYPES
      // =================================================================
      const ltIds = {
        sick: uuidv4(), casual: uuidv4(), annual: uuidv4(),
        maternity: uuidv4(), paternity: uuidv4()
      };

      await queryInterface.bulkInsert('leave_types', [
        { id: ltIds.sick, name: 'Sick Leave', description: 'Leave for medical reasons', maxDaysPerYear: 12, carryForward: false, maxCarryForwardDays: 0, isActive: true, createdAt: now, updatedAt: now },
        { id: ltIds.casual, name: 'Casual Leave', description: 'Leave for personal reasons', maxDaysPerYear: 12, carryForward: false, maxCarryForwardDays: 0, isActive: true, createdAt: now, updatedAt: now },
        { id: ltIds.annual, name: 'Annual Leave', description: 'Yearly vacation leave (Earned Leave)', maxDaysPerYear: 21, carryForward: true, maxCarryForwardDays: 5, isActive: true, createdAt: now, updatedAt: now },
        { id: ltIds.maternity, name: 'Maternity Leave', description: 'Maternity leave as per Indian law (26 weeks)', maxDaysPerYear: 182, carryForward: false, maxCarryForwardDays: 0, isActive: true, createdAt: now, updatedAt: now },
        { id: ltIds.paternity, name: 'Paternity Leave', description: 'Paternity leave', maxDaysPerYear: 15, carryForward: false, maxCarryForwardDays: 0, isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 5 Leave Types created');

      // =================================================================
      // 6. LEAVE BALANCES (all employees × all leave types × current year)
      // =================================================================
      const leaveMetadata = {
        sick: 12, casual: 12, annual: 21, maternity: 182, paternity: 15
      };
      const leaveBalances = [];
      Object.values(empIds).forEach(eid => {
        Object.entries(ltIds).forEach(([type, ltId]) => {
          leaveBalances.push({
            id: uuidv4(), employeeId: eid, leaveTypeId: ltId, year: currentYear,
            totalAccrued: leaveMetadata[type], totalTaken: 0, totalPending: 0,
            balance: leaveMetadata[type], carryForward: 0,
            createdAt: now, updatedAt: now
          });
        });
      });
      await queryInterface.bulkInsert('leave_balances', leaveBalances);
      console.log(`  ✓ ${leaveBalances.length} Leave Balances created (${currentYear})`);

      // =================================================================
      // 7. PROJECTS
      // =================================================================
      const projIds = { hrm: uuidv4(), ecommerce: uuidv4(), mobile: uuidv4() };

      await queryInterface.bulkInsert('projects', [
        { id: projIds.hrm, name: 'HRM System', description: 'Human Resource Management System', startDate: '2024-01-01', endDate: '2025-12-31', status: 'Active', clientName: 'Internal', managerId: empIds.teamLead, isActive: true, createdAt: now, updatedAt: now },
        { id: projIds.ecommerce, name: 'E-commerce Platform', description: 'Online shopping platform development', startDate: '2024-06-01', endDate: '2025-06-30', status: 'Active', clientName: 'External Client', managerId: empIds.teamLead, isActive: true, createdAt: now, updatedAt: now },
        { id: projIds.mobile, name: 'Mobile App', description: 'Mobile application development', startDate: '2025-01-01', endDate: '2025-12-31', status: 'Planning', clientName: 'Internal', managerId: empIds.teamLead, isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 3 Projects created');

      // =================================================================
      // 8. TASKS
      // =================================================================
      const taskIds = {
        backend: uuidv4(), frontend: uuidv4(), dbDesign: uuidv4(),
        apiDev: uuidv4(), testing: uuidv4(), documentation: uuidv4()
      };

      await queryInterface.bulkInsert('tasks', [
        { id: taskIds.backend, name: 'Backend Development', description: 'Develop REST API backend', estimatedHours: 120, actualHours: 80, status: 'In Progress', priority: 'High', projectId: projIds.hrm, assignedTo: empIds.employee1, availableToAll: false, isActive: true, createdAt: now, updatedAt: now },
        { id: taskIds.frontend, name: 'Frontend Development', description: 'Develop React frontend', estimatedHours: 100, actualHours: 60, status: 'In Progress', priority: 'High', projectId: projIds.hrm, assignedTo: empIds.employee2, availableToAll: false, isActive: true, createdAt: now, updatedAt: now },
        { id: taskIds.dbDesign, name: 'Database Design', description: 'Design and optimize database schema', estimatedHours: 40, actualHours: 40, status: 'Completed', priority: 'High', projectId: projIds.hrm, assignedTo: empIds.teamLead, availableToAll: false, isActive: true, createdAt: now, updatedAt: now },
        { id: taskIds.apiDev, name: 'API Integration', description: 'E-commerce API development', estimatedHours: 80, actualHours: 0, status: 'Not Started', priority: 'Medium', projectId: projIds.ecommerce, assignedTo: empIds.employee1, availableToAll: false, isActive: true, createdAt: now, updatedAt: now },
        { id: taskIds.testing, name: 'QA Testing', description: 'Quality assurance and testing', estimatedHours: 60, actualHours: 0, status: 'Not Started', priority: 'Medium', projectId: projIds.hrm, assignedTo: null, availableToAll: true, isActive: true, createdAt: now, updatedAt: now },
        { id: taskIds.documentation, name: 'Documentation', description: 'Technical documentation', estimatedHours: 20, actualHours: 0, status: 'Not Started', priority: 'Low', projectId: projIds.hrm, assignedTo: null, availableToAll: true, isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 6 Tasks created');

      // =================================================================
      // 9. SALARY STRUCTURES
      // =================================================================
      await queryInterface.bulkInsert('salary_structures', [
        { id: uuidv4(), employeeId: empIds.admin, basicSalary: 100000, hra: 40000, allowances: 20000, pfContribution: 12000, tds: 15000, professionalTax: 2400, otherDeductions: 0, currency: 'INR', effectiveFrom: '2024-01-01', isActive: true, createdAt: now, updatedAt: now },
        { id: uuidv4(), employeeId: empIds.hrManager, basicSalary: 80000, hra: 32000, allowances: 15000, pfContribution: 9600, tds: 12000, professionalTax: 2400, otherDeductions: 0, currency: 'INR', effectiveFrom: '2024-01-15', isActive: true, createdAt: now, updatedAt: now },
        { id: uuidv4(), employeeId: empIds.teamLead, basicSalary: 90000, hra: 36000, allowances: 18000, pfContribution: 10800, tds: 13500, professionalTax: 2400, otherDeductions: 0, currency: 'INR', effectiveFrom: '2024-02-01', isActive: true, createdAt: now, updatedAt: now },
        { id: uuidv4(), employeeId: empIds.employee1, basicSalary: 60000, hra: 24000, allowances: 12000, pfContribution: 7200, tds: 8000, professionalTax: 2400, otherDeductions: 0, currency: 'INR', effectiveFrom: '2024-03-01', isActive: true, createdAt: now, updatedAt: now },
        { id: uuidv4(), employeeId: empIds.employee2, basicSalary: 55000, hra: 22000, allowances: 11000, pfContribution: 6600, tds: 7500, professionalTax: 2400, otherDeductions: 0, currency: 'INR', effectiveFrom: '2024-03-15', isActive: true, createdAt: now, updatedAt: now }
      ]);
      console.log('  ✓ 5 Salary Structures created');

      // =================================================================
      // 10. PAYSLIP TEMPLATES (4 India-specific templates)
      // =================================================================
      const companyInfo = {
        name: 'SKYRAKSYS TECHNOLOGIES LLP',
        address: 'Plot-No: 27E, G.S.T. Road, Guduvanchery, Chennai',
        email: 'info@skyraksys.com',
        phone: '+91 89398 88577',
        website: 'https://www.skyraksys.com'
      };

      await queryInterface.bulkInsert('payslip_templates', [
        {
          id: uuidv4(), name: 'Standard Monthly Payslip',
          description: 'Default template for monthly salary with Indian payroll components',
          isDefault: true, isActive: true,
          headerFields: JSON.stringify([
            { id: 'companyName', label: 'Company Name', type: 'text' },
            { id: 'payPeriod', label: 'Pay Period', type: 'text' },
            { id: 'employeeName', label: 'Employee Name', type: 'text' },
            { id: 'employeeId', label: 'Employee ID', type: 'text' },
            { id: 'department', label: 'Department', type: 'text' },
            { id: 'designation', label: 'Designation', type: 'text' },
            { id: 'bankAccount', label: 'Bank Account', type: 'text' }
          ]),
          earningsFields: JSON.stringify([
            { id: 'basicSalary', label: 'Basic Salary', type: 'currency' },
            { id: 'hra', label: 'House Rent Allowance', type: 'currency' },
            { id: 'conveyance', label: 'Conveyance Allowance', type: 'currency' },
            { id: 'medical', label: 'Medical Allowance', type: 'currency' },
            { id: 'special', label: 'Special Allowance', type: 'currency' },
            { id: 'overtimePay', label: 'Overtime Pay', type: 'currency' },
            { id: 'grossSalary', label: 'Gross Salary', type: 'currency', calculated: true }
          ]),
          deductionsFields: JSON.stringify([
            { id: 'pfContribution', label: 'PF Contribution', type: 'currency' },
            { id: 'esi', label: 'ESI', type: 'currency' },
            { id: 'tds', label: 'TDS', type: 'currency' },
            { id: 'professionalTax', label: 'Professional Tax', type: 'currency' },
            { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
          ]),
          footerFields: JSON.stringify([
            { id: 'netSalary', label: 'Net Salary', type: 'currency', calculated: true },
            { id: 'netSalaryInWords', label: 'Net Salary in Words', type: 'text', calculated: true },
            { id: 'workingDays', label: 'Working Days', type: 'number' },
            { id: 'presentDays', label: 'Present Days', type: 'number' },
            { id: 'generatedDate', label: 'Generated Date', type: 'date' }
          ]),
          styling: JSON.stringify({
            fontFamily: 'Arial, sans-serif', fontSize: '12px', headingFontSize: '16px',
            primaryColor: '#1976d2', headerBackgroundColor: '#e3f2fd',
            companyInfo, watermark: { enabled: false },
            htmlTemplates: { disclaimer: 'This is a computer-generated payslip and does not require a signature.' }
          }),
          createdAt: now, updatedAt: now
        },
        {
          id: uuidv4(), name: 'Executive Payslip (Detailed)',
          description: 'Comprehensive template for executives with detailed breakdown',
          isDefault: false, isActive: true,
          headerFields: JSON.stringify([
            { id: 'companyName', label: 'Company Name', type: 'text' },
            { id: 'companyAddress', label: 'Company Address', type: 'text' },
            { id: 'payPeriod', label: 'Pay Period', type: 'text' },
            { id: 'payslipNumber', label: 'Payslip Number', type: 'text' },
            { id: 'employeeName', label: 'Employee Name', type: 'text' },
            { id: 'employeeId', label: 'Employee ID', type: 'text' },
            { id: 'department', label: 'Department', type: 'text' },
            { id: 'designation', label: 'Designation', type: 'text' },
            { id: 'bankAccount', label: 'Bank Account', type: 'text' },
            { id: 'panNumber', label: 'PAN Number', type: 'text' }
          ]),
          earningsFields: JSON.stringify([
            { id: 'basicSalary', label: 'Basic Salary', type: 'currency' },
            { id: 'hra', label: 'HRA', type: 'currency' },
            { id: 'conveyance', label: 'Conveyance', type: 'currency' },
            { id: 'medical', label: 'Medical', type: 'currency' },
            { id: 'special', label: 'Special Allowance', type: 'currency' },
            { id: 'overtimePay', label: 'Overtime Pay', type: 'currency' },
            { id: 'bonus', label: 'Performance Bonus', type: 'currency' },
            { id: 'grossSalary', label: 'Gross Salary', type: 'currency', calculated: true }
          ]),
          deductionsFields: JSON.stringify([
            { id: 'pfContribution', label: 'PF', type: 'currency' },
            { id: 'esi', label: 'ESI', type: 'currency' },
            { id: 'tds', label: 'TDS', type: 'currency' },
            { id: 'professionalTax', label: 'PT', type: 'currency' },
            { id: 'loanDeduction', label: 'Loan', type: 'currency' },
            { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
          ]),
          footerFields: JSON.stringify([
            { id: 'netSalary', label: 'Net Salary', type: 'currency', calculated: true },
            { id: 'netSalaryInWords', label: 'Net Salary in Words', type: 'text', calculated: true },
            { id: 'workingDays', label: 'Working Days', type: 'number' },
            { id: 'presentDays', label: 'Present Days', type: 'number' },
            { id: 'generatedDate', label: 'Generated Date', type: 'date' }
          ]),
          styling: JSON.stringify({
            fontFamily: 'Georgia, serif', fontSize: '12px', primaryColor: '#7b1fa2',
            companyInfo, watermark: { enabled: true, text: 'EXECUTIVE PAYSLIP', opacity: 0.08 },
            htmlTemplates: { disclaimer: 'This is a confidential document.' }
          }),
          createdAt: now, updatedAt: now
        },
        {
          id: uuidv4(), name: 'Consultant/Contract Payslip',
          description: 'Simplified template for consultants and contract workers',
          isDefault: false, isActive: true,
          headerFields: JSON.stringify([
            { id: 'companyName', label: 'Company Name', type: 'text' },
            { id: 'payPeriod', label: 'Pay Period', type: 'text' },
            { id: 'employeeName', label: 'Consultant Name', type: 'text' },
            { id: 'employeeId', label: 'Consultant ID', type: 'text' },
            { id: 'panNumber', label: 'PAN Number', type: 'text' }
          ]),
          earningsFields: JSON.stringify([
            { id: 'basicSalary', label: 'Professional Fee', type: 'currency' },
            { id: 'bonus', label: 'Incentive', type: 'currency' },
            { id: 'grossSalary', label: 'Gross Amount', type: 'currency', calculated: true }
          ]),
          deductionsFields: JSON.stringify([
            { id: 'tds', label: 'TDS', type: 'currency' },
            { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
          ]),
          footerFields: JSON.stringify([
            { id: 'netSalary', label: 'Net Payable', type: 'currency', calculated: true },
            { id: 'netSalaryInWords', label: 'Amount in Words', type: 'text', calculated: true },
            { id: 'generatedDate', label: 'Generated Date', type: 'date' }
          ]),
          styling: JSON.stringify({
            fontFamily: 'Helvetica, sans-serif', fontSize: '11px', primaryColor: '#00695c',
            companyInfo, watermark: { enabled: false },
            htmlTemplates: { disclaimer: 'Payment subject to deduction of applicable taxes at source.' }
          }),
          createdAt: now, updatedAt: now
        },
        {
          id: uuidv4(), name: 'Intern Stipend Slip',
          description: 'Simple template for intern stipend',
          isDefault: false, isActive: true,
          headerFields: JSON.stringify([
            { id: 'companyName', label: 'Company Name', type: 'text' },
            { id: 'payPeriod', label: 'Period', type: 'text' },
            { id: 'employeeName', label: 'Intern Name', type: 'text' },
            { id: 'employeeId', label: 'Intern ID', type: 'text' },
            { id: 'department', label: 'Department', type: 'text' }
          ]),
          earningsFields: JSON.stringify([
            { id: 'basicSalary', label: 'Monthly Stipend', type: 'currency' },
            { id: 'grossSalary', label: 'Total Amount', type: 'currency', calculated: true }
          ]),
          deductionsFields: JSON.stringify([
            { id: 'totalDeductions', label: 'Total Deductions', type: 'currency', calculated: true }
          ]),
          footerFields: JSON.stringify([
            { id: 'netSalary', label: 'Net Payable', type: 'currency', calculated: true },
            { id: 'workingDays', label: 'Working Days', type: 'number' },
            { id: 'generatedDate', label: 'Generated Date', type: 'date' }
          ]),
          styling: JSON.stringify({
            fontFamily: 'Arial, sans-serif', fontSize: '12px', primaryColor: '#388e3c',
            companyInfo, watermark: { enabled: false },
            htmlTemplates: { disclaimer: 'This is an auto-generated stipend slip.' }
          }),
          createdAt: now, updatedAt: now
        }
      ]);
      console.log('  ✓ 4 Payslip Templates created');

      // =================================================================
      // DONE
      // =================================================================
      console.log('\n✅ Seed completed successfully!');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║  SkyRakSys HRM - Seed Summary           ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log('║  5  Departments                         ║');
      console.log('║  11 Positions                           ║');
      console.log('║  5  Users                               ║');
      console.log('║  5  Employees                           ║');
      console.log('║  5  Leave Types                         ║');
      console.log(`║  ${String(leaveBalances.length).padEnd(2)} Leave Balances (${currentYear})            ║`);
      console.log('║  3  Projects                            ║');
      console.log('║  6  Tasks                               ║');
      console.log('║  5  Salary Structures                   ║');
      console.log('║  4  Payslip Templates                   ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log('║  Default Login Credentials:             ║');
      console.log(`║  Password: ${defaultPassword.padEnd(29)}║`);
      console.log('║  admin@skyraksys.com     (Admin)        ║');
      console.log('║  hr@skyraksys.com        (HR)           ║');
      console.log('║  lead@skyraksys.com      (Manager)      ║');
      console.log('║  employee1@skyraksys.com (Employee)     ║');
      console.log('║  employee2@skyraksys.com (Employee)     ║');
      console.log('╚══════════════════════════════════════════╝');

    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('⚠️  Some data already exists, skipping...');
      } else {
        console.error('❌ Seed error:', error.message);
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Use TRUNCATE CASCADE to handle all FK dependencies
    console.log('🔄 Removing all seeded data...');
    const tables = [
      'payslip_audit_logs', 'payslips', 'payslip_templates', 'salary_structures',
      'payroll_data', 'timesheets', 'tasks', 'projects',
      'leave_requests', 'leave_balances', 'leave_types',
      'attendances', 'employee_reviews',
      'password_reset_tokens', 'refresh_tokens', 'audit_logs',
      'employees', 'users', 'positions', 'departments', 'holidays', 'system_configs'
    ];
    for (const table of tables) {
      try {
        await queryInterface.sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (e) {
        // Table may not exist yet, skip
        console.log(`  ⚠️  Skipping ${table}: ${e.message}`);
      }
    }
    console.log('✅ All seeded data removed');
  }
};
