const express = require('express');
const { authenticateToken, isAdminOrHR } = require('../middleware/auth');
const db = require('../models');
const { uploadCompanyLogo, handleUploadError, validateMagicBytes } = require('../middleware/upload');
const logger = require('../utils/logger');

const PayslipTemplate = db.PayslipTemplate;
const router = express.Router();

// Middleware to ensure all routes in this file are authenticated
router.use(authenticateToken);

// GET the current payslip template settings
router.get('/payslip-template', async (req, res, next) => {
    try {
        // Always try to load an existing template first
        let template = await PayslipTemplate.findOne();

        // If no template exists yet, create a proper default using the
        // model helper so all required fields (like `name`) are populated.
        if (!template && typeof PayslipTemplate.createDefaultTemplate === 'function') {
            template = await PayslipTemplate.createDefaultTemplate();
        }

        // Fallback: if helper is not available for some reason, create a
        // minimal valid template so the endpoint still works.
        if (!template) {
            template = await PayslipTemplate.create({
                name: 'Standard Payslip Template'
            });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        logger.error('Get Payslip Template Error:', { detail: error });
        next(error);
    }
});

// PUT to update the payslip template settings (Admin or HR only)
router.put('/payslip-template', isAdminOrHR, uploadCompanyLogo, handleUploadError, validateMagicBytes, async (req, res, next) => {
    try {
        const [template, created] = await PayslipTemplate.findOrCreate({
            where: {}, // Finds the first one
            defaults: req.body
        });

        const updateData = { ...req.body };

        // Handle file upload
        if (req.file) {
            updateData.companyLogo = `/uploads/company-logos/${req.file.filename}`;
        }

        if (!created) {
            await template.update(updateData);
        }

        const updatedTemplate = await PayslipTemplate.findOne();
        res.json({ success: true, message: 'Payslip template updated successfully.', data: updatedTemplate });
    } catch (error) {
        logger.error('Update Payslip Template Error:', { detail: error });
        next(error);
    }
});

// GET the ID Card settings (accessible by authenticated users so they can view their own card)
router.get('/idcard-template', async (req, res, next) => {
    try {
        const config = await db.SystemConfig.findOne({
            where: { category: 'idcard', key: 'settings' }
        });
        const defaultSettings = {
            primaryColor:   '#1A4B8C',
            accentColor:    '#0099D4',
            tagline:        'GROW TOGETHER',
            websiteUrl:     'WWW.SKYRAKSYS.COM',
            showQrCode:     true,
            showDepartment: true,
            showDesignation:true,
            showWebsite:    true,
        };
        const settings = config && config.value ? JSON.parse(config.value) : defaultSettings;
        res.json({ success: true, data: settings });
    } catch (error) {
        logger.error('Get ID Card Template Error:', { detail: error });
        next(error);
    }
});

// PUT to update the ID Card settings (Admin or HR only)
router.put('/idcard-template', isAdminOrHR, async (req, res, next) => {
    try {
        const settings = req.body;
        let config = await db.SystemConfig.findOne({
            where: { category: 'idcard', key: 'settings' }
        });

        if (config) {
            await config.update({
                value: JSON.stringify(settings),
                changedBy: req.user.id,
                version: config.version + 1
            });
        } else {
            await db.SystemConfig.create({
                category: 'idcard',
                key: 'settings',
                value: JSON.stringify(settings),
                changedBy: req.user.id,
                version: 1
            });
        }

        res.json({ success: true, message: 'ID Card settings updated successfully.', data: settings });
    } catch (error) {
        logger.error('Update ID Card Template Error:', { detail: error });
        next(error);
    }
});

module.exports = router;
