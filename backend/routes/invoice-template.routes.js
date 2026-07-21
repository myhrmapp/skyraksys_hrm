const express = require('express');
const router = express.Router();
const invoiceTemplateController = require('../controllers/invoiceTemplateController');
const { authenticateToken, isAdminOrHR } = require('../middleware/auth');

// Require authentication and HR/Admin roles for all routes
router.use(authenticateToken, isAdminOrHR);

router.route('/')
  .get(invoiceTemplateController.getAllTemplates)
  .post(invoiceTemplateController.createTemplate);

router.route('/:id')
  .get(invoiceTemplateController.getTemplate)
  .put(invoiceTemplateController.updateTemplate)
  .delete(invoiceTemplateController.deleteTemplate);

module.exports = router;
