const { Op } = require('sequelize');
const { BadRequestError } = require('../../utils/errors');

/**
 * EmployeeBulkService
 * 
 * Handles bulk employee operations and CSV export.
 * Ensures data consistency with transactions.
 * 
 * @class EmployeeBulkService
 */
class EmployeeBulkService {
  constructor(db) {
    this.db = db;
    this.Employee = db.Employee;
    this.Department = db.Department;
    this.Position = db.Position;
    this.sequelize = db.sequelize;
    this.Op = Op;
  }

  /**
   * Bulk update employees with field whitelisting
   * Only allows: status, departmentId, managerId
   * 
   * @param {Array} employeeIds - Array of employee UUIDs
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} { updated: count }
   * @throws {BadRequestError} If invalid fields or FK validation fails
   */
  async bulkUpdateEmployees(employeeIds, updateData) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new BadRequestError('Employee IDs array cannot be empty');
    }

    // Whitelist allowed fields
    const allowedFields = ['status', 'departmentId', 'managerId'];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    // Validate foreign keys if provided
    if (filteredData.departmentId) {
      const department = await this.Department.findByPk(filteredData.departmentId);
      if (!department || department.isActive === false) {
        throw new BadRequestError('Invalid or inactive department');
      }
    }

    if (filteredData.managerId) {
      const manager = await this.Employee.findByPk(filteredData.managerId);
      if (!manager) {
        throw new BadRequestError('Invalid manager');
      }
      if (manager.status === 'Terminated') {
        throw new BadRequestError('Manager cannot be terminated');
      }
    }

    // Perform bulk update
    const [updatedCount] = await this.Employee.update(filteredData, {
      where: { id: { [Op.in]: employeeIds } }
    });

    return { updated: updatedCount };
  }

  /**
   * Export employees to CSV with filters
   * 
   * @param {Object} filters - { search, department, status }
   * @returns {Promise<string>} CSV string
   */
  async exportToCSV(filters = {}) {
    const { search, department, status } = filters;

    // Build where clause
    let where = {};

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (department) {
      where.departmentId = department;
    }

    if (status) {
      where.status = status;
    }

    // Query employees
    const employees = await this.Employee.findAll({
      where,
      include: [
        {
          model: this.Department,
          as: 'department',
          attributes: ['name']
        },
        {
          model: this.Position,
          as: 'position',
          attributes: ['title']
        }
      ],
      order: [['employeeId', 'ASC']]
    });

    // Generate CSV header
    const header = 'Employee ID,First Name,Last Name,Email,Phone,Department,Position,Status,Hire Date';

    // Generate CSV rows
    const rows = employees.map(emp => {
      const departmentName = emp.department ? emp.department.name : '';
      const positionTitle = emp.position ? emp.position.title : '';
      
      return [
        emp.employeeId || '',
        emp.firstName || '',
        emp.lastName || '',
        emp.email || '',
        emp.phone || '',
        departmentName,
        positionTitle,
        emp.status || '',
        emp.hireDate || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Validate CSV import data (future feature)
   * 
   * @param {Array} rows - CSV rows parsed
   * @returns {Promise<Object>} { valid: [], invalid: [] }
   */
  async validateCSVImport(rows) {
    const valid = [];
    const invalid = [];

    // Pre-load all reference data to avoid N+1 queries
    const allEmails = rows.map(r => r.email).filter(Boolean);
    const allEmpIds = rows.map(r => r.employeeId).filter(Boolean);
    const allDeptIds = [...new Set(rows.map(r => r.departmentId).filter(Boolean))];
    const allPosIds = [...new Set(rows.map(r => r.positionId).filter(Boolean))];
    const allMgrIds = [...new Set(rows.map(r => r.managerId).filter(Boolean))];

    const [existingEmails, existingEmpIds, validDepts, validPositions, validManagers] = await Promise.all([
      allEmails.length ? this.Employee.findAll({ where: { email: allEmails }, attributes: ['email'], raw: true }) : [],
      allEmpIds.length ? this.Employee.findAll({ where: { employeeId: allEmpIds }, attributes: ['employeeId'], raw: true }) : [],
      allDeptIds.length ? this.Department.findAll({ where: { id: allDeptIds }, attributes: ['id'], raw: true }) : [],
      allPosIds.length ? this.Position.findAll({ where: { id: allPosIds }, attributes: ['id'], raw: true }) : [],
      allMgrIds.length ? this.Employee.findAll({ where: { id: allMgrIds }, attributes: ['id'], raw: true }) : []
    ]);

    const emailSet = new Set(existingEmails.map(e => e.email));
    const empIdSet = new Set(existingEmpIds.map(e => e.employeeId));
    const deptIdSet = new Set(validDepts.map(d => String(d.id)));
    const posIdSet = new Set(validPositions.map(p => String(p.id)));
    const mgrIdSet = new Set(validManagers.map(m => String(m.id)));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors = [];

      // Validate required fields
      if (!row.firstName) errors.push('First name is required');
      if (!row.lastName) errors.push('Last name is required');
      if (!row.email) errors.push('Email is required');
      if (!row.hireDate) errors.push('Hire date is required');

      // Validate email format
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Invalid email format');
      }

      // Check for duplicate email (batch lookup)
      if (row.email && emailSet.has(row.email)) {
        errors.push('Email already exists');
      }

      // Check for duplicate employeeId (batch lookup)
      if (row.employeeId && empIdSet.has(row.employeeId)) {
        errors.push('Employee ID already exists');
      }

      // Validate foreign keys (batch lookup)
      if (row.departmentId && !deptIdSet.has(String(row.departmentId))) {
        errors.push('Invalid department ID');
      }

      if (row.positionId && !posIdSet.has(String(row.positionId))) {
        errors.push('Invalid position ID');
      }

      if (row.managerId && !mgrIdSet.has(String(row.managerId))) {
        errors.push('Invalid manager ID');
      }

      if (errors.length > 0) {
        invalid.push({
          row: i + 1,
          data: row,
          errors
        });
      } else {
        valid.push(row);
      }
    }

    return { valid, invalid };
  }

  /**
   * Detect conflicts in bulk data
   * 
   * @param {Array} employees - Array of employee data
   * @returns {Promise<Array>} Conflicting records
   */
  async detectConflicts(employees) {
    const conflicts = [];
    const emails = new Set();
    const employeeIds = new Set();

    // Pre-load existing records for batch conflict detection
    const allEmails = employees.map(e => e.email).filter(Boolean);
    const allEmpIds = employees.map(e => e.employeeId).filter(Boolean);

    const [existingByEmail, existingByEmpId] = await Promise.all([
      allEmails.length ? this.Employee.findAll({ where: { email: allEmails }, attributes: ['id', 'email'], raw: true }) : [],
      allEmpIds.length ? this.Employee.findAll({ where: { employeeId: allEmpIds }, attributes: ['id', 'employeeId'], raw: true }) : []
    ]);

    const dbEmailMap = new Map(existingByEmail.map(e => [e.email, e.id]));
    const dbEmpIdMap = new Map(existingByEmpId.map(e => [e.employeeId, e.id]));

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      // Check for duplicates in input array
      if (emp.email) {
        if (emails.has(emp.email)) {
          conflicts.push({
            row: i + 1,
            field: 'email',
            value: emp.email,
            type: 'duplicate_in_input'
          });
        } else {
          emails.add(emp.email);
        }
      }

      if (emp.employeeId) {
        if (employeeIds.has(emp.employeeId)) {
          conflicts.push({
            row: i + 1,
            field: 'employeeId',
            value: emp.employeeId,
            type: 'duplicate_in_input'
          });
        } else {
          employeeIds.add(emp.employeeId);
        }
      }

      // Check for conflicts with database (batch lookup)
      if (emp.email && dbEmailMap.has(emp.email)) {
        conflicts.push({
          row: i + 1,
          field: 'email',
          value: emp.email,
          type: 'exists_in_database',
          existingId: dbEmailMap.get(emp.email)
        });
      }

      if (emp.employeeId && dbEmpIdMap.has(emp.employeeId)) {
        conflicts.push({
          row: i + 1,
          field: 'employeeId',
          value: emp.employeeId,
          type: 'exists_in_database',
          existingId: dbEmpIdMap.get(emp.employeeId)
        });
      }
    }

    return conflicts;
  }

  /**
   * Get current date string for CSV filename
   * 
   * @returns {string} Formatted date string (YYYY-MM-DD)
   */
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = EmployeeBulkService;
