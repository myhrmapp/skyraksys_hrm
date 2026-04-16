const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validate');
const db = require('../models');
const auditService = require('../services/audit.service');
const leaveBalanceValidation = require('../services/leave-balance-validation.service');
const logger = require('../utils/logger');

const LeaveBalance = db.LeaveBalance;
const LeaveType = db.LeaveType;
const Employee = db.Employee;
const { Op } = require('sequelize');
const router = express.Router();

// Query schema for leave balance list
const leaveBalanceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(10),
  employeeId: Joi.string().uuid().optional(),
  leaveTypeId: Joi.string().uuid().optional(),
  year: Joi.number().integer().min(2000).max(2100).default(new Date().getFullYear()),
  employeeStatus: Joi.string().valid('all', 'active', 'inactive').default('all'),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'year').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
});

// Middleware to ensure all routes are authenticated and admin/HR only
router.use(authenticateToken);
router.use(authorize('admin', 'hr'));

// GET all leave balances with filtering and pagination
router.get('/', validateQuery(leaveBalanceQuerySchema), async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            employeeId, 
            leaveTypeId, 
            year = new Date().getFullYear(),
            employeeStatus = 'all',   // 'all' | 'active' | 'inactive'
            sortBy = 'createdAt', 
            sortOrder = 'DESC' 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let where = { year };
        
        if (employeeId) where.employeeId = employeeId;
        if (leaveTypeId) where.leaveTypeId = leaveTypeId;

        // Build employee include filter based on status
        const employeeInclude = {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'deletedAt'],
            paranoid: false
        };
        if (employeeStatus === 'active') {
            employeeInclude.where = { deletedAt: null };
            employeeInclude.required = true;
        } else if (employeeStatus === 'inactive') {
            employeeInclude.where = { deletedAt: { [Op.ne]: null } };
            employeeInclude.required = true;
        }

        const { count, rows: balances } = await LeaveBalance.findAndCountAll({
            where,
            include: [
                employeeInclude,
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name', 'description']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder]]
        });

        res.json({
            success: true,
            data: {
                balances,
                pagination: {
                    total: count,
                    pages: Math.ceil(count / limit),
                    currentPage: parseInt(page),
                    hasNext: offset + limit < count,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching leave balances:', { detail: error });
        next(error);
    }
});

// GET specific leave balance
router.get('/:id', async (req, res, next) => {
    try {
        const balance = await LeaveBalance.findByPk(req.params.id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: 'Leave balance not found'
            });
        }

        res.json({
            success: true,
            data: balance
        });
    } catch (error) {
        logger.error('Error fetching leave balance:', { detail: error });
        next(error);
    }
});

// POST create new leave balance
router.post('/', async (req, res, next) => {
    try {
        const { 
            employeeId, 
            leaveTypeId, 
            year = new Date().getFullYear(),
            totalAccrued = 0,
            carryForward = 0
        } = req.body;

        if (!employeeId || !leaveTypeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID and Leave Type ID are required'
            });
        }

        // Check if balance already exists for this employee, leave type, and year
        const existingBalance = await LeaveBalance.findOne({
            where: { employeeId, leaveTypeId, year }
        });

        if (existingBalance) {
            return res.status(409).json({
                success: false,
                message: 'Leave balance already exists for this employee, leave type, and year'
            });
        }

        // Verify employee exists
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Verify leave type exists
        const leaveType = await LeaveType.findByPk(leaveTypeId);
        if (!leaveType) {
            return res.status(404).json({
                success: false,
                message: 'Leave type not found'
            });
        }

        // Validate leave balance data
        const validation = leaveBalanceValidation.validateLeaveBalance({
            totalAccrued,
            totalTaken: 0,
            totalPending: 0,
            carryForward
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid leave balance data',
                errors: validation.errors
            });
        }

        const balance = validation.calculatedBalance;

        const leaveBalance = await LeaveBalance.create({
            employeeId,
            leaveTypeId,
            year,
            totalAccrued,
            totalTaken: 0,
            totalPending: 0,
            balance,
            carryForward
        });

        const createdBalance = await LeaveBalance.findByPk(leaveBalance.id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        // Audit log: Leave balance creation
        await auditService.log({
            action: 'CREATED',
            entityType: 'LeaveBalance',
            entityId: createdBalance.id,
            userId: req.user.id,
            newValues: {
                employeeId,
                leaveTypeId,
                year,
                totalAccrued,
                balance
            },
            reason: req.body.reason || 'Admin created leave balance',
            req
        });

        res.status(201).json({
            success: true,
            message: 'Leave balance created successfully',
            data: createdBalance
        });
    } catch (error) {
        logger.error('Error creating leave balance:', { detail: error });
        next(error);
    }
});

