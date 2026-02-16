'use strict';

/**
 * Migration: Create attendances table (GAP Item 12.1)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendances', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      checkIn: {
        type: Sequelize.DATE,
        allowNull: true
      },
      checkOut: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'half-day', 'on-leave', 'holiday', 'weekend', 'late'),
        allowNull: false,
        defaultValue: 'present'
      },
      hoursWorked: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      overtimeHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      lateMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      earlyLeaveMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      breakDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      source: {
        type: Sequelize.ENUM('manual', 'biometric', 'web', 'mobile'),
        defaultValue: 'web'
      },
      notes: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('attendances', ['employeeId', 'date'], {
      unique: true,
      name: 'idx_attendance_employee_date'
    });
    await queryInterface.addIndex('attendances', ['date']);
    await queryInterface.addIndex('attendances', ['status']);
    await queryInterface.addIndex('attendances', ['employeeId', 'date', 'status'], {
      name: 'idx_attendance_emp_date_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendances');
  }
};
