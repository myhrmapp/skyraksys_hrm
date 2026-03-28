const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { departmentSchema } = require('../middleware/validators/department.validator');
const db = require('../models');
const logger = require('../utils/logger');

const Department = db.Department;
const Employee = db.Employee;
const Position = db.Position;
const router = express.Router();

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Get all departments
 *     description: Retrieve all departments with employees and positions
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get all departments (with optional pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const queryOptions = {
      include: [
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photoUrl']
        },
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'status']
        },
        {
          model: Position,
          as: 'positions',
          attributes: ['id', 'title', 'description']
        }
      ]
    };

    // If pagination params provided, use findAndCountAll
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
      queryOptions.limit = pageSize;
      queryOptions.offset = (pageNum - 1) * pageSize;

      const result = await Department.findAndCountAll(queryOptions);
      return res.json({
        success: true,
        data: result.rows,
        totalCount: result.count,
        totalPages: Math.ceil(result.count / pageSize),
        currentPage: pageNum
      });
    }

    // No pagination — return all (backward compatible)
    const departments = await Department.findAll(queryOptions);

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    logger.error('Error fetching departments:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     description: Retrieve detailed information about a specific department
 *     tags: [Departments]
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
 *         description: Department retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Department'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Get department by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format'
      });
    }
    const department = await Department.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photoUrl']
        },
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'status']
        },
        {
          model: Position,
          as: 'positions',
          attributes: ['id', 'title', 'description']
        }
      ]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    logger.error('Error fetching department:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create new department
 *     description: Create a new department - Admin/HR only
 *     tags: [Departments]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Engineering
 *               description:
 *                 type: string
 *                 example: Software development and engineering team
 *     responses:
 *       201:
 *         description: Department created successfully
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
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Create new department (admin/hr only)
router.post('/', authenticateToken, authorize('admin', 'hr'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = departmentSchema.create.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => d.message)
      });
    }

    const { name, description, managerId } = value;

    const department = await Department.create({
      name,
      description,
      managerId: managerId || null
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    logger.error('Error creating department:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update department
 *     description: Update department details - Admin/HR only
 *     tags: [Departments]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated successfully
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
 *                   $ref: '#/components/schemas/Department'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Update department (admin/hr only)
router.put('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = departmentSchema.update.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => d.message)
      });
    }

    const { name, description, managerId } = value;
    
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.update({
      name: name !== undefined ? name : department.name,
      description: description !== undefined ? description : department.description,
      managerId: managerId !== undefined ? managerId : department.managerId
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    logger.error('Error updating department:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Delete department
 *     description: Delete a department - Admin only
 *     tags: [Departments]
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
 *         description: Department deleted successfully
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
// Delete department (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has employees
    const employeeCount = await Employee.count({ where: { departmentId: req.params.id } });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${employeeCount} active employees. Please reassign them first.`
      });
    }

    await department.destroy();

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting department:', { detail: error });
    next(error);
  }
});

module.exports = router;