// PUT update leave balance
router.put('/:id', async (req, res, next) => {
    try {
        const { 
            totalAccrued, 
            totalTaken, 
            totalPending, 
            carryForward 
        } = req.body;

        const leaveBalance = await LeaveBalance.findByPk(req.params.id);
        if (!leaveBalance) {
            return res.status(404).json({
                success: false,
                message: 'Leave balance not found'
            });
        }

        // Capture old values for audit
        const oldValues = {
            totalAccrued: leaveBalance.totalAccrued,
            totalTaken: leaveBalance.totalTaken,
            totalPending: leaveBalance.totalPending,
            balance: leaveBalance.balance,
            carryForward: leaveBalance.carryForward
        };

        // Prepare adjustment data
        const adjustment = {};
        if (totalAccrued !== undefined) adjustment.totalAccrued = totalAccrued;
        if (totalTaken !== undefined) adjustment.totalTaken = totalTaken;
        if (totalPending !== undefined) adjustment.totalPending = totalPending;
        if (carryForward !== undefined) adjustment.carryForward = carryForward;

        // Validate balance adjustment
        const validation = leaveBalanceValidation.validateBalanceAdjustment(leaveBalance, adjustment);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid balance adjustment',
                errors: validation.errors
            });
        }

        // Calculate new balance values
        const newTotalAccrued = totalAccrued !== undefined ? totalAccrued : leaveBalance.totalAccrued;
        const newCarryForward = carryForward !== undefined ? carryForward : leaveBalance.carryForward;
        const newTotalTaken = totalTaken !== undefined ? totalTaken : leaveBalance.totalTaken;
        const newTotalPending = totalPending !== undefined ? totalPending : leaveBalance.totalPending;
        const newBalance = validation.newBalance;

        await leaveBalance.update({
            totalAccrued: newTotalAccrued,
            totalTaken: newTotalTaken,
            totalPending: newTotalPending,
            balance: newBalance,
            carryForward: newCarryForward
        });

        const updatedBalance = await LeaveBalance.findByPk(req.params.id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        // Audit log: Leave balance update
        await auditService.log({
            action: 'BALANCE_ADJUSTED',
            entityType: 'LeaveBalance',
            entityId: req.params.id,
            userId: req.user.id,
            oldValues,
            newValues: {
                totalAccrued: newTotalAccrued,
                totalTaken: newTotalTaken,
                totalPending: newTotalPending,
                balance: newBalance,
                carryForward: newCarryForward
            },
            reason: req.body.reason || 'Admin adjusted leave balance',
            req
        });

        res.json({
            success: true,
            message: 'Leave balance updated successfully',
            data: updatedBalance
        });
    } catch (error) {
        logger.error('Error updating leave balance:', { detail: error });
        next(error);
    }
});

// DELETE leave balance
router.delete('/:id', async (req, res, next) => {
    try {
        const leaveBalance = await LeaveBalance.findByPk(req.params.id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeId', 'firstName', 'lastName']
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name']
                }
            ]
        });
        
        if (!leaveBalance) {
            return res.status(404).json({
                success: false,
                message: 'Leave balance not found'
            });
        }

        // Capture data for audit before deletion
        const oldValues = {
            employeeId: leaveBalance.employeeId,
            leaveTypeId: leaveBalance.leaveTypeId,
            year: leaveBalance.year,
            totalAccrued: leaveBalance.totalAccrued,
            totalTaken: leaveBalance.totalTaken,
            balance: leaveBalance.balance
        };

        await leaveBalance.destroy();

        // Audit log: Leave balance deletion
        await auditService.log({
            action: 'DELETED',
            entityType: 'LeaveBalance',
            entityId: req.params.id,
            userId: req.user.id,
            oldValues,
            reason: req.body.reason || 'Admin deleted leave balance',
            req
        });

        res.json({
            success: true,
            message: 'Leave balance deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting leave balance:', { detail: error });
        next(error);
    }
});

