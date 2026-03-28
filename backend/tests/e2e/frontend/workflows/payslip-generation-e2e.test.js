/**
 * PAYSLIP GENERATION E2E WORKFLOW TESTS
 * 
 * Tests payslip generation using the actual /generate API endpoint.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-payslip';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-payslip';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DB_DATABASE = 'skyraksys_hrm_test';

const request = require('supertest');
const app = require('../../../../server');
const db = require('../../../../models');
const dayjs = require('dayjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let testData = {
  tokens: {},
  users: {},
  employees: {},
  departments: {},
  positions: {},
  payslips: {},
  salaryStructures: {}
};

describe('💰 PAYSLIP GENERATION E2E TESTS', () => {
  
  beforeAll(async () => {
    console.log('\n🚀 Setting up Payslip test environment...\n');
    
    try {
      await db.Payslip.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.PayrollData?.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.SalaryStructure.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Employee.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.RefreshToken?.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.User.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Position.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Department.destroy({ where: {}, force: true, truncate: true, cascade: true });
    } catch (e) { /* ignore */ }
    
    try {
      const dept = await db.Department.create({
        name: 'Finance',
        code: 'FIN',
        description: 'Finance Department',
        isActive: true
      });
      testData.departments.Finance = dept;
      
      const position = await db.Position.create({
        title: 'Accountant',
        departmentId: dept.id,
        level: 'Mid',
        description: 'Financial Accountant'
      });
      testData.positions.Accountant = position;
      
      const hashedPassword = await bcrypt.hash('Test@123456', 12);
      
      // Create HR User
      const hrUser = await db.User.create({
        email: 'hr.payslip@test.com',
        password: hashedPassword,
        role: 'hr',
        firstName: 'HR',
        lastName: 'Manager',
        isActive: true
      });
      testData.users.hr = hrUser;
      testData.tokens.hr = jwt.sign(
        { id: hrUser.id, email: hrUser.email, role: 'hr' },
        process.env.JWT_SECRET
      );
      
      const hrEmployee = await db.Employee.create({
        userId: hrUser.id,
        employeeId: 'SKYT0020',
        firstName: 'HR',
        lastName: 'Manager',
        email: 'hr.payslip@test.com',
        departmentId: testData.departments.Finance.id,
        positionId: testData.positions.Accountant.id,
        hireDate: '2024-01-01',
        status: 'Active'
      });
      testData.employees.hr = hrEmployee;
      
      // Create Employee 1
      const empUser = await db.User.create({
        email: 'john.payslip@test.com',
        password: hashedPassword,
        role: 'employee',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      });
      testData.users.employee = empUser;
      testData.tokens.employee = jwt.sign(
        { id: empUser.id, email: empUser.email, role: 'employee', employeeId: null },
        process.env.JWT_SECRET
      );
      
      const employee = await db.Employee.create({
        userId: empUser.id,
        employeeId: 'SKYT0021',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.payslip@test.com',
        departmentId: testData.departments.Finance.id,
        positionId: testData.positions.Accountant.id,
        hireDate: '2024-01-01',
        status: 'Active'
      });
      testData.employees.employee = employee;
      
      // Update employee token with employeeId
      testData.tokens.employee = jwt.sign(
        { id: empUser.id, email: empUser.email, role: 'employee', employeeId: employee.id },
        process.env.JWT_SECRET
      );
      
      // Create Employee 2
      const emp2User = await db.User.create({
        email: 'jane.payslip@test.com',
        password: hashedPassword,
        role: 'employee',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true
      });
      testData.users.employee2 = emp2User;
      testData.tokens.employee2 = jwt.sign(
        { id: emp2User.id, email: emp2User.email, role: 'employee', employeeId: null },
        process.env.JWT_SECRET
      );
      
      const employee2 = await db.Employee.create({
        userId: emp2User.id,
        employeeId: 'SKYT0022',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.payslip@test.com',
        departmentId: testData.departments.Finance.id,
        positionId: testData.positions.Accountant.id,
        hireDate: '2024-01-01',
        status: 'Active'
      });
      testData.employees.employee2 = employee2;
      
      // Update employee2 token with employeeId
      testData.tokens.employee2 = jwt.sign(
        { id: emp2User.id, email: emp2User.email, role: 'employee', employeeId: employee2.id },
        process.env.JWT_SECRET
      );
      
      // Create Salary Structures
      testData.salaryStructures.employee = await db.SalaryStructure.create({
        employeeId: testData.employees.employee.id,
        basicSalary: 60000,
        hra: 12000,
        allowances: 8000,
        effectiveFrom: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        isActive: true
      });
      
      testData.salaryStructures.employee2 = await db.SalaryStructure.create({
        employeeId: testData.employees.employee2.id,
        basicSalary: 55000,
        hra: 11000,
        allowances: 7000,
        effectiveFrom: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        isActive: true
      });
      
      console.log('✅ Setup complete\n');
    } catch (error) {
      console.error('❌ Setup error:', error.message);
      console.error('Error name:', error.name);
      if (error.parent) console.error('Parent error:', error.parent.message);
      throw error;
    }
  });
  
  afterAll(async () => {
    console.log('\n🧹 Cleaning up...\n');
    
    try {
      await db.Payslip.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.SalaryStructure.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Employee.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.RefreshToken?.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.User.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Position.destroy({ where: {}, force: true, truncate: true, cascade: true });
      await db.Department.destroy({ where: {}, force: true, truncate: true, cascade: true });
    } catch (e) { /* ignore */ }
    
    await db.sequelize.close();
  });
  
  describe('📄 Workflow 1: Payslip Generation', () => {
    
    test('1.1: HR generates payslip using /generate endpoint', async () => {
      const currentMonth = Number.parseInt(dayjs().format('MM'));
      const currentYear = Number.parseInt(dayjs().format('YYYY'));
      
      const res = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${testData.tokens.hr}`)
        .send({
          employeeIds: [testData.employees.employee.id],
          month: currentMonth,
          year: currentYear
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('payslips');
      expect(res.body.data.payslips.length).toBe(1);
      
      const payslip = res.body.data.payslips[0];
      expect(payslip.employeeId).toBe(testData.employees.employee.id);
      expect(payslip.status).toBe('draft');
      expect(payslip).toHaveProperty('earnings');
      expect(payslip).toHaveProperty('grossEarnings');
      expect(payslip).toHaveProperty('netPay');
      
      testData.payslips.employee = payslip;
      
      console.log('✅ HR generated payslip');
    });
    
    test('1.2: HR generates bulk payslips', async () => {
      const nextMonth = Number.parseInt(dayjs().add(1, 'month').format('MM'));
      const nextYear = Number.parseInt(dayjs().add(1, 'month').format('YYYY'));
      
      const res = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${testData.tokens.hr}`)
        .send({
          employeeIds: [testData.employees.employee.id, testData.employees.employee2.id],
          month: nextMonth,
          year: nextYear
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.payslips.length).toBe(2);
      
      testData.payslips.bulkGenerated = res.body.data.payslips;
      
      console.log('✅ Bulk generation works');
    });
    
    test('1.3: Employee cannot generate payslips', async () => {
      const res = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${testData.tokens.employee}`)
        .send({
          employeeIds: [testData.employees.employee.id],
          month: Number.parseInt(dayjs().format('MM')),
          year: Number.parseInt(dayjs().format('YYYY'))
        });
      
      expect(res.status).toBe(403);
      
      console.log('✅ Employee blocked');
    });
  });
  
  describe('👁️ Workflow 2: Employee Views', () => {
    
    test('2.1: Employee views own payslips', async () => {
      const res = await request(app)
        .get('/api/payslips')
        .set('Authorization', `Bearer ${testData.tokens.employee}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.payslips).toBeInstanceOf(Array);
      
      const allOwn = res.body.data.payslips.every(p => p.employeeId === testData.employees.employee.id);
      expect(allOwn).toBe(true);
      
      console.log('✅ Employee sees only own payslips');
    });
    
    test('2.2: Employee cannot view others payslips', async () => {
      const otherPayslip = testData.payslips.bulkGenerated.find(
        p => p.employeeId === testData.employees.employee2.id
      );
      
      const res = await request(app)
        .get(`/api/payslips/${otherPayslip.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee}`);
      
      expect(res.status).toBe(403);
      
      console.log('✅ Privacy enforced');
    });
  });
  
  describe('🔄 Workflow 3: Status Management', () => {
    
    test('3.1: HR updates status to finalized', async () => {
      const res = await request(app)
        .put(`/api/payslips/${testData.payslips.employee.id}`)
        .set('Authorization', `Bearer ${testData.tokens.hr}`)
        .send({ status: 'finalized' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('finalized');
      
      console.log('✅ Status updated');
    });
    
    test('3.2: Employee cannot update status', async () => {
      const res = await request(app)
        .put(`/api/payslips/${testData.payslips.employee.id}`)
        .set('Authorization', `Bearer ${testData.tokens.employee}`)
        .send({ status: 'draft' });
      
      expect(res.status).toBe(403);
      
      console.log('✅ Employee blocked from updates');
    });
  });
});
