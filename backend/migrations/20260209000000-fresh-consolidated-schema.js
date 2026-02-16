'use strict';

/**
 * FRESH CONSOLIDATED MIGRATION - SkyRakSys HRM
 * ==============================================
 * Date: 2026-02-09
 * 
 * This single migration creates the COMPLETE database schema from scratch.
 * It replaces all 19 previous incremental migrations with a single clean migration.
 * 
 * Tables created (in dependency order):
 *   1.  users
 *   2.  departments
 *   3.  positions
 *   4.  employees
 *   5.  refresh_tokens
 *   6.  leave_types
 *   7.  leave_balances
 *   8.  leave_requests
 *   9.  projects
 *   10. tasks
 *   11. timesheets
 *   12. salary_structures
 *   13. payslip_templates
 *   14. payroll_data
 *   15. payslips
 *   16. payslip_audit_logs
 *   17. audit_logs
 *   18. system_configs
 *   19. employee_reviews
 * 
 * How to use:
 *   FRESH INSTALL:
 *     1. Move old migrations/ to archive (or delete)
 *     2. Keep only this file in migrations/
 *     3. Run: npx sequelize-cli db:migrate
 * 
 *   EXISTING DATABASE (already has tables):
 *     If your DB already ran old migrations, mark this as "already run":
 *       INSERT INTO "SequelizeMeta" (name) VALUES ('20260209000000-fresh-consolidated-schema.js');
 *     Then continue with any future incremental migrations normally.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // =========================================================================
      // 1. USERS
      // =========================================================================
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('admin', 'hr', 'manager', 'employee'),
          allowNull: false,
          defaultValue: 'employee'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        failedLoginAttempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        lockoutUntil: {
          type: Sequelize.DATE,
          allowNull: true
        },
        lastLoginAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        passwordChangedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        emailVerifiedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('users', ['email'], {
        unique: true, name: 'idx_users_email', transaction
      });
      await queryInterface.addIndex('users', ['role'], {
        name: 'idx_users_role', transaction
      });
      await queryInterface.addIndex('users', ['isActive'], {
        name: 'idx_users_active', transaction
      });

      // =========================================================================
      // 2. DEPARTMENTS
      // =========================================================================
      await queryInterface.createTable('departments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        code: {
          type: Sequelize.STRING(10),
          allowNull: true,
          unique: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        parentId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        // managerId added after employees table is created (circular dependency)
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // =========================================================================
      // 3. POSITIONS
      // =========================================================================
      await queryInterface.createTable('positions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: true,
          unique: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        level: {
          type: Sequelize.ENUM('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'),
          defaultValue: 'Entry'
        },
        departmentId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        minSalary: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        maxSalary: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        responsibilities: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        requirements: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('positions', ['departmentId'], {
        name: 'idx_positions_department', transaction
      });

      // =========================================================================
      // 4. EMPLOYEES
      // =========================================================================
      await queryInterface.createTable('employees', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        hireDate: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('Active', 'Inactive', 'On Leave', 'Terminated'),
          defaultValue: 'Active'
        },
        // Indian statutory fields
        aadhaarNumber: { type: Sequelize.STRING, allowNull: true },
        panNumber: { type: Sequelize.STRING, allowNull: true },
        uanNumber: { type: Sequelize.STRING, allowNull: true },
        pfNumber: { type: Sequelize.STRING, allowNull: true },
        esiNumber: { type: Sequelize.STRING, allowNull: true },
        // Bank details
        bankName: { type: Sequelize.STRING, allowNull: true },
        bankAccountNumber: { type: Sequelize.STRING, allowNull: true },
        ifscCode: { type: Sequelize.STRING, allowNull: true },
        bankBranch: { type: Sequelize.STRING, allowNull: true },
        accountHolderName: { type: Sequelize.STRING, allowNull: true },
        // Address
        address: { type: Sequelize.TEXT, allowNull: true },
        city: { type: Sequelize.STRING, allowNull: true },
        state: { type: Sequelize.STRING, allowNull: true },
        pinCode: { type: Sequelize.STRING, allowNull: true },
        // Emergency contact
        emergencyContactName: { type: Sequelize.STRING, allowNull: true },
        emergencyContactPhone: { type: Sequelize.STRING, allowNull: true },
        emergencyContactRelation: { type: Sequelize.STRING, allowNull: true },
        // Personal
        dateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
        gender: {
          type: Sequelize.ENUM('Male', 'Female', 'Other'),
          allowNull: true
        },
        photoUrl: { type: Sequelize.STRING, allowNull: true },
        maritalStatus: {
          type: Sequelize.ENUM('Single', 'Married', 'Divorced', 'Widowed'),
          allowNull: true
        },
        nationality: { type: Sequelize.STRING, defaultValue: 'Indian' },
        workLocation: { type: Sequelize.STRING, allowNull: true },
        employmentType: {
          type: Sequelize.ENUM('Full-time', 'Part-time', 'Contract', 'Intern'),
          defaultValue: 'Full-time'
        },
        // Dates
        joiningDate: { type: Sequelize.DATEONLY, allowNull: true },
        confirmationDate: { type: Sequelize.DATEONLY, allowNull: true },
        resignationDate: { type: Sequelize.DATEONLY, allowNull: true },
        lastWorkingDate: { type: Sequelize.DATEONLY, allowNull: true },
        probationPeriod: { type: Sequelize.INTEGER, defaultValue: 6 },
        noticePeriod: { type: Sequelize.INTEGER, defaultValue: 30 },
        // Salary (JSON for flexibility)
        salary: { type: Sequelize.JSON, allowNull: true },
        // Foreign keys
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        departmentId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        positionId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'positions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        managerId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('employees', ['userId'], {
        name: 'idx_employees_user', transaction
      });
      await queryInterface.addIndex('employees', ['departmentId'], {
        name: 'idx_employees_department', transaction
      });
      await queryInterface.addIndex('employees', ['positionId'], {
        name: 'idx_employees_position', transaction
      });
      await queryInterface.addIndex('employees', ['managerId'], {
        name: 'idx_employees_manager', transaction
      });
      await queryInterface.addIndex('employees', ['status'], {
        name: 'idx_employees_status', transaction
      });
      await queryInterface.addIndex('employees', ['employeeId'], {
        unique: true, name: 'idx_employees_empid', transaction
      });

      // Now add managerId to departments (circular dep resolved)
      await queryInterface.addColumn('departments', 'managerId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // =========================================================================
      // 5. REFRESH TOKENS
      // =========================================================================
      await queryInterface.createTable('refresh_tokens', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        token: {
          type: Sequelize.TEXT,
          allowNull: false,
          unique: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        isRevoked: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        revokedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        ipAddress: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('refresh_tokens', ['userId'], {
        name: 'idx_refresh_tokens_user', transaction
      });
      await queryInterface.addIndex('refresh_tokens', ['expiresAt'], {
        name: 'idx_refresh_tokens_expires', transaction
      });

      // =========================================================================
      // 6. LEAVE TYPES
      // =========================================================================
      await queryInterface.createTable('leave_types', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        maxDaysPerYear: {
          type: Sequelize.INTEGER,
          defaultValue: 20
        },
        carryForward: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        maxCarryForwardDays: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // =========================================================================
      // 7. LEAVE BALANCES
      // =========================================================================
      await queryInterface.createTable('leave_balances', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        leaveTypeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leave_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        year: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        totalAccrued: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        totalTaken: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        totalPending: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        balance: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        carryForward: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('leave_balances', ['employeeId', 'leaveTypeId', 'year'], {
        unique: true, name: 'idx_leave_balances_unique', transaction
      });

      // =========================================================================
      // 8. LEAVE REQUESTS
      // =========================================================================
      await queryInterface.createTable('leave_requests', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        leaveTypeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leave_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        totalDays: {
          type: Sequelize.DECIMAL(4, 1),
          allowNull: false
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested'),
          defaultValue: 'Pending'
        },
        approvedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        approvedAt: { type: Sequelize.DATE, allowNull: true },
        rejectedAt: { type: Sequelize.DATE, allowNull: true },
        approverComments: { type: Sequelize.TEXT, allowNull: true },
        rejectionReason: { type: Sequelize.TEXT, allowNull: true },
        employeeComments: { type: Sequelize.TEXT, allowNull: true },
        attachments: { type: Sequelize.TEXT, allowNull: true },
        isHalfDay: { type: Sequelize.BOOLEAN, defaultValue: false },
        halfDayType: {
          type: Sequelize.ENUM('First Half', 'Second Half'),
          allowNull: true
        },
        isCancellation: { type: Sequelize.BOOLEAN, defaultValue: false },
        originalLeaveRequestId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'leave_requests', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        cancellationNote: { type: Sequelize.TEXT, allowNull: true },
        cancelledAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('leave_requests', ['employeeId'], {
        name: 'idx_leave_requests_employee', transaction
      });
      await queryInterface.addIndex('leave_requests', ['leaveTypeId'], {
        name: 'idx_leave_requests_type', transaction
      });
      await queryInterface.addIndex('leave_requests', ['status'], {
        name: 'idx_leave_requests_status', transaction
      });
      await queryInterface.addIndex('leave_requests', ['startDate', 'endDate'], {
        name: 'idx_leave_requests_dates', transaction
      });

      // =========================================================================
      // 9. PROJECTS
      // =========================================================================
      await queryInterface.createTable('projects', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        startDate: { type: Sequelize.DATEONLY, allowNull: true },
        endDate: { type: Sequelize.DATEONLY, allowNull: true },
        status: {
          type: Sequelize.ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'),
          defaultValue: 'Planning'
        },
        clientName: { type: Sequelize.STRING, allowNull: true },
        managerId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // =========================================================================
      // 10. TASKS
      // =========================================================================
      await queryInterface.createTable('tasks', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        estimatedHours: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        actualHours: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('Not Started', 'In Progress', 'Completed', 'On Hold'),
          defaultValue: 'Not Started'
        },
        priority: {
          type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
          defaultValue: 'Medium'
        },
        availableToAll: { type: Sequelize.BOOLEAN, defaultValue: false },
        projectId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'projects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        assignedTo: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('tasks', ['projectId'], {
        name: 'idx_tasks_project', transaction
      });
      await queryInterface.addIndex('tasks', ['assignedTo'], {
        name: 'idx_tasks_assignee', transaction
      });

      // =========================================================================
      // 11. TIMESHEETS
      // =========================================================================
      await queryInterface.createTable('timesheets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        projectId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'projects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        taskId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'tasks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        weekStartDate: { type: Sequelize.DATEONLY, allowNull: false },
        weekEndDate: { type: Sequelize.DATEONLY, allowNull: false },
        weekNumber: { type: Sequelize.INTEGER, allowNull: false },
        year: { type: Sequelize.INTEGER, allowNull: false },
        totalHoursWorked: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        mondayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        tuesdayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        wednesdayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        thursdayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        fridayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        saturdayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        sundayHours: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('Draft', 'Submitted', 'Approved', 'Rejected'),
          defaultValue: 'Draft'
        },
        submittedAt: { type: Sequelize.DATE, allowNull: true },
        approvedAt: { type: Sequelize.DATE, allowNull: true },
        rejectedAt: { type: Sequelize.DATE, allowNull: true },
        approverComments: { type: Sequelize.TEXT, allowNull: true },
        approvedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('timesheets', ['employeeId', 'weekStartDate'], {
        name: 'idx_timesheets_emp_week', transaction
      });
      await queryInterface.addIndex('timesheets', ['projectId', 'weekStartDate'], {
        name: 'idx_timesheets_project_week', transaction
      });
      await queryInterface.addIndex('timesheets', ['status'], {
        name: 'idx_timesheets_status', transaction
      });
      await queryInterface.addIndex('timesheets', ['weekStartDate', 'weekEndDate'], {
        name: 'idx_timesheets_date_range', transaction
      });

      // =========================================================================
      // 12. SALARY STRUCTURES
      // =========================================================================
      await queryInterface.createTable('salary_structures', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        basicSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        hra: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        allowances: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        pfContribution: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        tds: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        professionalTax: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        otherDeductions: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        currency: { type: Sequelize.STRING, defaultValue: 'INR' },
        effectiveFrom: { type: Sequelize.DATEONLY, allowNull: false },
        isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('salary_structures', ['employeeId'], {
        name: 'idx_salary_structures_employee', transaction
      });

      // =========================================================================
      // 13. PAYSLIP TEMPLATES
      // =========================================================================
      await queryInterface.createTable('payslip_templates', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        name: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        isDefault: { type: Sequelize.BOOLEAN, defaultValue: false },
        isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
        headerFields: { type: Sequelize.JSON, defaultValue: [] },
        earningsFields: { type: Sequelize.JSON, defaultValue: [] },
        deductionsFields: { type: Sequelize.JSON, defaultValue: [] },
        footerFields: { type: Sequelize.JSON, defaultValue: [] },
        styling: { type: Sequelize.JSON, defaultValue: {} },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('payslip_templates', ['isDefault'], {
        name: 'idx_payslip_templates_default', transaction
      });
      await queryInterface.addIndex('payslip_templates', ['isActive'], {
        name: 'idx_payslip_templates_active', transaction
      });

      // =========================================================================
      // 14. PAYROLL DATA
      // =========================================================================
      await queryInterface.createTable('payroll_data', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        payPeriod: { type: Sequelize.STRING, allowNull: false },
        payPeriodStart: { type: Sequelize.DATEONLY, allowNull: false },
        payPeriodEnd: { type: Sequelize.DATEONLY, allowNull: false },
        totalWorkingDays: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 21 },
        presentDays: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 21 },
        absentDays: { type: Sequelize.INTEGER, defaultValue: 0 },
        lopDays: { type: Sequelize.INTEGER, defaultValue: 0 },
        paidDays: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        overtimeHours: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
        weeklyOffDays: { type: Sequelize.INTEGER, defaultValue: 0 },
        holidays: { type: Sequelize.INTEGER, defaultValue: 0 },
        variableEarnings: {
          type: Sequelize.JSON,
          defaultValue: { performanceBonus: 0, overtimeAllowance: 0, arrears: 0, incentive: 0, specialBonus: 0 }
        },
        variableDeductions: {
          type: Sequelize.JSON,
          defaultValue: { loanEmi: 0, advances: 0, canteenCharges: 0, otherDeductions: 0, lateFine: 0 }
        },
        leaveAdjustments: {
          type: Sequelize.JSON,
          defaultValue: { leaveEncashment: 0, leaveWithoutPay: 0 }
        },
        grossSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        totalDeductions: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        netSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        paymentMode: {
          type: Sequelize.ENUM('bank_transfer', 'cheque', 'cash', 'upi'),
          defaultValue: 'bank_transfer'
        },
        disbursementDate: { type: Sequelize.DATEONLY, allowNull: true },
        status: {
          type: Sequelize.ENUM('draft', 'calculated', 'approved', 'paid', 'cancelled'),
          defaultValue: 'draft'
        },
        approvedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        approvedAt: { type: Sequelize.DATE, allowNull: true },
        approvalComments: { type: Sequelize.TEXT, allowNull: true },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        updatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        calculationNotes: { type: Sequelize.TEXT, allowNull: true },
        templateUsed: { type: Sequelize.STRING, defaultValue: 'default' },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('payroll_data', ['employeeId', 'payPeriod'], {
        unique: true, name: 'idx_payroll_data_unique', transaction
      });
      await queryInterface.addIndex('payroll_data', ['status'], {
        name: 'idx_payroll_data_status', transaction
      });

      // =========================================================================
      // 15. PAYSLIPS
      // =========================================================================
      await queryInterface.createTable('payslips', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        payrollDataId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_data', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        payPeriod: { type: Sequelize.STRING, allowNull: false },
        month: { type: Sequelize.INTEGER, allowNull: false },
        year: { type: Sequelize.INTEGER, allowNull: false },
        payPeriodStart: { type: Sequelize.DATEONLY, allowNull: false },
        payPeriodEnd: { type: Sequelize.DATEONLY, allowNull: false },
        templateId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'payslip_templates', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        templateVersion: { type: Sequelize.STRING, defaultValue: '1.0' },
        employeeInfo: { type: Sequelize.JSON, allowNull: false },
        companyInfo: { type: Sequelize.JSON, allowNull: false },
        earnings: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        deductions: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        attendance: {
          type: Sequelize.JSON, allowNull: false,
          defaultValue: { totalWorkingDays: 21, presentDays: 21, absentDays: 0, lopDays: 0, paidDays: 21, overtimeHours: 0 }
        },
        grossEarnings: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        totalDeductions: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        netPay: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        netPayInWords: { type: Sequelize.TEXT, allowNull: true },
        payslipNumber: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        payDate: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        generatedDate: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        generatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        status: {
          type: Sequelize.ENUM('draft', 'finalized', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'draft'
        },
        calculationDetails: { type: Sequelize.JSON, allowNull: true },
        pdfMetadata: { type: Sequelize.JSON, allowNull: true },
        additionalData: { type: Sequelize.JSON, allowNull: true },
        version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        isLocked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        manuallyEdited: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        lastEditedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        lastEditedAt: { type: Sequelize.DATE, allowNull: true },
        finalizedAt: { type: Sequelize.DATE, allowNull: true },
        finalizedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        paidAt: { type: Sequelize.DATE, allowNull: true },
        paidBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        paymentMethod: { type: Sequelize.STRING(50), allowNull: true },
        paymentReference: { type: Sequelize.STRING(100), allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('payslips', ['employeeId', 'month', 'year'], {
        unique: true, name: 'idx_payslips_emp_period', transaction
      });
      await queryInterface.addIndex('payslips', ['status'], {
        name: 'idx_payslips_status', transaction
      });
      await queryInterface.addIndex('payslips', ['payslipNumber'], {
        unique: true, name: 'idx_payslips_number', transaction
      });

      // =========================================================================
      // 16. PAYSLIP AUDIT LOGS
      // =========================================================================
      await queryInterface.createTable('payslip_audit_logs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        payslipId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'payslips', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        action: {
          type: Sequelize.ENUM('manual_edit', 'status_change', 'finalize', 'mark_paid', 'regenerate'),
          allowNull: false
        },
        performedBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        reason: { type: Sequelize.TEXT, allowNull: true },
        changes: { type: Sequelize.JSONB, allowNull: true },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        userAgent: { type: Sequelize.TEXT, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('payslip_audit_logs', ['payslipId'], {
        name: 'idx_payslip_audit_payslip', transaction
      });
      await queryInterface.addIndex('payslip_audit_logs', ['performedBy'], {
        name: 'idx_payslip_audit_performer', transaction
      });

      // =========================================================================
      // 17. AUDIT LOGS
      // =========================================================================
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        action: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        entityType: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        entityId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        oldValues: { type: Sequelize.JSONB, allowNull: true },
        newValues: { type: Sequelize.JSONB, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        ipAddress: { type: Sequelize.STRING(45), allowNull: true },
        userAgent: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        duration: { type: Sequelize.INTEGER, allowNull: true },
        success: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        errorMessage: { type: Sequelize.TEXT, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('audit_logs', ['userId'], {
        name: 'idx_audit_logs_user', transaction
      });
      await queryInterface.addIndex('audit_logs', ['entityType', 'entityId'], {
        name: 'idx_audit_logs_entity', transaction
      });
      await queryInterface.addIndex('audit_logs', ['action'], {
        name: 'idx_audit_logs_action', transaction
      });
      await queryInterface.addIndex('audit_logs', ['createdAt'], {
        name: 'idx_audit_logs_created', transaction
      });
      await queryInterface.addIndex('audit_logs', ['success'], {
        name: 'idx_audit_logs_success', transaction
      });

      // =========================================================================
      // 18. SYSTEM CONFIGS
      // =========================================================================
      await queryInterface.createTable('system_configs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        category: { type: Sequelize.STRING(50), allowNull: false },
        key: { type: Sequelize.STRING(100), allowNull: false },
        value: { type: Sequelize.TEXT, allowNull: false },
        version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        changedBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      await queryInterface.addIndex('system_configs', ['category', 'key'], {
        name: 'idx_system_configs_category_key', transaction
      });

      // =========================================================================
      // 19. EMPLOYEE REVIEWS
      // =========================================================================
      await queryInterface.createTable('employee_reviews', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        reviewerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        reviewPeriod: { type: Sequelize.STRING, allowNull: false },
        reviewType: {
          type: Sequelize.ENUM('quarterly', 'annual', 'probationary', 'performance_improvement'),
          defaultValue: 'quarterly'
        },
        overallRating: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        technicalSkills: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        communication: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        teamwork: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        leadership: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        punctuality: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        achievements: { type: Sequelize.TEXT, allowNull: true },
        areasForImprovement: { type: Sequelize.TEXT, allowNull: true },
        goals: { type: Sequelize.TEXT, allowNull: true },
        reviewerComments: { type: Sequelize.TEXT, allowNull: true },
        employeeSelfAssessment: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('draft', 'pending_employee_input', 'pending_approval', 'completed', 'archived'),
          defaultValue: 'draft'
        },
        reviewDate: { type: Sequelize.DATE, allowNull: true },
        nextReviewDate: { type: Sequelize.DATE, allowNull: true },
        hrApproved: { type: Sequelize.BOOLEAN, defaultValue: false },
        hrApprovedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        hrApprovedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('employee_reviews', ['employeeId'], {
        name: 'idx_employee_reviews_employee', transaction
      });
      await queryInterface.addIndex('employee_reviews', ['reviewerId'], {
        name: 'idx_employee_reviews_reviewer', transaction
      });
      await queryInterface.addIndex('employee_reviews', ['status'], {
        name: 'idx_employee_reviews_status', transaction
      });

      await transaction.commit();
      console.log('✅ Fresh consolidated schema created successfully (19 tables)');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop in reverse dependency order
      const tables = [
        'employee_reviews',
        'system_configs',
        'audit_logs',
        'payslip_audit_logs',
        'payslips',
        'payroll_data',
        'payslip_templates',
        'salary_structures',
        'timesheets',
        'tasks',
        'projects',
        'leave_requests',
        'leave_balances',
        'leave_types',
        'refresh_tokens',
        'employees',
        'positions',
        'departments',
        'users'
      ];

      for (const table of tables) {
        await queryInterface.dropTable(table, { transaction, cascade: true });
      }

      await transaction.commit();
      console.log('✅ All tables dropped successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
