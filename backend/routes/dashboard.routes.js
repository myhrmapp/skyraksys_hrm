const express = require('express');
const { authenticateToken, isAdminOrHR } = require('../middleware/auth');
const LogHelper = require('../utils/logHelper');
const { logger } = require('../config/logger');
const db = require('../models');
const DashboardService = require('../services/DashboardService');

const router = express.Router();

// Initialize service
const dashboardService = new DashboardService(db);

// Employee dashboard stats (any authenticated user can access their own data)
router.get('/employee-stats', authenticateToken, async (req, res, next) => {
    try {
        const data = await dashboardService.getEmployeeStats(req.employeeId);
        res.json({ success: true, data });
    } catch (error) {
        LogHelper.logError(error, { context: 'Fetching employee dashboard stats', employeeId: req.employeeId }, req);
        next(error);
    }
});

// General dashboard stats (accessible to all authenticated users)
router.get('/stats', authenticateToken, async (req, res, next) => {
    try {
        logger.info('Dashboard stats requested', {
            userId: req.user.id,
            role: req.user.role,
            email: req.user.email
        });

        const userRole = req.user.role?.toLowerCase();
        
        // Admin/HR: Full stats
        if (['admin', 'hr'].includes(userRole)) {
            logger.debug('Admin/HR user detected, fetching full stats', { userId: req.user.id, role: userRole });
            const data = await dashboardService.getAdminStats();
            logger.debug('Returning admin/HR stats', { hasAdminStats: true, userId: req.user.id });
            return res.json({ success: true, data });
        }

        // Manager: Team stats
        if (userRole === 'manager') {
            logger.debug('Manager user detected, fetching team stats', { userId: req.user.id, employeeId: req.employeeId });
            const data = await dashboardService.getManagerStats(req.employeeId, req.user.id);
            logger.debug('Returning manager team stats', { hasTeamStats: true, userId: req.user.id });
            return res.json({ success: true, data });
        }

        // Employee: Basic stats
        logger.debug('Employee user, returning basic stats', { userId: req.user.id, role: req.user.role });
        const basicStats = {
            userInfo: {
                id: req.user.id,
                role: req.user.role,
                employeeId: req.employeeId
            },
            serverTime: new Date().toISOString(),
            systemStatus: 'operational'
        };

        res.json({ success: true, data: basicStats });
    } catch (error) {
        LogHelper.logError(error, { context: 'Fetching dashboard stats', userId: req.user?.id, role: req.user?.role }, req);
        next(error);
    }
});

// Admin/HR dashboard stats (admin/HR access required)
router.get('/admin-stats', authenticateToken, isAdminOrHR, async (req, res, next) => {
    try {
        const data = await dashboardService.getAdminStatsWithCharts();
        res.json({ success: true, data });
    } catch (error) {
        LogHelper.logError(error, { context: 'Fetching admin dashboard stats' }, req);
        next(error);
    }
});

module.exports = router;
