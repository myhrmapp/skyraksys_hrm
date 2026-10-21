'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add isLocked column to users table if not already present
    const usersTable = await queryInterface.describeTable('users');
    if (!usersTable.isLocked) {
      await queryInterface.addColumn('users', 'isLocked', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      await queryInterface.addIndex('users', ['isLocked'], {
        name: 'idx_users_is_locked'
      });
    }

    // 2. Create goals table if not exists
    const tables = await queryInterface.showAllTables();
    const tableList = Array.isArray(tables) ? tables.map(t => typeof t === 'object' ? t.tableName || Object.values(t)[0] : t) : [];

    if (!tableList.includes('goals')) {
      await queryInterface.createTable('goals', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        employeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'employees',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        period: {
          type: Sequelize.STRING,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('not_started', 'on_track', 'at_risk', 'completed', 'archived'),
          defaultValue: 'not_started',
          allowNull: false
        },
        progress: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0.00,
          allowNull: false
        },
        dueDate: {
          type: Sequelize.DATEONLY,
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
      });

      await queryInterface.addIndex('goals', ['employeeId'], { name: 'idx_goals_employee_id' });
      await queryInterface.addIndex('goals', ['period'], { name: 'idx_goals_period' });
      await queryInterface.addIndex('goals', ['status'], { name: 'idx_goals_status' });
    }

    // 3. Create key_results table if not exists
    if (!tableList.includes('key_results')) {
      await queryInterface.createTable('key_results', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        goalId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'goals',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        targetValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        currentValue: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0,
          allowNull: false
        },
        metric: {
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
      });

      await queryInterface.addIndex('key_results', ['goalId'], { name: 'idx_key_results_goal_id' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('key_results');
    await queryInterface.dropTable('goals');
    try {
      await queryInterface.removeColumn('users', 'isLocked');
    } catch (e) {
      // ignore
    }
  }
};
