const BaseService = require('./BaseService');
const db = require('../models');
const { Employee, Department, Position, User } = db;

class EmployeeService extends BaseService {
  constructor() {
    super(Employee);
  }

  async findAllWithDetails(options = {}) {
    const includeOptions = [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'description']
      },
      {
        model: Position,
        as: 'position',
        attributes: ['id', 'title', 'description']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'isActive', 'lastLoginAt']
      },
      {
        model: Employee,
        as: 'manager',
        attributes: ['id', 'employeeId', 'firstName', 'lastName'],
        required: false
      },
      {
        model: db.SalaryStructure,
        as: 'salaryStructure',
        where: { isActive: true },
        required: false
      }
    ];

    return super.findAll({
      ...options,
      include: includeOptions
    });
  }

  async findByIdWithDetails(id) {
    const includeOptions = [
      {
        model: Department,
        as: 'department'
      },
      {
        model: Position,
        as: 'position'
      },
      {
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      },
      {
        model: Employee,
        as: 'manager',
        attributes: ['id', 'employeeId', 'firstName', 'lastName']
      },
      {
        model: db.SalaryStructure,
        as: 'salaryStructure',
        where: { isActive: true },
        required: false
      }
    ];

    return super.findById(id, includeOptions);
  }

  async findByEmployeeId(employeeId) {
    return super.findOne({ employeeId });
  }

  async findByEmail(email) {
    return super.findOne({ email });
  }

  async findByDepartment(departmentId, options = {}) {
    return super.findAll({
      ...options,
      where: { departmentId }
    });
  }

  async findByPosition(positionId, options = {}) {
    return super.findAll({
      ...options,
      where: { positionId }
    });
  }

  async getSubordinates(managerId) {
    return super.findAll({
      where: { managerId }
    });
  }

  async searchEmployees(searchTerm, options = {}) {
    const where = {
      [db.Sequelize.Op.or]: [
        {
          firstName: {
            [db.Sequelize.Op.iLike]: `%${searchTerm}%`
          }
        },
        {
          lastName: {
            [db.Sequelize.Op.iLike]: `%${searchTerm}%`
          }
        },
        {
          email: {
            [db.Sequelize.Op.iLike]: `%${searchTerm}%`
          }
        },
        {
          employeeId: {
            [db.Sequelize.Op.iLike]: `%${searchTerm}%`
          }
        }
      ]
    };

    return super.findAll({
      ...options,
      where
    });
  }

  async validateUniqueFields(data, excludeId = null) {
    const conditions = [];

    if (data.email) {
      conditions.push({ email: data.email });
    }

    if (data.employeeId) {
      conditions.push({ employeeId: data.employeeId });
    }

    if (conditions.length === 0) {
      return { isValid: true };
    }

    const where = {
      [db.Sequelize.Op.or]: conditions
    };

    if (excludeId) {
      where.id = {
        [db.Sequelize.Op.ne]: excludeId
      };
    }

    const existingEmployee = await super.findOne(where);

    if (existingEmployee) {
      let conflictField = '';
      if (existingEmployee.email === data.email) {
        conflictField = 'email';
      } else if (existingEmployee.employeeId === data.employeeId) {
        conflictField = 'employeeId';
      }

      return {
        isValid: false,
        conflictField,
        message: `An employee with this ${conflictField} already exists`
      };
    }

    return { isValid: true };
  }

  async createWithValidation(data) {
    // Validate unique fields
    const validation = await this.validateUniqueFields(data);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Generate employee ID if not provided
    if (!data.employeeId) {
      data.employeeId = await this.generateEmployeeId();
    }

    return super.create(data);
  }

  async updateWithValidation(id, data) {
    // Validate unique fields (excluding current record)
    const validation = await this.validateUniqueFields(data, id);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    return super.update(id, data);
  }

  async generateEmployeeId(transaction = null) {
    // Find last SKYT employee ID with lock to prevent race condition
    // Use CAST to numeric ordering so SKYT10000 sorts after SKYT9999
    const queryOptions = {
      order: [[db.Sequelize.literal("CAST(SUBSTRING(\"employeeId\" FROM 5) AS INTEGER)"), 'DESC']],
      where: {
        employeeId: {
          [db.Sequelize.Op.like]: 'SKYT%'
        }
      },
      paranoid: false, // Include soft-deleted employees to avoid unique constraint violations
    };
    if (transaction) {
      queryOptions.transaction = transaction;
      queryOptions.lock = transaction.LOCK.UPDATE;
    }

    const lastEmployee = await Employee.findOne(queryOptions);

    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employeeId) {
      // Extract numeric part from SKYT#### format
      const match = lastEmployee.employeeId.match(/^SKYT(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Always generate with exactly 4 digits (SKYT0001, SKYT0002, etc.)
    return `SKYT${nextNumber.toString().padStart(4, '0')}`;
  }

  async getEmployeeStats() {
    const totalEmployees = await super.count();
    const activeEmployees = await super.count({ status: 'Active' });
    const inactiveEmployees = await super.count({ status: 'Inactive' });
    const onLeaveEmployees = await super.count({ status: 'On Leave' });

    return {
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees,
      onLeave: onLeaveEmployees
    };
  }

  /**
   * Validate foreign key references (department, position, manager)
   * @param {Object} data - { departmentId, positionId, managerId }
   * @throws {Error} If FK validation fails
   */
  async validateForeignKeys(data) {
    const { departmentId, positionId, managerId } = data;

    if (departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        throw new Error('Invalid departmentId provided.');
      }
      if (department.isActive === false) {
        throw new Error('Department is inactive.');
      }
    }

    if (positionId) {
      const position = await Position.findByPk(positionId);
      if (!position) {
        throw new Error('Invalid positionId provided.');
      }
      if (position.isActive === false) {
        throw new Error('Position is inactive.');
      }
    }

    if (managerId) {
      const manager = await Employee.findByPk(managerId);
      if (!manager) {
        throw new Error('Invalid managerId provided.');
      }
      if (manager.status === 'Terminated') {
        throw new Error('Manager cannot be a terminated employee.');
      }
    }
  }

  /**
   * Create salary structure for employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} salaryData - Salary structure fields
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<SalaryStructure>} Created salary structure
   */
  async createSalaryStructure(employeeId, salaryData, transaction) {
    const SalaryStructure = db.SalaryStructure;

    // Handle both new format (with allowances/deductions objects) and legacy format
    if (salaryData.basicSalary) {
      const structureData = {
        employeeId,
        basicSalary: salaryData.basicSalary,
        effectiveFrom: salaryData.effectiveFrom || require('../utils/dateUtils').formatDateLocal(),
        isActive: true
      };

      // New format: { basicSalary, allowances: {hra, transport, ...}, deductions: {pf, ...} }
      if (salaryData.allowances && typeof salaryData.allowances === 'object') {
        structureData.hra = salaryData.allowances.hra || 0;
        // Calculate total allowances (excluding HRA which has its own field)
        const totalAllowances = (salaryData.allowances.transport || 0) +
                               (salaryData.allowances.medical || 0) +
                               (salaryData.allowances.food || 0) +
                               (salaryData.allowances.communication || 0) +
                               (salaryData.allowances.special || 0) +
                               (salaryData.allowances.other || 0);
        structureData.allowances = totalAllowances;
      }

      if (salaryData.deductions && typeof salaryData.deductions === 'object') {
        structureData.pfContribution = salaryData.deductions.pf || salaryData.deductions.pfContribution || 0;
        structureData.tds = salaryData.deductions.incomeTax || salaryData.deductions.tds || 0;
        structureData.professionalTax = salaryData.deductions.professionalTax || 0;
        structureData.esi = salaryData.deductions.esi || 0;
        structureData.otherDeductions = salaryData.deductions.other || salaryData.deductions.otherDeductions || 0;
      }

      // Legacy format: { basicSalary, hra, allowances, pfContribution, ... }
      if (salaryData.hra !== undefined) structureData.hra = salaryData.hra;
      if (salaryData.allowances !== undefined && typeof salaryData.allowances === 'number') {
        structureData.allowances = salaryData.allowances;
      }
      if (salaryData.pfContribution !== undefined) structureData.pfContribution = salaryData.pfContribution;
      if (salaryData.tds !== undefined) structureData.tds = salaryData.tds;
      if (salaryData.professionalTax !== undefined) structureData.professionalTax = salaryData.professionalTax;
      if (salaryData.otherDeductions !== undefined) structureData.otherDeductions = salaryData.otherDeductions;

      return await SalaryStructure.create(structureData, { transaction });
    }

    return null;
  }

  /**
   * Create employee WITH User account (transaction-wrapped)
   * Handles: User creation, password hashing, photo upload, salary structure, leave balance initialization
   * @param {Object} employeeData - Employee fields
   * @param {Object} userData - User fields (email, password, role)
   * @param {string} photoFilename - Uploaded photo filename (optional)
   * @param {Object} salaryData - Salary structure (optional)
   * @returns {Promise<Employee>} Created employee with associations
   * @throws {Error} If email/employeeId exists or FK validation fails
   */
  async createEmployeeWithUser(employeeData, userData, photoFilename = null, salaryData = null) {
    const bcrypt = require('bcryptjs');
    const transaction = await db.sequelize.transaction();

    try {
      const { email, password } = userData;

      // Validate unique fields
      const existingEmployee = await Employee.findOne({ 
        where: { email }, 
        transaction 
      });
      if (existingEmployee) {
        throw new Error('An employee with this email already exists.');
      }

      if (employeeData.employeeId) {
        const existingById = await Employee.findOne({ 
          where: { employeeId: employeeData.employeeId }, 
          transaction 
        });
        if (existingById) {
          throw new Error(`An employee with ID '${employeeData.employeeId}' already exists.`);
        }
      }

      // Validate foreign keys
      await this.validateForeignKeys(employeeData);

      // Hash password — password is REQUIRED, no fallback to weak defaults
      if (!password) {
        throw new Error('Password is required when creating a new employee account.');
      }
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create User
      const user = await User.create({
        email,
        password: hashedPassword,
        role: userData.role || 'employee',
        firstName: employeeData.firstName,
        lastName: employeeData.lastName
      }, { transaction });

      // Generate employeeId if not provided
      let employeeId = employeeData.employeeId;
      if (!employeeId) {
        employeeId = await this.generateEmployeeId(transaction);
      }

      // Add photo URL if file uploaded
      if (photoFilename) {
        employeeData.photoUrl = `/uploads/employee-photos/${photoFilename}`;
      }

      // Create Employee
      const newEmployee = await Employee.create({
        ...employeeData,
        employeeId,
        email,
        userId: user.id,
        salary: salaryData || null
      }, { transaction });

      // Create salary structure if provided
      if (salaryData && salaryData.basicSalary) {
        await this.createSalaryStructure(newEmployee.id, salaryData, transaction);
      }

      // Initialize leave balances
      const LeaveType = db.LeaveType;
      const LeaveBalance = db.LeaveBalance;
      const leaveTypes = await LeaveType.findAll({ 
        where: { isActive: true }, 
        transaction 
      });
      const currentYear = new Date().getFullYear();

      for (const leaveType of leaveTypes) {
        await LeaveBalance.create({
          employeeId: newEmployee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          totalAccrued: leaveType.maxDaysPerYear,
          totalTaken: 0,
          totalPending: 0,
          balance: leaveType.maxDaysPerYear,
          carryForward: 0
        }, { transaction });
      }

      // Fetch employee with associations before commit
      const employeeWithDetails = await Employee.findByPk(newEmployee.id, {
        include: [{
          model: db.SalaryStructure,
          as: 'salaryStructure'
        }],
        transaction
      });

      await transaction.commit();
      return employeeWithDetails;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update employee status AND sync User.isActive
   * CRITICAL: Maintains Employee.status ↔ User.isActive consistency
   * @param {string} id - Employee UUID
   * @param {string} status - Active|Inactive|On Leave|Terminated
   * @returns {Promise<Employee>} Updated employee
   */
  async updateStatus(id, status) {
    const transaction = await db.sequelize.transaction();

    try {
      const employee = await Employee.findByPk(id, {
        include: [{ model: User, as: 'user' }],
        transaction
      });

      if (!employee) {
        throw new Error('Employee not found.');
      }

      // Update employee status
      await employee.update({ status }, { transaction });

      // Sync user active status
      // Only deactivate user if status is 'Terminated' or 'Inactive'
      // 'Active' and 'On Leave' should both keep user active
      if (employee.user) {
        const userShouldBeActive = (status === 'Active' || status === 'On Leave');
        await employee.user.update({ 
          isActive: userShouldBeActive
        }, { transaction });
      }

      await transaction.commit();
      return employee;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update compensation (salary, payGrade, payFrequency)
   * @param {string} id - Employee UUID
   * @param {Object} compensationData - { salary, payGrade, payFrequency }
   * @returns {Promise<Employee>} Updated employee
   */
  async updateCompensation(id, compensationData) {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new Error('Employee not found.');
    }

    return await employee.update(compensationData);
  }

  /**
   * Upload employee photo
   * @param {string} id - Employee UUID
   * @param {string} filename - Uploaded file name
   * @returns {Promise<Object>} { photoUrl, filename }
   */
  async uploadPhoto(id, filename) {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new Error('Employee not found.');
    }

    const photoUrl = `/uploads/employee-photos/${filename}`;
    await employee.update({ photoUrl });

    return { photoUrl, filename };
  }

  /**
   * Update employee WITH salary structure management
   * Deactivates old salary structure, creates new one
   * @param {string} id - Employee UUID
   * @param {Object} updateData - Employee fields to update
   * @param {Object} salaryData - New salary structure (optional)
   * @param {string} role - User role (for permission checks)
   * @returns {Promise<Employee>} Updated employee with salary structure
   */
  async updateEmployeeWithSalary(id, updateData, salaryData = null, role) {
    const transaction = await db.sequelize.transaction();

    try {
      const employee = await Employee.findByPk(id, { transaction });
      if (!employee) {
        throw new Error('Employee not found.');
      }

      // Filter updateData based on role
      if (role !== 'admin' && role !== 'hr') {
        delete updateData.departmentId;
        delete updateData.positionId;
        delete updateData.managerId;
        delete updateData.status;
        delete updateData.hireDate;
        delete updateData.salary;
      } else {
        // Validate FKs if provided
        await this.validateForeignKeys(updateData);
      }

      // Update employee
      await employee.update(updateData, { transaction });

      // Handle salary structure update
      if (salaryData && (role === 'admin' || role === 'hr')) {
        const SalaryStructure = db.SalaryStructure;
        
        // Find existing salary structure
        const existingSalaryStructure = await SalaryStructure.findOne({
          where: { employeeId: id },
          transaction
        });

        if (existingSalaryStructure) {
          // Update existing salary structure (hasOne relationship - one record per employee)
          const updateFields = {};
          if (salaryData.basicSalary !== undefined) updateFields.basicSalary = salaryData.basicSalary;
          if (salaryData.effectiveFrom !== undefined) updateFields.effectiveFrom = salaryData.effectiveFrom;
          if (salaryData.hra !== undefined) updateFields.hra = salaryData.hra;
          if (salaryData.allowances !== undefined && typeof salaryData.allowances === 'number') {
            updateFields.allowances = salaryData.allowances;
          }
          if (salaryData.pfContribution !== undefined) updateFields.pfContribution = salaryData.pfContribution;
          if (salaryData.tds !== undefined) updateFields.tds = salaryData.tds;
          if (salaryData.professionalTax !== undefined) updateFields.professionalTax = salaryData.professionalTax;
          if (salaryData.otherDeductions !== undefined) updateFields.otherDeductions = salaryData.otherDeductions;

          // Handle new format allowances/deductions objects
          if (salaryData.allowances && typeof salaryData.allowances === 'object') {
            updateFields.hra = salaryData.allowances.hra || existingSalaryStructure.hra || 0;
            const totalAllowances = (salaryData.allowances.transport || 0) +
                                   (salaryData.allowances.medical || 0) +
                                   (salaryData.allowances.food || 0) +
                                   (salaryData.allowances.communication || 0) +
                                   (salaryData.allowances.special || 0) +
                                   (salaryData.allowances.other || 0);
            updateFields.allowances = totalAllowances;
          }
          if (salaryData.deductions && typeof salaryData.deductions === 'object') {
            updateFields.pfContribution = salaryData.deductions.pf || salaryData.deductions.pfContribution || 0;
            updateFields.tds = salaryData.deductions.incomeTax || salaryData.deductions.tds || 0;
            updateFields.professionalTax = salaryData.deductions.professionalTax || 0;
            updateFields.esi = salaryData.deductions.esi || 0;
            updateFields.otherDeductions = salaryData.deductions.other || salaryData.deductions.otherDeductions || 0;
          }

          updateFields.isActive = true;
          await existingSalaryStructure.update(updateFields, { transaction });
        } else if (salaryData.basicSalary) {
          // Create new salary structure if none exists
          await this.createSalaryStructure(id, salaryData, transaction);
        }
      }

      // Fetch updated employee with salary structure
      const updatedEmployee = await Employee.findByPk(id, {
        include: [{
          model: db.SalaryStructure,
          as: 'salaryStructure',
          where: { isActive: true },
          required: false
        }],
        transaction
      });

      await transaction.commit();
      return updatedEmployee;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Soft delete employee (status=Terminated, user.isActive=false)
   * INCLUDES paranoid delete (sets deletedAt timestamp)
   * @param {string} id - Employee UUID
   * @returns {Promise<void>}
   */
  async deleteEmployee(id) {
    const transaction = await db.sequelize.transaction();

    try {
      const employee = await Employee.findByPk(id, {
        include: [{ model: User, as: 'user' }],
        transaction
      });

      if (!employee) {
        throw new Error('Employee not found.');
      }

      // Update status to Terminated
      await employee.update({ status: 'Terminated' }, { transaction });

      // Deactivate user account
      if (employee.user) {
        await employee.user.update({ isActive: false }, { transaction });
      }

      // Soft delete (paranoid mode sets deletedAt)
      await employee.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new EmployeeService();
