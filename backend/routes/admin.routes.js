const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const encryptionService = require('../utils/encryption');
const { validate } = require('../middleware/validate');
const { emailConfigSchema, testEmailSchema } = require('../middleware/validators/admin.validator');
const db = require('../models'); // Add db import for SystemConfig model

// Path to store email configuration
const CONFIG_FILE = path.join(__dirname, '../config/email.config.json');

// Get email configuration
router.get('/email-config', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        let config = {
            smtpHost: process.env.SMTP_HOST || '',
            smtpPort: process.env.SMTP_PORT || '587',
            smtpSecure: process.env.SMTP_SECURE === 'true',
            smtpUser: process.env.SMTP_USER || '',
            smtpPassword: '', // Never send password to frontend
            emailFrom: process.env.EMAIL_FROM || '',
            enabled: true
        };

        // Try to load from config file if exists
        try {
            const fileData = await fs.readFile(CONFIG_FILE, 'utf-8');
            const savedConfig = JSON.parse(fileData);
            config = { ...config, ...savedConfig, smtpPassword: '' }; // Don't expose password
        } catch (err) {
            // File doesn't exist or is invalid, use env variables
        }

        // Check if email service is configured
        const emailService = require('../services/email.service');
        const status = emailService.isConfigured() ? 'connected' : 'not-configured';

        res.json({
            success: true,
            data: config, // Changed from 'config' to 'data' for consistency
            source: 'database', // Indicate source
            status
        });
    } catch (error) {
        logger.error('Error loading email config:', { detail: error });
        next(error);
    }
});

// Save email configuration
router.post('/email-config', authenticateToken, authorize('admin'), validate(emailConfigSchema), async (req, res, next) => {
    try {
        const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, emailFrom, enabled } = req.body;

        // 🔐 ENCRYPT PASSWORD BEFORE SAVING (Phase 1, Week 1)
        const encryptedPassword = encryptionService.encrypt(smtpPassword);

        // Create config object with encrypted password
        const config = {
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword: encryptedPassword, // Store encrypted object
            emailFrom,
            enabled,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.email
        };

        // SECURITY: Store config in database instead of .env file (Task 4.1)
        // No restart required - config loaded from database dynamically
        const savedConfig = await db.SystemConfig.create({
            category: 'email',
            key: 'smtp_config',
            value: JSON.stringify(config),
            changedBy: req.user.id,
            version: (await db.SystemConfig.count({ where: { category: 'email' } })) + 1
        });

        // Also save to JSON file as backup (not .env)
        const configDir = path.dirname(CONFIG_FILE);
        try {
            await fs.access(configDir);
        } catch {
            await fs.mkdir(configDir, { recursive: true });
        }
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

        // Create audit log
        await db.AuditLog.create({
            userId: req.user.id,
            action: 'EMAIL_CONFIG_UPDATED',
            entityType: 'SystemConfig',
            entityId: savedConfig.id,
            details: { changes: config, ip: req.ip, userAgent: req.headers['user-agent'] },
            success: true
        });

        res.json({
            success: true,
            message: 'Email configuration saved to database successfully.'
        });
    } catch (error) {
        logger.error('Error saving email config:', { detail: error });
        next(error);
    }
});

// Test email connection
router.post('/email-config/test', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword } = req.body;

        // Create test transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPassword
            },
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            }
        });

        // Verify connection
        await transporter.verify();

        res.json({
            success: true,
            message: 'SMTP connection successful!'
        });
    } catch (error) {
        logger.error('SMTP connection test failed:', { detail: error });
        res.status(400).json({
            success: false,
            message: `Connection failed: ${error.message}`
        });
    }
});

