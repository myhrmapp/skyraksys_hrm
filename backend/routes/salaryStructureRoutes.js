/**
 * Salary Structure Routes (Refactored)
 * Clean route definitions for salary structure management
 * Refactored from 739 lines to <200 lines
 * 
 * @module routes/salaryStructureRoutes
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Database (inline CRUD - no complex logic to extract)
const db = require('../models');
const { Op } = require('sequelize');

// Middleware
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, validateQuery, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');

// Apply global middleware
router.use(authenticateToken);

/**
 * @route GET /api/salary-structures
 * @desc Get all salary structures with pagination
 * @access Admin/HR
 */
router.get('/',
  authorize(['admin', 'hr']),
  validateQuery(validators.salaryStructureQuerySchema),
  async (req, res, next) => {
    try {
      const {
        employeeId,
        isActive,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};
      if (employeeId) where.employeeId = employeeId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const offset = (page - 1) * limit;

      const { count, rows: salaryStructures } = await db.SalaryStructure.findAndCountAll({
        where,
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'firstName', 'lastName', 'employeeId', 'email']
          }
        ],
        order: [['effectiveFrom', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          salaryStructures,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/salary-structures/employee/:employeeId
 * @desc Get salary structures for specific employee
 * @access Admin/HR/Employee (own data)
 */
router.get('/employee/:employeeId',
  authorize(['admin', 'hr', 'employee']),
  validateParams(validators.employeeIdParamSchema),
  async (req, res, next) => {
    try {
      const { employeeId } = req.params;
      
      // RBAC: Employee can only view own salary structure
      if (req.user.role === 'employee' && 
          req.user.employeeId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own salary structure'
        });
      }

      const salaryStructures = await db.SalaryStructure.findAll({
        where: { employeeId },
        order: [['effectiveFrom', 'DESC']]
      });

      res.json({
        success: true,
        data: salaryStructures
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/salary-structures/employee/:employeeId/current
 * @desc Get current active salary structure for employee
 * @access Admin/HR/Employee (own data)
 */
router.get('/employee/:employeeId/current',
  authorize(['admin', 'hr', 'employee']),
  validateParams(validators.employeeIdParamSchema),
  async (req, res, next) => {
    try {
      const { employeeId } = req.params;
      
      // RBAC: Employee can only view own data
      if (req.user.role === 'employee' && 
          req.user.employeeId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own salary structure'
        });
      }

      const salaryStructure = await db.SalaryStructure.findOne({
        where: {
          employeeId,
          isActive: true,
          effectiveFrom: { [Op.lte]: new Date() }
        },
        order: [['effectiveFrom', 'DESC']]
      });

      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'No active salary structure found'
        });
      }

      res.json({
        success: true,
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/salary-structures/:id
 * @desc Get salary structure by ID
 * @access Admin/HR
 */
router.get('/:id',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const salaryStructure = await db.SalaryStructure.findByPk(id, {
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'firstName', 'lastName', 'employeeId', 'email']
          }
        ]
      });

      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found'
        });
      }

      res.json({
        success: true,
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/salary-structures
 * @desc Create new salary structure
 * @access Admin/HR
 */
router.post('/',
  authorize(['admin', 'hr']),
  validate(validators.createSalaryStructureSchema),
  async (req, res, next) => {
    try {
      const salaryData = req.body;

      // Map frontend field names to model field names
      if (salaryData.providentFund !== undefined && salaryData.pfContribution === undefined) {
        salaryData.pfContribution = salaryData.providentFund;
      }
      if (salaryData.incomeTax !== undefined && salaryData.tds === undefined) {
        salaryData.tds = salaryData.incomeTax;
      }
      // Aggregate individual allowance fields into the model's single allowances field
      if (salaryData.allowances === undefined) {
        salaryData.allowances = (parseFloat(salaryData.transportAllowance) || 0)
          + (parseFloat(salaryData.medicalAllowance) || 0)
          + (parseFloat(salaryData.specialAllowance) || 0);
      }

      // Deactivate previous salary structures if making this one active
      if (salaryData.isActive) {
        await db.SalaryStructure.update(
          { isActive: false },
          { where: { employeeId: salaryData.employeeId, isActive: true } }
        );
      }

      const salaryStructure = await db.SalaryStructure.create(salaryData);

      res.status(201).json({
        success: true,
        message: 'Salary structure created successfully',
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/salary-structures/:id
 * @desc Update salary structure
 * @access Admin/HR
 */
router.put('/:id',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  validate(validators.updateSalaryStructureSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Map frontend field names to model field names
      if (updates.providentFund !== undefined && updates.pfContribution === undefined) {
        updates.pfContribution = updates.providentFund;
      }
      if (updates.incomeTax !== undefined && updates.tds === undefined) {
        updates.tds = updates.incomeTax;
      }
      if (updates.allowances === undefined && (updates.transportAllowance !== undefined || updates.medicalAllowance !== undefined || updates.specialAllowance !== undefined)) {
        updates.allowances = (parseFloat(updates.transportAllowance) || 0)
          + (parseFloat(updates.medicalAllowance) || 0)
          + (parseFloat(updates.specialAllowance) || 0);
      }

      const salaryStructure = await db.SalaryStructure.findByPk(id);
      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found'
        });
      }

      // If activating this structure, deactivate others
      if (updates.isActive === true) {
        await db.SalaryStructure.update(
          { isActive: false },
          {
            where: {
              employeeId: salaryStructure.employeeId,
              id: { [Op.ne]: id },
              isActive: true
            }
          }
        );
      }

      await salaryStructure.update(updates);

      res.json({
        success: true,
        message: 'Salary structure updated successfully',
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/salary-structures/:id/activate
 * @desc Activate salary structure
 * @access Admin/HR
 */
router.post('/:id/activate',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const salaryStructure = await db.SalaryStructure.findByPk(id);
      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found'
        });
      }

      // Deactivate other structures
      await db.SalaryStructure.update(
        { isActive: false },
        {
          where: {
            employeeId: salaryStructure.employeeId,
            id: { [Op.ne]: id },
            isActive: true
          }
        }
      );

      // Activate this one
      await salaryStructure.update({ isActive: true });

      res.json({
        success: true,
        message: 'Salary structure activated successfully',
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/salary-structures/:id/deactivate
 * @desc Deactivate salary structure
 * @access Admin/HR
 */
router.post('/:id/deactivate',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const salaryStructure = await db.SalaryStructure.findByPk(id);
      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found'
        });
      }

      await salaryStructure.update({ isActive: false });

      res.json({
        success: true,
        message: 'Salary structure deactivated successfully',
        data: salaryStructure
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/salary-structures/:id
 * @desc Delete salary structure (Admin only)
 * @access Admin
 */
router.delete('/:id',
  authorize(['admin']),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const salaryStructure = await db.SalaryStructure.findByPk(id);
      if (!salaryStructure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found'
        });
      }

      await salaryStructure.destroy();

      res.json({
        success: true,
        message: 'Salary structure deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
