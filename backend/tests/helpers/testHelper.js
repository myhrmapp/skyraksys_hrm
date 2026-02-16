const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../models');
const authConfig = require('../../config/auth.config');

/**
 * Test Helper Functions
 */
class TestHelper {
  constructor(app) {
    this.app = app;
    this.testUsers = [];
    this.testEmployees = [];
  }

  /**
   * Generate JWT token for testing
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        employeeId: user.employee ? user.employee.id : null
      },
      authConfig.secret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Create test user with employee profile
   */
  async createTestUser(role = 'employee', withEmployee = true) {
    const timestamp = Date.now();
    
    // Create required department and position first if creating employee
    let department, position;
    if (withEmployee) {
      department = await this.createDepartment();
      position = await this.createPosition();
    }
    
    const userData = {
      firstName: 'Test',
      lastName: `User${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: await bcrypt.hash('Password123!', 10),
      role: role,
      isActive: true
    };

    const user = await db.User.create(userData);
    this.testUsers.push(user);

    if (withEmployee) {
      const employeeData = {
        userId: user.id,
        employeeId: `SKYT${Math.floor(1000 + Math.random() * 9000)}`,  // Use SKYT format
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: '9876543210',
        hireDate: new Date(),
        status: 'Active',
        departmentId: department.id,  // Add required field
        positionId: position.id        // Add required field
      };
      const employee = await db.Employee.create(employeeData);
      this.testEmployees.push(employee);
      user.employee = employee;

      // Create salary structure for payroll calculations
      const salaryStructure = await db.SalaryStructure.create({
        employeeId: employee.id,
        basicSalary: 50000.00,
        hra: 15000.00,
        allowances: 10000.00,
        pfContribution: 1800.00,
        tds: 500.00,
        professionalTax: 200.00,
        otherDeductions: 0.00,
        currency: 'INR',
        effectiveFrom: new Date(),
        isActive: true
      });
      employee.salaryStructure = salaryStructure;
    }

    return user;
  }

  /**
   * Create admin user with token
   */
  async createAdminUser() {
    const admin = await this.createTestUser('admin', true);
    const token = this.generateToken(admin);
    return { user: admin, token };
  }

  /**
   * Create HR user with token
   */
  async createHRUser() {
    const hr = await this.createTestUser('hr', true);
    const token = this.generateToken(hr);
    return { user: hr, token };
  }

  /**
   * Create manager user with token
   */
  async createManagerUser() {
    const manager = await this.createTestUser('manager', true);
    const token = this.generateToken(manager);
    return { user: manager, token };
  }

  /**
   * Create regular employee user with token
   */
  async createEmployeeUser() {
    const employee = await this.createTestUser('employee', true);
    const token = this.generateToken(employee);
    return { user: employee, token };
  }

  /**
   * Create department
   */
  async createDepartment(data = {}) {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Dept ${timestamp}`,
      code: `TD${timestamp.toString().slice(-4)}`,
      description: 'Test Department'
    };
    return await db.Department.create({ ...defaultData, ...data });
  }

  /**
   * Create position
   */
  async createPosition(data = {}) {
    const timestamp = Date.now();
    
    // Create department if not provided
    if (!data.departmentId) {
      const department = await this.createDepartment();
      data.departmentId = department.id;
    }
    
    const defaultData = {
      title: `Test Position ${timestamp}`,
      code: `TP${timestamp.toString().slice(-4)}`,
      description: 'Test Position'
    };
    return await db.Position.create({ ...defaultData, ...data });
  }

  /**
   * Create project
   */
  async createProject(data = {}) {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Project ${timestamp}`,
      code: `PRJ${timestamp.toString().slice(-4)}`,
      description: 'Test Project',
      status: 'Active',
      startDate: new Date()
    };
    return await db.Project.create({ ...defaultData, ...data });
  }

  /**
   * Create task
   */
  async createTask(data = {}) {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Task ${timestamp}`,
      description: 'Test Task',
      status: 'Not Started'  // Valid enum value
    };
    return await db.Task.create({ ...defaultData, ...data });
  }

  /**
   * Create leave type
   */
  async createLeaveType(data = {}) {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Leave ${timestamp}`,
      code: `TL${timestamp.toString().slice(-4)}`,
      defaultDays: 10,
      carryForward: false
    };
    return await db.LeaveType.create({ ...defaultData, ...data });
  }

  /**
   * Create holiday
   */
  async createHoliday(data = {}) {
    const timestamp = Date.now();
    const defaultDate = data.date ? new Date(data.date) : new Date();

    const defaultData = {
      name: data.name || `Test Holiday ${timestamp}`,
      date: defaultDate,
      type: data.type || 'public',
      year: data.year || defaultDate.getFullYear(),
      isRecurring: data.isRecurring !== undefined ? data.isRecurring : false,
      description: data.description || 'Test Holiday',
      isActive: data.isActive !== undefined ? data.isActive : true
    };

    return await db.Holiday.create(defaultData);
  }

  /**
   * Create employee review
   */
  async createEmployeeReview(data = {}) {
    const timestamp = Date.now();
    const rand = Math.floor(Math.random() * 10000);
    const defaultData = {
      reviewPeriod: data.reviewPeriod || `${timestamp}-R${rand}`,
      reviewType: data.reviewType || 'quarterly',
      overallRating: data.overallRating || 4,
      status: data.status || 'draft'
    };

    return await db.EmployeeReview.create({ ...defaultData, ...data });
  }

  /**
   * Create attendance record
   */
  async createAttendance(data = {}) {
    const defaultData = {
      date: data.date || new Date().toISOString().split('T')[0],
      checkIn: data.checkIn || new Date(),
      status: data.status || 'present'
    };

    return await db.Attendance.create({ ...defaultData, ...data });
  }

  /**
   * API request helper with authentication
   */
  async apiRequest(method, endpoint, token, data = null) {
    const req = request(this.app)[method](endpoint)
      .set('Authorization', `Bearer ${token}`);
    
    if (data) {
      req.send(data);
    }
    
    return await req;
  }

  /**
   * Cleanup all test data
   */
  async cleanup() {
    // Delete in reverse order of dependencies
    await db.Timesheet.destroy({ where: {}, force: true });
    await db.LeaveRequest.destroy({ where: {}, force: true });
    await db.LeaveBalance.destroy({ where: {}, force: true });
    await db.Holiday.destroy({ where: {}, force: true });
    await db.Attendance.destroy({ where: {}, force: true });
    await db.EmployeeReview.destroy({ where: {}, force: true });
    await db.Task.destroy({ where: {}, force: true });
    await db.Project.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.LeaveType.destroy({ where: {}, force: true });

    this.testUsers = [];
    this.testEmployees = [];
  }

  /**
   * Expect success response
   */
  expectSuccess(response, statusCode = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(true);
    return response.body;
  }

  /**
   * Expect error response
   */
  expectError(response, statusCode, messagePattern = null) {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(false);
    if (messagePattern) {
      expect(response.body.message).toMatch(messagePattern);
    }
    return response.body;
  }

  /**
   * Expect validation error
   */
  expectValidationError(response, field = null) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    if (field) {
      expect(response.body.errors).toBeDefined();
      const fieldError = response.body.errors.find(e => e.field === field);
      expect(fieldError).toBeDefined();
    }
    return response.body;
  }
}

module.exports = TestHelper;
