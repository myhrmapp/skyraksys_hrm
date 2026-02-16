/**
 * ProjectService - Week 13 Implementation
 * 
 * Centralized business logic for project management:
 * - Project validation (dates, status transitions)
 * - Project statistics and analytics
 * - Bulk operations with conflict detection
 * - Manager assignment validation
 */

const { Op } = require('sequelize');
const db = require('../../models');

class ProjectService {
  /**
   * Validate project dates
   */
  validateDates(startDate, endDate) {
    if (!startDate) {
      throw new Error('Start date is required');
    }

    if (endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        throw new Error('End date must be after start date');
      }
    }

    return true;
  }

  /**
   * Validate status transition
   */
  async validateStatusTransition(projectId, newStatus) {
    const project = await db.Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const validTransitions = {
      'Planning': ['Active', 'Cancelled'],
      'Active': ['On Hold', 'Completed', 'Cancelled'],
      'On Hold': ['Active', 'Cancelled'],
      'Completed': [],
      'Cancelled': []
    };

    if (!validTransitions[project.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${project.status} to ${newStatus}`);
    }

    return true;
  }

  /**
   * Validate manager assignment
   */
  async validateManager(managerId) {
    if (!managerId) {
      return true; // Manager is optional
    }

    const employee = await db.Employee.findByPk(managerId);
    if (!employee) {
      throw new Error('Manager not found');
    }

    if (employee.status !== 'Active') {
      throw new Error('Manager must be active');
    }

    return true;
  }

  /**
   * Create project with validation
   */
  async createProject(projectData) {
    // Validate dates
    this.validateDates(projectData.startDate, projectData.endDate);

    // Validate manager
    await this.validateManager(projectData.managerId);

    // Check for duplicate project name (active projects only)
    const existing = await db.Project.findOne({
      where: {
        name: projectData.name,
        isActive: true
      }
    });

    if (existing) {
      throw new Error('Project with this name already exists');
    }

    // Create project
    const project = await db.Project.create(projectData);
    return project;
  }

  /**
   * Update project with validation
   */
  async updateProject(projectId, updates) {
    const project = await db.Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Validate dates if provided
    const startDate = updates.startDate || project.startDate;
    const endDate = updates.endDate || project.endDate;
    this.validateDates(startDate, endDate);

    // Validate status transition if status is changing
    if (updates.status && updates.status !== project.status) {
      await this.validateStatusTransition(projectId, updates.status);
    }

    // Validate manager if changing
    if (updates.managerId) {
      await this.validateManager(updates.managerId);
    }

    // Update project
    await project.update(updates);
    return project;
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(filters = {}) {
    const where = { isActive: true };
    
    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const projects = await db.Project.findAll({ where });

    const stats = {
      total: projects.length,
      byStatus: {
        planning: projects.filter(p => p.status === 'Planning').length,
        active: projects.filter(p => p.status === 'Active').length,
        onHold: projects.filter(p => p.status === 'On Hold').length,
        completed: projects.filter(p => p.status === 'Completed').length,
        cancelled: projects.filter(p => p.status === 'Cancelled').length
      }
    };

    return stats;
  }

  /**
   * Get project details with tasks and timesheets
   */
  async getProjectDetails(projectId) {
    const project = await db.Project.findByPk(projectId, {
      include: [
        {
          model: db.Employee,
          as: 'manager',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
        },
        {
          model: db.Task,
          as: 'tasks',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Get projects by manager
   */
  async getProjectsByManager(managerId) {
    const projects = await db.Project.findAll({
      where: {
        managerId,
        isActive: true
      },
      include: [
        {
          model: db.Task,
          as: 'tasks',
          where: { isActive: true },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return projects;
  }

  /**
   * Bulk update projects
   */
  async bulkUpdateProjects(projectIds, updates) {
    const results = {
      success: [],
      failed: []
    };

    for (const projectId of projectIds) {
      try {
        const project = await this.updateProject(projectId, updates);
        results.success.push({ projectId, project });
      } catch (error) {
        results.failed.push({ projectId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check if project can be deleted
   */
  async canDelete(projectId) {
    const project = await db.Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check for active tasks
    const taskCount = await db.Task.count({
      where: {
        projectId,
        isActive: true
      }
    });

    if (taskCount > 0) {
      return {
        canDelete: false,
        reason: `Project has ${taskCount} active tasks. Archive tasks first.`
      };
    }

    // Check for timesheets
    const timesheetCount = await db.Timesheet.count({
      where: {
        projectId
      }
    });

    if (timesheetCount > 0) {
      return {
        canDelete: false,
        reason: `Project has ${timesheetCount} timesheet entries. Cannot delete.`
      };
    }

    return {
      canDelete: true,
      reason: null
    };
  }

  /**
   * Soft delete project
   */
  async deleteProject(projectId) {
    const deleteCheck = await this.canDelete(projectId);
    if (!deleteCheck.canDelete) {
      throw new Error(deleteCheck.reason);
    }

    const project = await db.Project.findByPk(projectId);
    await project.update({ isActive: false });
    
    return project;
  }

  /**
   * Get project timeline/milestones
   */
  async getProjectTimeline(projectId) {
    const project = await db.Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await db.Task.findAll({
      where: { projectId, isActive: true },
      order: [['createdAt', 'ASC']]
    });

    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const now = new Date();

    let progress = 0;
    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;
      progress = Math.round((completedTasks / tasks.length) * 100);
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate
      },
      timeline: {
        startDate,
        endDate,
        daysElapsed: Math.floor((now - startDate) / (1000 * 60 * 60 * 24)),
        daysRemaining: endDate ? Math.floor((endDate - now) / (1000 * 60 * 60 * 24)) : null
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        notStarted: tasks.filter(t => t.status === 'Not Started').length,
        onHold: tasks.filter(t => t.status === 'On Hold').length
      },
      progress
    };
  }
}

module.exports = new ProjectService();
