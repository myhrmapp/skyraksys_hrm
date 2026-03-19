const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { positionSchema } = require('../middleware/validators/position.validator');
const db = require('../models');
const logger = require('../utils/logger');

const Position = db.Position;
const Department = db.Department;
const Employee = db.Employee;
const router = express.Router();

/**
 * @swagger
 * /api/positions:
 *   get:
 *     summary: Get all positions
 *     description: Retrieve all positions with department and employee details
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Positions retrieved successfully
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
 *                     $ref: '#/components/schemas/Position'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get all positions (with optional pagination)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const queryOptions = {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'status']
        }
      ]
    };

    // If pagination params provided, use findAndCountAll
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
      queryOptions.limit = pageSize;
      queryOptions.offset = (pageNum - 1) * pageSize;

      const result = await Position.findAndCountAll(queryOptions);
      return res.json({
        success: true,
        data: result.rows,
        totalCount: result.count,
        totalPages: Math.ceil(result.count / pageSize),
        currentPage: pageNum
      });
    }

    // No pagination — return all (backward compatible)
    const positions = await Position.findAll(queryOptions);

    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    logger.error('Error fetching positions:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/positions/{id}:
 *   get:
 *     summary: Get position by ID
 *     description: Retrieve detailed information about a specific position
 *     tags: [Positions]
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
 *         description: Position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Position'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Get position by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const position = await Position.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'status']
        }
      ]
    });

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    logger.error('Error fetching position:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/positions:
 *   post:
 *     summary: Create new position
 *     description: Create a new position - Admin/HR only
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - departmentId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior Software Engineer
 *               description:
 *                 type: string
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               level:
 *                 type: string
 *                 example: Senior
 *     responses:
 *       201:
 *         description: Position created successfully
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
 *                   $ref: '#/components/schemas/Position'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Create new position (admin/hr only)
router.post('/', authenticateToken, authorize('admin', 'hr'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = positionSchema.create.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => d.message)
      });
    }

    const { title, description, departmentId, level } = value;

    // Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department not found'
      });
    }

    const position = await Position.create({
      title,
      description,
      departmentId,
      level: level || 'Entry'
    });

    const createdPosition = await Position.findByPk(position.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: createdPosition
    });
  } catch (error) {
    logger.error('Error creating position:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/positions/{id}:
 *   put:
 *     summary: Update position
 *     description: Update position details - Admin/HR only
 *     tags: [Positions]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               level:
 *                 type: string
 *     responses:
 *       200:
 *         description: Position updated successfully
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
 *                   $ref: '#/components/schemas/Position'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete position
 *     description: Delete a position - Admin only
 *     tags: [Positions]
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
 *         description: Position deleted successfully
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
// Update position (admin/hr only)
router.put('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = positionSchema.update.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => d.message)
      });
    }

    const { title, description, departmentId, level, code, minSalary, maxSalary, requirements, responsibilities, isActive } = value;
    
    const position = await Position.findByPk(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // If departmentId is being changed, validate it exists
    if (departmentId && departmentId !== position.departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    await position.update({
      title: title !== undefined ? title : position.title,
      description: description !== undefined ? description : position.description,
      departmentId: departmentId !== undefined ? departmentId : position.departmentId,
      level: level !== undefined ? level : position.level,
      ...(code !== undefined && { code }),
      ...(minSalary !== undefined && { minSalary }),
      ...(maxSalary !== undefined && { maxSalary }),
      ...(requirements !== undefined && { requirements }),
      ...(responsibilities !== undefined && { responsibilities }),
      ...(isActive !== undefined && { isActive })
    });

    const updatedPosition = await Position.findByPk(position.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Position updated successfully',
      data: updatedPosition
    });
  } catch (error) {
    logger.error('Error updating position:', { detail: error });
    next(error);
  }
});

// Delete position (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const position = await Position.findByPk(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // Check if position has employees
    const employeeCount = await Employee.count({ where: { positionId: req.params.id } });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete position with assigned employees'
      });
    }

    await position.destroy();

    res.json({
      success: true,
      message: 'Position deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting position:', { detail: error });
    next(error);
  }
});

module.exports = router;