// POST bulk create leave balances for all employees
router.post('/bulk/initialize', async (req, res, next) => {
    try {
        const { 
            year = new Date().getFullYear(),
            leaveAllocations = {} // { leaveTypeId: allocation, ... }
        } = req.body;

        if (!leaveAllocations || Object.keys(leaveAllocations).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave allocations are required'
            });
        }

        // Get all active employees
        const employees = await Employee.findAll({
            where: { status: 'Active' }, // Capital 'A' to match enum
            attributes: ['id']
        });

        // Get all leave types to validate allocations
        const leaveTypes = await LeaveType.findAll({
            attributes: ['id', 'name']
        });

        const validLeaveTypeIds = leaveTypes.map(lt => lt.id);
        
        // Validate all provided leave type IDs
        for (const leaveTypeId of Object.keys(leaveAllocations)) {
            if (!validLeaveTypeIds.includes(leaveTypeId)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid leave type ID: ${leaveTypeId}`
                });
            }
        }

        const balancesToCreate = [];
        const balancesToUpdate = [];

        for (const employee of employees) {
            for (const [leaveTypeId, allocation] of Object.entries(leaveAllocations)) {
                // Check if balance already exists
                const existing = await LeaveBalance.findOne({
                    where: { employeeId: employee.id, leaveTypeId, year }
                });

                if (existing) {
                    // Add to existing balance
                    const newTotalAccrued = parseFloat(existing.totalAccrued) + parseFloat(allocation);
                    const newBalance = newTotalAccrued + parseFloat(existing.carryForward) - parseFloat(existing.totalTaken) - parseFloat(existing.totalPending);
                    
                    balancesToUpdate.push({
                        id: existing.id,
                        totalAccrued: newTotalAccrued,
                        balance: newBalance
                    });
                } else {
                    // Create new balance
                    balancesToCreate.push({
                        employeeId: employee.id,
                        leaveTypeId,
                        year,
                        totalAccrued: parseFloat(allocation),
                        totalTaken: 0,
                        totalPending: 0,
                        balance: parseFloat(allocation),
                        carryForward: 0
                    });
                }
            }
        }

        // Bulk create new balances
        if (balancesToCreate.length > 0) {
            await LeaveBalance.bulkCreate(balancesToCreate);
        }

        // Update existing balances
        if (balancesToUpdate.length > 0) {
            await Promise.all(
                balancesToUpdate.map(update =>
                    LeaveBalance.update(
                        { 
                            totalAccrued: update.totalAccrued,
                            balance: update.balance
                        },
                        { where: { id: update.id } }
                    )
                )
            );
        }

        res.status(201).json({
            success: true,
            message: 'Leave balances initialized successfully',
            data: {
                created: balancesToCreate.length,
                updated: balancesToUpdate.length,
                employees: employees.length,
                leaveTypes: Object.keys(leaveAllocations).length
            }
        });
    } catch (error) {
        logger.error('Error initializing leave balances:', { detail: error });
        next(error);
    }
});

// GET leave balance summary
router.get('/summary/overview', async (req, res, next) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const summary = await LeaveBalance.findAll({
            where: { year },
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName']
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name']
                }
            ],
            attributes: [
                'leaveTypeId',
                [db.sequelize.fn('COUNT', db.sequelize.col('LeaveBalance.id')), 'employeeCount'],
                [db.sequelize.fn('SUM', db.sequelize.col('totalAccrued')), 'totalAccrued'],
                [db.sequelize.fn('SUM', db.sequelize.col('totalTaken')), 'totalTaken'],
                [db.sequelize.fn('SUM', db.sequelize.col('balance')), 'totalBalance']
            ],
            group: ['leaveTypeId', 'leaveType.id'],
            raw: false
        });

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error('Error fetching leave balance summary:', { detail: error });
        next(error);
    }
});

module.exports = router;
