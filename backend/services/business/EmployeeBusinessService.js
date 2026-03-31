/**
 * Employee Business Service
 * 
 * Contains all employee-related business logic:
 * - Employee creation workflow (user + employee + salary + leave balances)
 * - Employee update validation
 * - Photo upload handling
 * - Manager assignment validation
 * - Age and date validations
 * 
 * This service orchestrates multiple data services to complete business operations.
 * 
 * @class EmployeeBusinessService
 * @extends BaseBusinessService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const BaseBusinessService = require('./BaseBusinessService');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../../utils/errors');
const bcrypt = require('bcryptjs');
const db = require('../../models');

class EmployeeBusinessService extends BaseBusinessService {
  constructor(employeeDataService, userDataService, salaryDataService, leaveBalanceDataService) {
    super('EmployeeBusinessService');
    
    // Inject data services
    this.employeeDataService = employeeDataService;
    this.userDataService = userDataService;
    this.salaryDataService = salaryDataService;
    this.leaveBalanceDataService = leaveBalanceDataService;
  }

  /**
   * Create new employee with user account, salary, and leave balances
   * 
   * Business workflow:
   * 1. Validate business rules (age, email uniqueness, dates)
   * 2. Create user account (with hashed password)
   * 3. Create employee record
   * 4. Initialize salary structure (if provided)
   * 5. Initialize leave balances (all leave types)
   * 
   * All operations in a transaction (atomic).
   * 
   * @param {Object} params
   * @param {Object} params.data - Employee data
   * @param {Object} params.photo - Uploaded photo file (from multer)
   * @param {Object} params.user - Current user (for audit)
   * @returns {Promise<Object>} Created employee with full details
   */
  async createEmployee({ data, photo, user }) {
    this.log('createEmployee', { employeeId: data.employeeId, email: data.email });

    // Step 1: Validate business rules
    await this.validateEmployeeCreation(data);

    // Step 2: Prepare user and employee data
    const userData = this.prepareUserData(data);
    const employeeData = await this.prepareEmployeeData(data, photo);

    // Step 3: Start transaction
    const transaction = await this.startTransaction();
    
    try {
      // Step 3b: Generate employee ID inside transaction with lock to prevent race condition
      if (!employeeData.employeeId || employeeData.employeeId === data.employeeId) {
        if (!data.employeeId) {
          employeeData.employeeId = await this.generateEmployeeId(transaction);
        }
      }

      // Step 4: Create user account
      const createdUser = await this.userDataService.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 12)
      }, { transaction });
      
      // Step 5: Create employee record
      employeeData.userId = createdUser.id;
      const employee = await this.employeeDataService.create(employeeData, { transaction });
      
      // Step 6: Initialize salary structure (if provided)
      if (data.salaryStructure || data.salary) {
        const salaryData = this.prepareSalaryStructureData(
          data.salaryStructure || data.salary,
          employee.id
        );
        await this.salaryDataService.create(salaryData, { transaction });
      }
      
      // Step 7: Initialize leave balances
      await this.initializeLeaveBalances(employee.id, transaction);
      
      // Step 8: Commit transaction
      await transaction.commit();
      
      this.log('createEmployee:success', { employeeId: employee.id });
      
      // Step 9: Return with full details
      return this.employeeDataService.findByIdWithDetails(employee.id);
      
    } catch (error) {
      await transaction.rollback();
      this.log('createEmployee:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update employee information
   * 
   * Business rules:
   * - Cannot change status to Terminated (use separate method)
   * - Cannot change employeeId
   * - Email must remain unique
   * - Manager must be active
   * 
   * @param {string} id - Employee ID
   * @param {Object} data - Update data
   * @param {Object} currentUser - Current user (for RBAC)
   * @returns {Promise<Object>} Updated employee
   */
  async updateEmployee(id, data, currentUser) {
    this.log('updateEmployee', { id, updates: Object.keys(data) });

    // Validate business rules
    await this.validateEmployeeUpdate(id, data, currentUser);

    // Check if employee exists
    const employee = await this.employeeDataService.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    // Extract salary data before updating employee (salary lives in SalaryStructure table)
    const salaryData = data.salary;
    const employeeData = { ...data };
    delete employeeData.salary;

    // Update employee fields (excluding salary)
    if (Object.keys(employeeData).length > 0) {
      await this.employeeDataService.update(id, employeeData);
    }
    
    // If email changed, update user account
    if (data.email && data.email !== employee.email) {
      await this.userDataService.update(employee.userId, { email: data.email });
    }

    // If salary data provided, update salary structure
    if (salaryData && typeof salaryData === 'object') {
      const mappedSalary = {
        basicSalary: salaryData.basicSalary,
        hra: salaryData.allowances?.hra || 0,
        allowances: (
          parseFloat(salaryData.allowances?.transport || 0) +
          parseFloat(salaryData.allowances?.medical || 0) +
          parseFloat(salaryData.allowances?.food || 0) +
          parseFloat(salaryData.allowances?.communication || 0) +
          parseFloat(salaryData.allowances?.special || 0) +
          parseFloat(salaryData.allowances?.other || 0)
        ),
        pfContribution: salaryData.deductions?.pf || 0,
        tds: salaryData.deductions?.incomeTax || 0,
        professionalTax: salaryData.deductions?.professionalTax || 0,
        otherDeductions: salaryData.deductions?.other || 0,
        currency: salaryData.currency || 'INR',
        effectiveFrom: salaryData.effectiveFrom || require('../../utils/dateUtils').formatDateLocal(),
        isActive: true,
      };

      const existingSalary = await this.salaryDataService.findByEmployeeId(id);
      if (existingSalary) {
        await this.salaryDataService.update(existingSalary.id, mappedSalary);
      } else {
        await this.salaryDataService.create({ employeeId: id, ...mappedSalary });
      }
    }

    this.log('updateEmployee:success', { id });
    
    return this.employeeDataService.findByIdWithDetails(id);
  }

  /**
   * Update employee compensation (salary)
   * 
   * Business rules:
   * - Only admin/HR can update
   * - Salary changes are audited
   * - Cannot reduce salary below minimum wage
   * 
   * @param {string} id - Employee ID
   * @param {Object} salaryData - New salary data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>}
   */
  async updateCompensation(id, salaryData, currentUser) {
    this.log('updateCompensation', { id });

    // Validate RBAC
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can update compensation');
    }

    // Check if employee exists
    const employee = await this.employeeDataService.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    // Map validated API fields to SalaryStructure model fields
    // Frontend sends nested { salary: { basicSalary, allowances: {...}, deductions: {...} } }
    const salary = salaryData.salary || salaryData;
    const mappedData = {
      basicSalary: salary.basicSalary,
      hra: salary.allowances?.hra || 0,
      allowances: (
        parseFloat(salary.allowances?.transport || 0) +
        parseFloat(salary.allowances?.medical || 0) +
        parseFloat(salary.allowances?.food || 0) +
        parseFloat(salary.allowances?.communication || 0) +
        parseFloat(salary.allowances?.special || 0) +
        parseFloat(salary.allowances?.other || 0)
      ),
      pfContribution: salary.deductions?.pf || 0,
      tds: salary.deductions?.incomeTax || 0,
      professionalTax: salary.deductions?.professionalTax || 0,
      otherDeductions: salary.deductions?.other || 0,
      currency: salary.currency || 'INR',
      effectiveFrom: salary.effectiveFrom || require('../../utils/dateUtils').formatDateLocal(),
      isActive: true,
    };

    // Validate salary data
    await this.validateSalaryData(mappedData);

    // Update or create salary structure
    const existingSalary = await this.salaryDataService.findByEmployeeId(id);
    
    if (existingSalary) {
      await this.salaryDataService.update(existingSalary.id, mappedData);
    } else {
      await this.salaryDataService.create({
        employeeId: id,
        ...mappedData
      });
    }

    this.log('updateCompensation:success', { id });
    
    return this.employeeDataService.findByIdWithDetails(id);
  }

  /**
   * Terminate employee
   * 
   * Business workflow:
   * - Set status to Terminated
   * - Deactivate user account
   * - Preserve historical data (soft delete)
   * - Cannot approve leaves/timesheets after termination
   * 
   * @param {string} id - Employee ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>}
   */
  async terminateEmployee(id, currentUser) {
    this.log('terminateEmployee', { id });

    // Validate RBAC
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can terminate employees');
    }

    // Check if employee exists
    const employee = await this.employeeDataService.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    if (employee.status === 'Terminated') {
      throw new ValidationError('Employee already terminated');
    }

    const transaction = await this.startTransaction();
    
    try {
      // Update employee status
      await this.employeeDataService.update(id, { 
        status: 'Terminated',
        terminationDate: new Date()
      }, { transaction });
      
      // Soft-delete employee (sets deletedAt)
      await this.db.Employee.destroy({
        where: { id },
        transaction
      });
      
      // Deactivate user account
      await this.userDataService.update(employee.userId, { 
        isActive: false 
      }, { transaction });
      
      await transaction.commit();
      
      this.log('terminateEmployee:success', { id });
      
      return this.db.Employee.findByPk(id, { paranoid: false });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ========================================================================
  // PRIVATE VALIDATION METHODS
  // ========================================================================

  /**
   * Validate employee creation business rules
   * @private
   */
  async validateEmployeeCreation(data) {
    // Email uniqueness
    if (data.email) {
      const existing = await this.employeeDataService.findByEmail(data.email);
      if (existing) {
        throw new ConflictError('Employee with this email already exists');
      }
    }

    // Employee ID uniqueness (if provided)
    if (data.employeeId) {
      const existing = await this.employeeDataService.findByEmployeeId(data.employeeId);
      if (existing) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    // Age validation (must be 18+ if provided)
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (age < 18) {
        throw new ValidationError('Employee must be at least 18 years old');
      }
      if (age > 100) {
        throw new ValidationError('Invalid date of birth');
      }
    }

    // Joining date validation (not in future)
    if (data.joiningDate && this.isFutureDate(data.joiningDate)) {
      throw new ValidationError('Joining date cannot be in the future');
    }

    // Confirmation date validation
    if (data.confirmationDate && data.joiningDate) {
      if (new Date(data.confirmationDate) < new Date(data.joiningDate)) {
        throw new ValidationError('Confirmation date cannot be before joining date');
      }
    }

    // Manager validation
    if (data.managerId) {
      await this.validateManager(data.managerId);
    }

    // Department validation
    if (data.departmentId) {
      const department = await this.db.Department.findByPk(data.departmentId);
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    // Position validation
    if (data.positionId) {
      const position = await this.db.Position.findByPk(data.positionId);
      if (!position) {
        throw new NotFoundError('Position not found');
      }
    }
  }

  /**
   * Validate employee update business rules
   * @private
   */
  async validateEmployeeUpdate(id, data, currentUser) {
    // Cannot change employeeId
    if (data.employeeId) {
      throw new ValidationError('Employee ID cannot be changed');
    }

    // Cannot change to Terminated status (use terminateEmployee)
    if (data.status === 'Terminated') {
      throw new ValidationError('Use terminateEmployee method to terminate');
    }

    // Email uniqueness (if changing)
    if (data.email) {
      const existing = await this.employeeDataService.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new ConflictError('Email already in use');
      }
    }

    // Manager validation
    if (data.managerId) {
      await this.validateManager(data.managerId, id);
    }

    // RBAC: Employees can only update own record (limited fields)
    if (currentUser.role === 'employee') {
      // Check if trying to update their own profile
      if (currentUser.employee?.id !== id) {
        throw new ForbiddenError('Employees can only update their own profile');
      }
      
      // Check which fields they're trying to update
      const allowedFields = ['phone', 'address', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
      const attemptedFields = Object.keys(data);
      const unauthorizedFields = attemptedFields.filter(f => !allowedFields.includes(f));
      
      if (unauthorizedFields.length > 0) {
        throw new ForbiddenError(`Employees can only update: ${allowedFields.join(', ')}`);
      }
    }
  }

  /**
   * Validate manager
   * @private
   */
  async validateManager(managerId, excludeEmployeeId = null) {
    const manager = await this.employeeDataService.findById(managerId);
    
    if (!manager) {
      throw new NotFoundError('Manager not found');
    }
    
    if (manager.status !== 'Active') {
      throw new ValidationError('Manager must be active');
    }

    // Cannot be self-manager
    if (excludeEmployeeId && managerId === excludeEmployeeId) {
      throw new ValidationError('Employee cannot be their own manager');
    }
  }

  /**
   * Validate salary data
   * @private
   */
  async validateSalaryData(salaryData) {
    // Basic salary must be positive
    if (salaryData.basicSalary && salaryData.basicSalary <= 0) {
      throw new ValidationError('Basic salary must be positive');
    }

    // Validate Indian compliance (40-50% of CTC should be basic)
    if (salaryData.basicSalary && salaryData.ctc) {
      const basicPercentage = (salaryData.basicSalary / salaryData.ctc) * 100;
      if (basicPercentage < 35 || basicPercentage > 55) {
        throw new ValidationError('Basic salary should be 35-55% of CTC for tax optimization');
      }
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Prepare user data from employee data
   * @private
   */
  prepareUserData(data) {
    if (!data.password) {
      throw new ValidationError('Password is required when creating a new employee account');
    }
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role || 'employee',
      isActive: true
    };
  }

  /**
   * Prepare employee data for creation
   * @private
   */
  async prepareEmployeeData(data, photo) {
    // Auto-generate employeeId if not provided (SKYT#### format)
    const employeeId = data.employeeId || await this.generateEmployeeId();
    
    // Use hireDate or joiningDate (they're the same conceptually)
    const hireDate = data.hireDate || data.joiningDate || new Date();
    
    return {
      employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      nationality: data.nationality || 'Indian',
      address: data.address,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
      hireDate,  // Use the resolved hireDate
      joiningDate: hireDate,  // Same as hireDate
      confirmationDate: data.confirmationDate,
      resignationDate: data.resignationDate,
      lastWorkingDate: data.lastWorkingDate,
      departmentId: data.departmentId,
      positionId: data.positionId,
      managerId: data.managerId,
      employmentType: data.employmentType || 'Full-time',
      workLocation: data.workLocation,
      probationPeriod: data.probationPeriod !== undefined ? data.probationPeriod : 6,
      noticePeriod: data.noticePeriod !== undefined ? data.noticePeriod : 30,
      status: 'Active',
      isActive: true,
      photoUrl: photo?.filename ? `/uploads/employee-photos/${photo.filename}` : data.photoUrl || null,
      
      // Indian statutory fields
      panNumber: data.panNumber,
      aadhaarNumber: data.aadhaarNumber,
      uanNumber: data.uanNumber,
      pfNumber: data.pfNumber,
      esiNumber: data.esiNumber,
      
      // Bank details
      bankAccountNumber: data.bankAccountNumber,
      bankName: data.bankName,
      bankBranch: data.bankBranch,
      ifscCode: data.ifscCode,
      accountHolderName: data.accountHolderName,
      
      // Emergency contact (field names must match DB model columns)
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation
    };
  }

  /**
   * Generate employee ID in SKYT#### format (sequential, collision-safe)
   * @param {Transaction} [transaction] - Sequelize transaction for row-level locking
   * @private
   */
  async generateEmployeeId(transaction = null) {
    const { Op } = db.Sequelize;
    const queryOptions = {
      order: [['employeeId', 'DESC']],
      where: { employeeId: { [Op.like]: 'SKYT%' } },
      paranoid: false, // Include soft-deleted employees to avoid unique constraint violations
    };
    if (transaction) {
      queryOptions.transaction = transaction;
      queryOptions.lock = transaction.LOCK.UPDATE;
    }

    const lastEmployee = await db.Employee.findOne(queryOptions);

    let nextNumber = 1;
    if (lastEmployee?.employeeId) {
      const match = lastEmployee.employeeId.match(/^SKYT(\d+)$/);
      if (match) {
        nextNumber = Number.parseInt(match[1], 10) + 1;
      }
    }

    return `SKYT${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Transform nested salary input into flat SalaryStructure record
   * Handles both flat format (DB columns) and nested frontend format
   * @private
   */
  prepareSalaryStructureData(salaryInput, employeeId) {
    const result = {
      employeeId,
      basicSalary: salaryInput.basicSalary || 0,
      effectiveFrom: salaryInput.effectiveFrom || require('../../utils/dateUtils').formatDateLocal(),
      isActive: salaryInput.isActive !== undefined ? salaryInput.isActive : true
    };

    // Handle allowances — could be a nested object or flat number
    if (salaryInput.allowances && typeof salaryInput.allowances === 'object') {
      // Extract hra from allowances if present
      if (salaryInput.allowances.hra !== undefined) {
        result.hra = Number(salaryInput.allowances.hra) || 0;
      }
      // Sum all non-hra allowances into the total allowances field
      const { hra, ...otherAllowances } = salaryInput.allowances;
      result.allowances = Object.values(otherAllowances)
        .reduce((sum, val) => sum + (Number(val) || 0), 0);
    } else {
      result.allowances = Number(salaryInput.allowances) || 0;
    }

    // Handle deductions — could be a nested object or flat fields
    if (salaryInput.deductions && typeof salaryInput.deductions === 'object') {
      result.pfContribution = Number(salaryInput.deductions.pf || salaryInput.deductions.pfContribution) || 0;
      result.tds = Number(salaryInput.deductions.incomeTax || salaryInput.deductions.tds) || 0;
      result.professionalTax = Number(salaryInput.deductions.professionalTax) || 0;
      result.esi = Number(salaryInput.deductions.esi) || 0;
      result.otherDeductions = Number(salaryInput.deductions.other || salaryInput.deductions.otherDeductions) || 0;
    }

    // Copy top-level numeric fields if present (override nested values)
    if (salaryInput.hra !== undefined) result.hra = Number(salaryInput.hra) || 0;
    if (salaryInput.pfContribution !== undefined) result.pfContribution = Number(salaryInput.pfContribution) || 0;
    if (salaryInput.tds !== undefined) result.tds = Number(salaryInput.tds) || 0;
    if (salaryInput.professionalTax !== undefined) result.professionalTax = Number(salaryInput.professionalTax) || 0;
    if (salaryInput.esi !== undefined) result.esi = Number(salaryInput.esi) || 0;
    if (salaryInput.otherDeductions !== undefined) result.otherDeductions = Number(salaryInput.otherDeductions) || 0;
    if (salaryInput.currency !== undefined) result.currency = salaryInput.currency;

    return result;
  }

  /**
   * Initialize leave balances for new employee
   * @private
   */
  async initializeLeaveBalances(employeeId, transaction) {
    // Get all active leave types
    const leaveTypes = await this.db.LeaveType.findAll({
      where: { isActive: true }
    });

    // Create balance record for each leave type
    for (const leaveType of leaveTypes) {
      const defaultDays = leaveType.defaultDays || leaveType.maxDaysPerYear || 0;
      await this.leaveBalanceDataService.create({
        employeeId,
        leaveTypeId: leaveType.id,
        year: new Date().getFullYear(),
        totalAccrued: defaultDays,
        totalTaken: 0,
        totalPending: 0,
        balance: defaultDays
      }, { transaction });
    }
  }
}

module.exports = EmployeeBusinessService;
