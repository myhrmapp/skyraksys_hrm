/**
 * TaskService - Week 13 Implementation
 * 
 * Centralized business logic for task management:
 * - Task access control (availableToAll, assignedTo logic)
 * - Task permission validation
 * - Bulk operations
 * - Task statistics and analytics
 */

const { Op } = require('sequelize');
const db = require('../../models');

class TaskService {
  /**
   * Check if user can access task
   */
  async canAccessTask(taskId, userId, role) {
    // Admins and managers can access all tasks
    if (['admin', 'manager'].includes(role)) {
      return true;
    }

    // Get task and employee
    const task = await db.Task.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // If task is available to all, allow access
    if (task.availableToAll) {
      return true;
    }

    // Check if task is assigned to this employee
    const employee = await db.Employee.findOne({ where: { userId } });
    if (!employee) {
      return false;
    }

    return task.assignedTo === employee.id;
  }

  /**
   * Get tasks with role-based filtering
   */
  async getTasks(filters, userId, role) {
    const where = { isActive: true };

    // Apply filters
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }

    // Role-based filtering
    if (role === 'employee') {
      const employee = await db.Employee.findOne({ where: { userId } });
      if (employee) {
        where[Op.or] = [
          { availableToAll: true },
          { assignedTo: employee.id }
        ];
      }
    }

    const tasks = await db.Task.findAll({
      where,
      include: [
        {
          model: db.Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: db.Employee,
          as: 'assignee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return tasks;
  }

  /**
   * Validate task creation
   */
  async validateTaskCreation(taskData) {
    // Validate project exists
    const project = await db.Project.findByPk(taskData.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.isActive) {
      throw new Error('Cannot add tasks to inactive project');
    }

    // Validate assignee if provided
    if (taskData.assignedTo) {
      const employee = await db.Employee.findByPk(taskData.assignedTo);
      if (!employee) {
        throw new Error('Assignee not found');
      }
      if (employee.status !== 'Active') {
        throw new Error('Cannot assign to inactive employee');
      }
    }

    // Validate estimated hours if provided
    if (taskData.estimatedHours && taskData.estimatedHours < 0) {
      throw new Error('Estimated hours cannot be negative');
    }

    return true;
  }

  /**
   * Create task with validation
   */
  async createTask(taskData) {
    await this.validateTaskCreation(taskData);

    // Check for duplicate task name in project
    const existing = await db.Task.findOne({
      where: {
        projectId: taskData.projectId,
        name: taskData.name,
        isActive: true
      }
    });

    if (existing) {
      throw new Error('Task with this name already exists in project');
    }

    const task = await db.Task.create(taskData);
    return task;
  }

  /**
   * Update task with validation
   */
  async updateTask(taskId, updates, userId, role) {
    const task = await db.Task.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check access permission
    const canAccess = await this.canAccessTask(taskId, userId, role);
    if (!canAccess) {
      throw new Error('Access denied to this task');
    }

    // Validate assignee if changing
    if (updates.assignedTo) {
      const employee = await db.Employee.findByPk(updates.assignedTo);
      if (!employee) {
        throw new Error('Assignee not found');
      }
      if (employee.status !== 'Active') {
        throw new Error('Cannot assign to inactive employee');
      }
    }

    // Validate status transition
    if (updates.status) {
      this.validateStatusTransition(task.status, updates.status);
    }

    await task.update(updates);
    return task;
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'Not Started': ['In Progress', 'On Hold'],
      'In Progress': ['Completed', 'On Hold'],
      'On Hold': ['In Progress', 'Not Started'],
      'Completed': []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    return true;
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(filters = {}) {
    const where = { isActive: true };

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    const tasks = await db.Task.findAll({ where });

    const stats = {
      total: tasks.length,
      byStatus: {
        notStarted: tasks.filter(t => t.status === 'Not Started').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        onHold: tasks.filter(t => t.status === 'On Hold').length
      },
      byPriority: {
        low: tasks.filter(t => t.priority === 'Low').length,
        medium: tasks.filter(t => t.priority === 'Medium').length,
        high: tasks.filter(t => t.priority === 'High').length,
        critical: tasks.filter(t => t.priority === 'Critical').length
      },
      availableToAll: tasks.filter(t => t.availableToAll).length,
      assigned: tasks.filter(t => t.assignedTo).length,
      unassigned: tasks.filter(t => !t.assignedTo).length
    };

    return stats;
  }

  /**
   * Get tasks by employee
   */
  async getTasksByEmployee(employeeId) {
    const tasks = await db.Task.findAll({
      where: {
        [Op.or]: [
          { assignedTo: employeeId },
          { availableToAll: true }
        ],
        isActive: true
      },
      include: [
        {
          model: db.Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        }
      ],
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    return tasks;
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(taskIds, updates, userId, role) {
    const results = {
      success: [],
      failed: []
    };

    for (const taskId of taskIds) {
      try {
        const task = await this.updateTask(taskId, updates, userId, role);
        results.success.push({ taskId, task });
      } catch (error) {
        results.failed.push({ taskId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk assign tasks
   */
  async bulkAssignTasks(taskIds, assignedTo) {
    // Validate assignee
    const employee = await db.Employee.findByPk(assignedTo);
    if (!employee) {
      throw new Error('Assignee not found');
    }
    if (employee.status !== 'Active') {
      throw new Error('Cannot assign to inactive employee');
    }

    const results = {
      success: [],
      failed: []
    };

    for (const taskId of taskIds) {
      try {
        const task = await db.Task.findByPk(taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        await task.update({ assignedTo });
        results.success.push({ taskId, task });
      } catch (error) {
        results.failed.push({ taskId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check if task can be deleted
   */
  async canDelete(taskId) {
    const task = await db.Task.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check for timesheets
    const timesheetCount = await db.Timesheet.count({
      where: { taskId }
    });

    if (timesheetCount > 0) {
      return {
        canDelete: false,
        reason: `Task has ${timesheetCount} timesheet entries. Cannot delete.`
      };
    }

    return {
      canDelete: true,
      reason: null
    };
  }

  /**
   * Soft delete task
   */
  async deleteTask(taskId) {
    const deleteCheck = await this.canDelete(taskId);
    if (!deleteCheck.canDelete) {
      throw new Error(deleteCheck.reason);
    }

    const task = await db.Task.findByPk(taskId);
    await task.update({ isActive: false });
    
    return task;
  }

  /**
   * Get task workload by employee
   */
  async getEmployeeWorkload(employeeId) {
    const tasks = await this.getTasksByEmployee(employeeId);

    const workload = {
      employeeId,
      totalTasks: tasks.length,
      byStatus: {
        notStarted: tasks.filter(t => t.status === 'Not Started').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        onHold: tasks.filter(t => t.status === 'On Hold').length
      },
      estimatedHours: {
        total: tasks.reduce((sum, t) => sum + parseFloat(t.estimatedHours || 0), 0),
        remaining: tasks
          .filter(t => t.status !== 'Completed')
          .reduce((sum, t) => sum + parseFloat(t.estimatedHours || 0), 0)
      },
      actualHours: {
        total: tasks.reduce((sum, t) => sum + parseFloat(t.actualHours || 0), 0)
      }
    };

    return workload;
  }
}

module.exports = new TaskService();
