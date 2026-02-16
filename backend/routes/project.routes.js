const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { projectSchema } = require('../middleware/validators/project.validator');
const logger = require('../utils/logger');
const db = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     description: Retrieve all active projects with tasks
 *     tags: [Projects & Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: Create new project
 *     description: Create a new project - Admin/Manager only
 *     tags: [Projects & Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *               managerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Get all projects (with optional pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, managerId, page, limit } = req.query;
    
    let whereCondition = { isActive: true };
    if (status) whereCondition.status = status;
    if (managerId) whereCondition.managerId = managerId;

    // Build include options based on user role
    const taskInclude = {
      model: db.Task,
      as: 'tasks',
      attributes: ['id', 'name', 'status', 'priority', 'assignedTo', 'availableToAll'],
      where: { isActive: true },
      required: false,
      separate: true // This ensures projects without tasks are still shown
    };

    // Filter tasks for employees (but don't filter projects)
    if (req.userRole === 'employee') {
      taskInclude.where = {
        isActive: true,
        [Op.or]: [
          { availableToAll: true },
          { assignedTo: req.employeeId }
        ]
      };
    }

    const queryOptions = {
      where: whereCondition,
      include: [
        {
          model: db.Employee,
          as: 'manager',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
        },
        taskInclude
      ],
      order: [['createdAt', 'DESC']]
    };

    // If pagination params provided, use findAndCountAll
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
      queryOptions.limit = pageSize;
      queryOptions.offset = (pageNum - 1) * pageSize;

      const result = await db.Project.findAndCountAll(queryOptions);
      return res.json({
        success: true,
        data: result.rows,
        totalCount: result.count,
        totalPages: Math.ceil(result.count / pageSize),
        currentPage: pageNum
      });
    }

    // No pagination — return all (backward compatible)
    const projects = await db.Project.findAll(queryOptions);

    logger.info(`Fetched ${projects.length} projects for role: ${req.userRole}`);

    res.json({ success: true, data: projects });
  } catch (error) {
    logger.error('Error fetching projects:', { detail: error });
    next(error);
  }
});

// Get project by ID
/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     description: Retrieve detailed project information with tasks
 *     tags: [Projects & Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update project
 *     description: Update project details - Admin/Manager only
 *     tags: [Projects & Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete project
 *     description: Soft delete a project - Admin only
 *     tags: [Projects & Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const project = await db.Project.findByPk(req.params.id, {
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
          required: false,
          include: [{
            model: db.Employee,
            as: 'assignee',
            attributes: ['id', 'employeeId', 'firstName', 'lastName']
          }]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    logger.error('Error fetching project:', { detail: error });
    next(error);
  }
});

// Create new project (admin/manager only)
router.post('/', authenticateToken, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = projectSchema.create.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    // Validate manager if provided (skip empty strings and null values)
    if (value.managerId && value.managerId !== null && value.managerId.trim() !== '') {
      const manager = await db.Employee.findByPk(value.managerId);
      if (!manager) {
        return res.status(400).json({
          success: false,
          message: 'Manager not found'
        });
      }
    }

    // Validate dates
    if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Check for duplicate project name (active projects only)
    const existing = await db.Project.findOne({
      where: {
        name: value.name,
        isActive: true
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Project with this name already exists'
      });
    }

    // Create project
    const project = await db.Project.create(value);

    // Return with manager details
    const createdProject = await db.Project.findByPk(project.id, {
      include: [{
        model: db.Employee,
        as: 'manager',
        attributes: ['id', 'employeeId', 'firstName', 'lastName']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: createdProject
    });
  } catch (error) {
    logger.error('Error creating project:', { detail: error });
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Project name already exists'
      });
    }

    next(error);
  }
});

// Update project (admin/manager only)
router.put('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = projectSchema.update.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const project = await db.Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate manager if provided (skip empty strings and null values)
    if (value.managerId && value.managerId !== null && value.managerId.trim() !== '') {
      const manager = await db.Employee.findByPk(value.managerId);
      if (!manager) {
        return res.status(400).json({
          success: false,
          message: 'Manager not found'
        });
      }
    }

    // Validate dates
    const finalStartDate = value.startDate || project.startDate;
    const finalEndDate = value.endDate || project.endDate;
    
    if (finalStartDate && finalEndDate && new Date(finalEndDate) < new Date(finalStartDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Update project
    await project.update(value);

    // Return with manager details
    const updatedProject = await db.Project.findByPk(project.id, {
      include: [{
        model: db.Employee,
        as: 'manager',
        attributes: ['id', 'employeeId', 'firstName', 'lastName']
      }]
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    logger.error('Error updating project:', { detail: error });
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Project name already exists'
      });
    }

    next(error);
  }
});

// Delete project (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const project = await db.Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Soft delete
    await project.update({ isActive: false });
    
    // Also soft delete associated tasks
    await db.Task.update(
      { isActive: false },
      { where: { projectId: req.params.id } }
    );

    res.json({
      success: true,
      message: 'Project and associated tasks deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting project:', { detail: error });
    next(error);
  }
});

// Get project statistics
router.get('/:id/stats', authenticateToken, async (req, res, next) => {
  try {
    const project = await db.Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const tasks = await db.Task.findAll({
      where: { projectId: req.params.id, isActive: true },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', '*'), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('estimatedHours')), 'totalEstimated'],
        [db.sequelize.fn('SUM', db.sequelize.col('actualHours')), 'totalActual']
      ],
      group: ['status'],
      raw: true
    });

    const stats = {
      projectId: project.id,
      projectName: project.name,
      projectStatus: project.status,
      tasksByStatus: tasks,
      totalTasks: tasks.reduce((sum, t) => sum + parseInt(t.count), 0)
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching project stats:', { detail: error });
    next(error);
  }
});

// Get project timeline
router.get('/:id/timeline', authenticateToken, async (req, res, next) => {
  try {
    const project = await db.Project.findByPk(req.params.id, {
      include: [{
        model: db.Task,
        as: 'tasks',
        where: { isActive: true },
        required: false,
        order: [['createdAt', 'ASC']]
      }]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Calculate progress
    const tasks = project.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate time metrics
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const now = new Date();

    let daysElapsed = 0;
    let daysRemaining = null;
    let totalDays = null;

    if (startDate) {
      daysElapsed = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
    }

    if (endDate) {
      daysRemaining = Math.max(0, Math.floor((endDate - now) / (1000 * 60 * 60 * 24)));
      if (startDate) {
        totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      }
    }

    const timeline = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate
      },
      progress: {
        percentage: progress,
        completedTasks,
        totalTasks,
        inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
        notStartedTasks: tasks.filter(t => t.status === 'Not Started').length
      },
      timeline: {
        daysElapsed,
        daysRemaining,
        totalDays,
        isOverdue: endDate && now > endDate
      },
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        assignedTo: t.assignedTo,
        createdAt: t.createdAt
      }))
    };

    res.json({ success: true, data: timeline });
  } catch (error) {
    logger.error('Error fetching project timeline:', { detail: error });
    next(error);
  }
});

module.exports = router;
