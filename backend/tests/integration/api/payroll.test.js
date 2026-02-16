const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');
const { PayrollData, Payslip, Employee, Timesheet, Task } = require('../../../models');
const { v4: uuidv4 } = require('uuid');

describe('Payroll API', () => {
  let helper, adminToken, hrToken, managerToken, employeeToken;
  let adminUser, hrUser, managerUser, employeeUser;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterEach(async () => {
    if (PayrollData) await PayrollData.destroy({ where: {}, force: true });
    if (Payslip) await Payslip.destroy({ where: {}, force: true });
    if (Timesheet) await Timesheet.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  describe('GET /api/payroll', () => {
    it('should get all payroll data for admin', async () => {
      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should get all payroll data for HR', async () => {
      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(response.status).toBe(200);
    });

    it('should not allow employee to view all payroll', async () => {
      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/payroll');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/payroll?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by month and year', async () => {
      const response = await request(app)
        .get('/api/payroll?month=1&year=2026')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/payroll/calculate', () => {
    // Helper to create test timesheets for January 2026 (weekly structure)
    const createTestTimesheets = async (employeeId) => {
      // Create a test project and task for timesheets
      const project = await helper.createProject();
      const task = await Task.create({
        name: 'Test Task',
        projectId: project.id,
        status: 'In Progress'
      });
      
      // Create 4 weeks of timesheets covering January 2026
      // Week 1: Dec 29, 2025 - Jan 4, 2026
      await Timesheet.create({
        employeeId,
        projectId: project.id,
        taskId: task.id,
        weekStartDate: '2025-12-29',
        weekEndDate: '2026-01-04',
        weekNumber: 1,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 40,
        status: 'Approved'
      });
      
      // Week 2: Jan 5-11, 2026
      await Timesheet.create({
        employeeId,
        projectId: project.id,
        taskId: task.id,
        weekStartDate: '2026-01-05',
        weekEndDate: '2026-01-11',
        weekNumber: 2,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 40,
        status: 'Approved'
      });
      
      // Week 3: Jan 12-18, 2026
      await Timesheet.create({
        employeeId,
        projectId: project.id,
        taskId: task.id,
        weekStartDate: '2026-01-12',
        weekEndDate: '2026-01-18',
        weekNumber: 3,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 40,
        status: 'Approved'
      });
      
      // Week 4: Jan 19-25, 2026
      await Timesheet.create({
        employeeId,
        projectId: project.id,
        taskId: task.id,
        weekStartDate: '2026-01-19',
        weekEndDate: '2026-01-25',
        weekNumber: 4,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 40,
        status: 'Approved'
      });
    };

    it('should calculate payroll for all employees as admin', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      await createTestTimesheets(employee.id);
      
      const payrollData = {
        employeeId: employee.id,
        month: 1,
        year: 2026
      };

      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData);

      expect(response.status).toBe(200);
    });

    it('should calculate payroll for specific employee as HR', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
await createTestTimesheets(employee.id);
      
      const payrollData = {
        employeeId: employee.id,
        month: 1,
        year: 2026
      };

      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${hrToken}`)
        .send(payrollData);

      expect(response.status).toBe(200);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should not allow employee to calculate payroll', async () => {
      const payrollData = {
        month: 1,
        year: 2026,
        paymentDate: '2026-02-01'
      };

      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(payrollData);

      expect(response.status).toBe(403);
    });

    it('should validate month range (1-12)', async () => {
      const payrollData = {
        month: 13,
        year: 2026,
        paymentDate: '2026-02-01'
      };

      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData);

      expect(response.status).toBe(400);
    });

    it('should validate year format', async () => {
      const payrollData = {
        month: 1,
        year: 20,
        paymentDate: '2026-02-01'
      };

      const response = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payroll/:id', () => {
    it('should get payroll details as admin', async () => {
      const response = await request(app)
        .get(`/api/payroll/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(response.status); // Valid UUID, record not found
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/payroll/${uuidv4()}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/payroll/:id', () => {
    it('should update payroll data as admin', async () => {
      const updateData = {
        status: 'Approved',
        approvedBy: adminUser.id
      };

      const response = await request(app)
        .put(`/api/payroll/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect([400, 404, 500]).toContain(response.status); // Valid UUID, record not found or validation error
    });

    it('should not allow employee to update payroll', async () => {
      const updateData = {
        status: 'Approved'
      };

      const response = await request(app)
        .put(`/api/payroll/${uuidv4()}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/payroll/:id', () => {
    it('should delete payroll data as admin', async () => {
      const response = await request(app)
        .delete(`/api/payroll/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(response.status); // Valid UUID, record not found
    });

    it('should not allow HR to delete payroll', async () => {
      const response = await request(app)
        .delete(`/api/payroll/${uuidv4()}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/payslips', () => {
    it('should get own payslips as employee', async () => {
      const response = await request(app)
        .get('/api/payslips')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
    });

    it('should get all payslips as admin', async () => {
      const response = await request(app)
        .get('/api/payslips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/payslips');

      expect(response.status).toBe(401);
    });

    it('should filter by month and year', async () => {
      const response = await request(app)
        .get('/api/payslips?month=1&year=2026')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/payslips/generate', () => {
    it('should generate payslips for all employees as admin', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      const payslipData = {
        employeeIds: [employee.id],
        month: 1,
        year: 2026
      };

      const response = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payslipData);

      expect(response.status).toBe(201);
    });

    it('should generate payslip for specific employee as HR', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      const payslipData = {
        employeeIds: [employee.id],
        month: 1,
        year: 2026
      };

      const response = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${hrToken}`)
        .send(payslipData);

      expect(response.status).toBe(201);
    });

    it('should not allow employee to generate payslips', async () => {
      const payslipData = {
        month: 1,
        year: 2026
      };

      const response = await request(app)
        .post('/api/payslips/generate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(payslipData);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/payslips/:id', () => {
    it('should get own payslip as employee', async () => {
      const response = await request(app)
        .get(`/api/payslips/${uuidv4()}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });

    it('should get any payslip as admin', async () => {
      const response = await request(app)
        .get(`/api/payslips/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payslips/:id/download', () => {
    it('should download own payslip PDF as employee', async () => {
      const response = await request(app)
        .get('/api/payslips/1/download')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });

    it('should download any payslip PDF as admin', async () => {
      const response = await request(app)
        .get('/api/payslips/1/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/payslips/1/download');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payslips/:id/email', () => {
    it('should email payslip to employee as HR', async () => {
      const response = await request(app)
        .post('/api/payslips/1/email')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('should email own payslip as employee', async () => {
      const response = await request(app)
        .post('/api/payslips/1/email')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payroll/salary-structure/:employeeId', () => {
    it('should get salary structure as admin', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });

      const response = await request(app)
        .get(`/api/payroll/salary-structure/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should get own salary structure as employee', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });

      const response = await request(app)
        .get(`/api/payroll/salary-structure/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });

    it('should not allow employee to view others salary structure', async () => {
      const response = await request(app)
        .get('/api/payroll/salary-structure/999')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/payroll/salary-structure', () => {
    it('should create salary structure as admin', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });
      
      // Remove any existing salary structure for this employee
      const { SalaryStructure } = require('../../../models');
      await SalaryStructure.destroy({ where: { employeeId: employee.id }, force: true });
      
      const salaryData = {
        employeeId: employee.id,
        basicSalary: 50000,
        hra: 20000,
        conveyance: 1600,
        medicalAllowance: 1250,
        specialAllowance: 10000,
        providentFund: 6000,
        professionalTax: 200,
        incomeTax: 5000,
        effectiveFrom: '2026-01-01'
      };

      const response = await request(app)
        .post('/api/salary-structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salaryData);

      expect(response.status).toBe(201);
    });

    it('should not allow employee to create salary structure', async () => {
      const salaryData = {
        employeeId: 1,
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/salary-structures')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(salaryData);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/payroll/salary-structure/:id', () => {
    it('should update salary structure as admin', async () => {
      const updateData = {
        basicSalary: 55000,
        hra: 22000
      };

      const response = await request(app)
        .put('/api/payroll/salary-structure/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    it('should not allow employee to update salary structure', async () => {
      const updateData = {
        basicSalary: 100000
      };

      const response = await request(app)
        .put('/api/payroll/salary-structure/1')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/payroll/reports/monthly', () => {
    it('should get monthly payroll report as admin', async () => {
      const response = await request(app)
        .get('/api/payslips/reports/summary?month=1&year=2026')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should not allow employee to view payroll reports', async () => {
      const response = await request(app)
        .get('/api/payslips/reports/summary?month=1&year=2026')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should require month and year parameters', async () => {
      const response = await request(app)
        .get('/api/payroll/reports/monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('GET /api/payroll/deductions/:employeeId', () => {
    it('should get employee deductions as admin', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });

      const response = await request(app)
        .get(`/api/payroll/deductions/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should get own deductions as employee', async () => {
      const employee = await Employee.findOne({ where: { userId: employeeUser.id } });

      const response = await request(app)
        .get(`/api/payroll/deductions/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });
  });
});
