/**
 * Employee Controller
 * Handles HTTP layer for employee-related operations
 * 
 * Responsibilities:
 * - Validate HTTP requests
 * - Call appropriate service methods
 * - Format responses using ApiResponse
 * - Handle errors gracefully
 * 
 * @module controllers/employeeController
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const { employeeDataService } = require('../services/data');
const { employeeBusinessService } = require('../services/business'); // Phase 2: Business logic
const ApiResponse = require('../utils/ApiResponse');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

/**
 * Get all employees with pagination and filtering
 * @route GET /api/employees
 * @access Private (All authenticated users)
 * @description Employees see only themselves, managers see their team, admin/HR see all
 */
exports.getAll = async (req, res, next) => {
  try {
    // Build Sequelize-compatible order array
    const sortField = req.query.sort || 'firstName';
    const sortDirection = (req.query.order || 'ASC').toUpperCase();
    
    // RBAC: Regular employees can only see themselves
    let whereFilter = {};
    if (req.userRole === 'employee' && req.employeeId) {
      whereFilter.id = req.employeeId;
    }

    // Server-side filters — build into Sequelize where clause
    if (req.query.status) {
      whereFilter.status = req.query.status;
    }
    const deptId = req.query.department || req.query.departmentId;
    if (deptId) {
      whereFilter.departmentId = deptId;
    }
    if (req.query.employmentType) {
      whereFilter.employmentType = req.query.employmentType;
    }
    if (req.query.workLocation) {
      whereFilter.workLocation = req.query.workLocation;
    }

    // Search across name, email, employeeId
    if (req.query.search) {
      const { Op } = require('sequelize');
      const searchTerm = `%${req.query.search}%`;
      whereFilter[Op.or] = [
        { firstName: { [Op.iLike]: searchTerm } },
        { lastName: { [Op.iLike]: searchTerm } },
        { email: { [Op.iLike]: searchTerm } },
        { employeeId: { [Op.iLike]: searchTerm } }
      ];
    }

    const result = await employeeDataService.findAllWithDetails({
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      order: [[sortField, sortDirection]],
      where: whereFilter
    });

    res.json(ApiResponse.paginated(
      result.data,
      result.pagination,
      'Employees retrieved successfully'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee by ID
 * @route GET /api/employees/:id
 * @access Private (Owner, Manager, Admin, HR)
 */
exports.getById = async (req, res, next) => {
  try {
    const employee = await employeeDataService.findByIdWithDetails(req.params.id);
    
    if (!employee) {
      return res.status(404).json(ApiResponse.error('Employee not found', 404));
    }

    // RBAC: Employees can only view their own profile
    if (req.userRole === 'employee' && req.employeeId !== req.params.id) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }

    res.json(ApiResponse.success(employee, 'Employee retrieved successfully'));
  } catch (error) {
    // If it's already a 404 error from service, pass it through
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json(ApiResponse.error(error.message, 404));
    }
    next(error);
  }
};

/**
 * Create new employee
 * @route POST /api/employees
 * @access Private (Admin, HR)
 */
exports.create = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles all logic: validation, user creation, salary, leave balances
    const employee = await employeeBusinessService.createEmployee({
      data: req.validatedData || req.body,
      photo: req.file,
      user: req.user
    });

    res.status(201).json(ApiResponse.success(
      employee,
      'Employee created successfully'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Update employee
 * @route PUT /api/employees/:id
 * @access Private (Owner - limited fields, Admin/HR - all fields)
 */
exports.update = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles validation, RBAC, and email sync
    const employee = await employeeBusinessService.updateEmployee(
      req.params.id,
      req.validatedData || req.body,
      req.user
    );

    res.json(ApiResponse.success(
      employee,
      'Employee updated successfully'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (deactivate) employee
 * @route DELETE /api/employees/:id
 * @access Private (Admin, HR)
 */
exports.delete = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles termination workflow (status + user deactivation)
    const employee = await employeeBusinessService.terminateEmployee(
      req.params.id,
      req.user
    );

    res.json(ApiResponse.success(
      employee,
      'Employee terminated successfully'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee by employee ID (not UUID)
 * @route GET /api/employees/by-employee-id/:employeeId
 * @access Private
 */
exports.getByEmployeeId = async (req, res, next) => {
  try {
    const employee = await employeeDataService.findByEmployeeId(req.params.employeeId);
    
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    res.json(ApiResponse.success(employee, 'Employee retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Search employees
 * @route GET /api/employees/search
 * @access Private
 */
exports.search = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    if (!search) {
      return res.status(400).json(ApiResponse.error('Search term is required', 400));
    }

    const result = await employeeDataService.searchEmployees(search, { page, limit });

    res.json(ApiResponse.paginated(
      result.data,
      result.pagination,
      'Search results retrieved'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get employee statistics
 * @route GET /api/employees/statistics
 * @access Private (Admin, HR)
 */
exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await employeeDataService.getEmployeeStats();

    res.json(ApiResponse.success(stats, 'Statistics retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's employee profile
 * @route GET /api/employees/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    // req.user populated by auth middleware
    const employee = await employeeDataService.findOne({ userId: req.user.id });
    
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    // Get full details
    const fullEmployee = await employeeDataService.findByIdWithDetails(employee.id);

    res.json(ApiResponse.success(fullEmployee, 'Profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees by department
 * @route GET /api/employees/department/:departmentId
 * @access Private
 */
exports.getByDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await employeeDataService.findByDepartment(departmentId, { page, limit });

    res.json(ApiResponse.paginated(
      result.data,
      result.pagination,
      'Department employees retrieved'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees by position
 * @route GET /api/employees/position/:positionId
 * @access Private
 */
exports.getByPosition = async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await employeeDataService.findByPosition(positionId, { page, limit });

    res.json(ApiResponse.paginated(
      result.data,
      result.pagination,
      'Position employees retrieved'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get manager's team members
 * @route GET /api/employees/manager/:managerId/team
 * @access Private (Manager, Admin, HR)
 */
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { managerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await employeeDataService.getSubordinates(managerId);

    res.json(ApiResponse.success(result, 'Team members retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Upload employee photo
 * @route POST /api/employees/:id/photo
 * @access Private (Admin, HR)
 */
exports.uploadPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No photo file provided', 400));
    }

    const photoUrl = `/uploads/employee-photos/${req.file.filename}`;

    // Update employee with photo URL
    await employeeDataService.update(id, { photoUrl });

    res.json(ApiResponse.success(
      { photoUrl },
      'Photo uploaded successfully'
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Update employee compensation
 * @route PUT /api/employees/:id/compensation
 * @access Private (Admin, HR)
 */
exports.updateCompensation = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles RBAC validation and salary structure updates
    const employee = await employeeBusinessService.updateCompensation(
      req.params.id,
      req.validatedData || req.body,
      req.user
    );

    res.json(ApiResponse.success(
      employee,
      'Compensation updated successfully'
    ));
  } catch (error) {
    next(error);
  }
};

// Export all controller methods
module.exports = exports;
