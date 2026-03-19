const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * EmployeeSearchService
 * 
 * Handles all employee search, filtering, and query operations.
 * Implements role-based access control for search results.
 * 
 * @class EmployeeSearchService
 */
class EmployeeSearchService {
  constructor(db) {
    this.db = db;
    this.Employee = db.Employee;
    this.Department = db.Department;
    this.Position = db.Position;
    this.User = db.User;
    this.sequelize = db.sequelize;
    this.Op = Op;
  }

  /**
   * Advanced search with filters, pagination, and role-based access
   * 
   * @param {Object} options - Search options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Results per page (default: 10)
   * @param {string} options.search - Search term (firstName, lastName, email)
   * @param {string} options.department - Department UUID filter
   * @param {string} options.status - Status filter
   * @param {string} options.position - Position UUID filter
   * @param {string} options.sort - Sort field (default: firstName)
   * @param {string} options.order - Sort order (asc/desc, default: asc)
   * @param {string} role - User role (employee/manager/admin/hr)
   * @param {string} employeeId - Current user's employee ID
   * @returns {Promise<Object>} { employees, pagination }
   */
  async searchEmployees(options, role, employeeId) {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      status,
      position,
      sort = 'firstName',
      order = 'asc'
    } = options;

    // Role-based limit enforcement
    const maxLimit = (role === 'admin' || role === 'hr') ? 1000 : 100;
    const validatedLimit = Math.min(limit, maxLimit);
    const offset = (page - 1) * validatedLimit;

    // Build where clause
    let where = {};

    // Apply role-based filtering
    if (role === 'employee') {
      // Employee sees only self
      where.id = employeeId;
    } else if (role === 'manager') {
      // Manager sees self + team
      const subordinates = await this.Employee.findAll({
        where: { managerId: employeeId },
        attributes: ['id']
      });
      const subordinateIds = subordinates.map(e => e.id);
      where.id = { [Op.in]: [employeeId, ...subordinateIds] };
    }
    // Admin/HR sees all (no filter)

    // Apply search filter
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Apply filters
    if (department) {
      where.departmentId = department;
    }
    if (status) {
      where.status = status;
    }
    if (position) {
      where.positionId = position;
    }