// Send test email
router.post('/email-config/send-test', authenticateToken, authorize('admin'), validate(testEmailSchema), async (req, res, next) => {
    try {
        const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, emailFrom, testEmail } = req.body;

        // Create test transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPassword
            },
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            }
        });

        // Send test email
        const info = await transporter.sendMail({
            from: emailFrom,
            to: testEmail,
            subject: 'SkyRakSys HRM - Test Email',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
                        .content { background: #f8fafc; padding: 30px; margin-top: 20px; border-radius: 10px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Test Email Successful!</h1>
                        </div>
                        <div class="content">
                            <p>Congratulations! Your email configuration is working correctly.</p>
                            <p><strong>Configuration Details:</strong></p>
                            <ul>
                                <li>SMTP Host: ${smtpHost}</li>
                                <li>SMTP Port: ${smtpPort}</li>
                                <li>From Address: ${emailFrom}</li>
                                <li>Test Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}</li>
                            </ul>
                            <p>You can now send welcome emails, password resets, and other notifications from your HRM system.</p>
                        </div>
                        <div class="footer">
                            <p>SkyRakSys HRM System - Email Test</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        logger.info('Test email sent:', { detail: info.messageId });

        res.json({
            success: true,
            message: `Test email sent successfully to ${testEmail}`,
            messageId: info.messageId
        });
    } catch (error) {
        logger.error('Failed to send test email:', { detail: error });
        res.status(400).json({
            success: false,
            message: `Failed to send test email: ${error.message}`
        });
    }
});

// Task 4.1: Get email config version history
router.get('/email-config/history', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        const configHistory = await db.SystemConfig.findAll({
            where: { category: 'email', key: 'smtp_config' },
            order: [['version', 'DESC']],
            include: [{ model: db.User, as: 'changedByUser', attributes: ['id', 'email'] }]
        });

        res.json({
            success: true,
            message: 'Email config history retrieved successfully',
            data: {
                versions: configHistory.map(config => ({
                    version: config.version,
                    value: JSON.parse(config.value),
                    changedBy: config.changedBy, // Return UUID, not email
                    changedByEmail: config.changedByUser?.email || 'Unknown',
                    changedAt: config.createdAt
                }))
            },
            source: 'database'
        });
    } catch (error) {
        next(error);
    }
});

// Task 4.1: Rollback to previous email config version
router.post('/email-config/rollback', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        const { version } = req.body;

        if (!version) {
            return res.status(400).json({
                success: false,
                message: 'Version number required'
            });
        }

        const targetConfig = await db.SystemConfig.findOne({
            where: { category: 'email', key: 'smtp_config', version: version }
        });

        if (!targetConfig) {
            return res.status(404).json({
                success: false,
                message: `Config version ${version} not found`
            });
        }

        // Create new version with rollback data
        const latestVersion = await db.SystemConfig.max('version', {
            where: { category: 'email', key: 'smtp_config' }
        }) || 0;

        await db.SystemConfig.create({
            category: 'email',
            key: 'smtp_config',
            value: targetConfig.value,
            changedBy: req.userId,
            version: latestVersion + 1
        });

        // Audit log
        await db.AuditLog.create({
            userId: req.userId,
            action: 'UPDATED',
            entityType: 'SystemConfig',
            entityId: targetConfig.id,
            details: {
                rolledBackFrom: latestVersion,
                rolledBackTo: version,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            },
            success: true
        });

        res.json({
            success: true,
            message: `Email config rolled back to version ${version}`,
            data: { newVersion: latestVersion + 1 }
        });
    } catch (error) {
        next(error);
    }
});

// Task 4.3: Audit logs endpoint for email config changes
router.get('/email-config/audit', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        const logs = await db.AuditLog.findAll({
            where: {
                entityType: 'SystemConfig',
                action: 'EMAIL_CONFIG_UPDATED'
            },
            limit: 100,
            order: [['createdAt', 'DESC']],
            include: [{
                model: db.User,
                as: 'user',
                attributes: ['id', 'email', 'firstName', 'lastName']
            }]
        });
        
        res.json({
            success: true,
            data: { logs }
        });
    } catch (error) {
        next(error);
    }
});

// Task 4.3: Audit logs endpoint for retrieving audit trail
router.get('/audit-logs', authenticateToken, authorize('admin'), async (req, res, next) => {
    try {
        const { action, entityType, userId, limit = 100 } = req.query;
        
        const where = {};
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (userId) where.userId = userId;
        
        const logs = await db.AuditLog.findAll({
            where,
            limit: parseInt(limit),
            order: [['createdAt', 'DESC']],
            include: [{
                model: db.User,
                as: 'user',
                attributes: ['id', 'email', 'firstName', 'lastName']
            }]
        });
        
        res.json({
            success: true,
            data: { logs }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
