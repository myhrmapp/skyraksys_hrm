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

module.exports = router;