    // Query with associations
    const { count, rows: employees } = await this.Employee.findAndCountAll({
      where,
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name', 'description']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title', 'description', 'level']
        },
        {
          model: this.User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'isActive', 'lastLoginAt']
        },
        {
          model: this.Employee,
          as: 'manager',
          attributes: ['id', 'employeeId', 'firstName', 'lastName'],
          required: false
        }
      ],
      limit: validatedLimit,
      offset,
      order: [[sort, order.toUpperCase()]],
      distinct: true
    });

    return {
      employees,
      pagination: {
        total: count,
        page,
        limit: validatedLimit,
        pages: Math.ceil(count / validatedLimit)
      }
    };
  }

  /**
   * Get employees by department
   * 
   * @param {string} departmentId - Department UUID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Employees in department
   */
  async getEmployeesByDepartment(departmentId, options = {}) {
    const {
      page = 1,
      limit = 100,
      status = 'Active'
    } = options;

    const offset = (page - 1) * limit;

    return await this.Employee.findAll({
      where: { 
        departmentId,
        status
      },
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title', 'level']
        }
      ],
      limit,
      offset,
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
  }

  /**
   * Get employees by position
   * 
   * @param {string} positionId - Position UUID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Employees in position
   */
  async getEmployeesByPosition(positionId, options = {}) {
    const {
      page = 1,
      limit = 100,
      status = 'Active'
    } = options;

    const offset = (page - 1) * limit;

    return await this.Employee.findAll({
      where: { 
        positionId,
        status
      },
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title', 'level']
        }
      ],
      limit,
      offset,
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
  }

  /**
   * Get manager's team members (direct reports)
   * 
   * @param {string} managerId - Manager's employee UUID
   * @param {string} requesterId - Requester's employee UUID
   * @param {string} role - Requester's role
   * @returns {Promise<Array>} Team members
   * @throws {ForbiddenError} If non-admin tries to access other manager's team
   */
  async getManagerTeam(managerId, requesterId, role) {
    // Security check: manager can only access own team unless admin/hr
    if (role !== 'admin' && role !== 'hr' && managerId !== requesterId) {
      throw new ForbiddenError('You can only access your own team.');
    }

    return await this.Employee.findAll({
      where: { 
        managerId,
        status: 'Active'
      },
      include: [
        {
          model: this.User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'isActive', 'lastLoginAt']
        },
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title', 'level']
        }
      ],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
  }

  /**
   * Get list of all managers (Admin/HR only)
   * 
   * @returns {Promise<Array>} Managers with subordinate count
   */
  async getManagers() {
    // Find all unique manager IDs
    const managersWithSubordinates = await this.Employee.findAll({
      attributes: [
        'managerId',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'subordinateCount']
      ],
      where: {
        managerId: { [Op.ne]: null },
        status: 'Active'
      },
      group: ['managerId'],
      raw: true
    });

    const managerIds = managersWithSubordinates.map(m => m.managerId);

    if (managerIds.length === 0) {
      return [];
    }

    // Get manager details
    const managers = await this.Employee.findAll({
      where: {
        id: { [Op.in]: managerIds },
        status: 'Active'
      },
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title']
        }
      ],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    // Add subordinate count to each manager
    return managers.map(manager => {
      const countData = managersWithSubordinates.find(m => m.managerId === manager.id);
      return {
        ...manager.toJSON(),
        subordinateCount: parseInt(countData?.subordinateCount || 0)
      };
    });
  }

  /**
   * Get employee statistics
   * 
   * @param {string} role - User role
   * @param {string} employeeId - Current user's employee ID
   * @returns {Promise<Object>} Statistics object
   */
  async getEmployeeStats(role, employeeId) {
    let where = {};

    // Apply role-based filtering
    if (role === 'employee') {
      where.id = employeeId;
    } else if (role === 'manager') {
      const subordinates = await this.Employee.findAll({
        where: { managerId: employeeId },
        attributes: ['id']
      });
      const subordinateIds = subordinates.map(e => e.id);
      where.id = { [Op.in]: [employeeId, ...subordinateIds] };
    }
    // Admin/HR sees all (no filter)

    const [total, active, inactive, onLeave, terminated] = await Promise.all([
      this.Employee.count({ where }),
      this.Employee.count({ where: { ...where, status: 'Active' } }),
      this.Employee.count({ where: { ...where, status: 'Inactive' } }),
      this.Employee.count({ where: { ...where, status: 'On Leave' } }),
      this.Employee.count({ where: { ...where, status: 'Terminated' } })
    ]);

    return {
      total,
      active,
      inactive,
      onLeave,
      terminated
    };
  }

  /**
   * Get employees by hire date range
   * 
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Employees hired in range
   */
  async getEmployeesByHireDate(startDate, endDate) {
    return await this.Employee.findAll({
      where: {
        hireDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['id', 'title']
        }
      ],
      order: [['hireDate', 'DESC']]
    });
  }

  /**
   * Get department metadata (name, employee count)
   * 
   * @returns {Promise<Array>} Departments with counts
   */
  async getDepartmentMetadata() {
    const departments = await this.Department.findAll({
      attributes: [
        'id',
        'name',
        'description',
        [this.sequelize.fn('COUNT', this.sequelize.col('employees.id')), 'employeeCount']
      ],
      include: [
        {
          model: this.Employee,
          as: 'employees',
          attributes: [],
          where: { status: 'Active' },
          required: false
        }
      ],
      group: ['Department.id'],
      order: [['name', 'ASC']]
    });

    return departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      employeeCount: parseInt(dept.get('employeeCount') || 0)
    }));
  }

  /**
   * Get position metadata (title, employee count)
   * 
   * @returns {Promise<Array>} Positions with counts
   */
  async getPositionMetadata() {
    const positions = await this.Position.findAll({
      attributes: [
        'id',
        'title',
        'level',
        'description',
        'departmentId',
        [this.sequelize.fn('COUNT', this.sequelize.col('employees.id')), 'employeeCount']
      ],
      include: [
        {
          model: this.Employee,
          as: 'employees',
          attributes: [],
          where: { status: 'Active' },
          required: false
        }
      ],
      group: ['Position.id'],
      order: [['title', 'ASC']]
    });

    return positions.map(pos => ({
      id: pos.id,
      title: pos.title,
      level: pos.level,
      description: pos.description,
      departmentId: pos.departmentId,
      employeeCount: parseInt(pos.get('employeeCount') || 0)
    }));
  }

  /**
   * Get employee by employeeId (string, not UUID)
   * 
   * @param {string} employeeId - Employee ID string (SKYT####)
   * @returns {Promise<Employee>} Employee with associations
   */
  async getByEmployeeId(employeeId) {
    const employee = await this.Employee.findOne({
      where: { employeeId },
      include: [
        {
          model: this.User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'isActive']
        },
        {
          model: this.Department,
          as: 'department'
        },
        {
          model: this.Position,
          as: 'position'
        },
        {
          model: this.Employee,
          as: 'manager',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        },
        {
          model: this.Employee,
          as: 'subordinates',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        }
      ]
    });

    if (!employee) {
      throw new NotFoundError(`Employee with ID '${employeeId}' not found.`);
    }

    return employee;
  }
}

module.exports = EmployeeSearchService;
