const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const invoiceTemplateDataService = require('../services/data/InvoiceTemplateDataService');

// Get all invoice templates
exports.getAllTemplates = async (req, res, next) => {
  try {
    const result = await invoiceTemplateDataService.findAll({
      order: [['isDefault', 'DESC'], ['name', 'ASC']]
    });
    const templates = result.data || result;
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    logger.error('Error fetching invoice templates:', error);
    next(new AppError('Error fetching templates', 500));
  }
};

// Get single template
exports.getTemplate = async (req, res, next) => {
  try {
    const template = await invoiceTemplateDataService.findById(req.params.id);
    if (!template) {
      return next(new AppError('Template not found', 404));
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    logger.error('Error fetching template:', error);
    next(new AppError('Error fetching template', 500));
  }
};

// Create new template
exports.createTemplate = async (req, res, next) => {
  try {
    const { name, description, isDefault, isActive, currency, templateData } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await invoiceTemplateDataService.bulkUpdate({ isDefault: true }, { isDefault: false });
    }

    const template = await invoiceTemplateDataService.create({
      name,
      description,
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      currency: currency || 'INR',
      templateData: templateData || {},
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error('Error creating template:', error);
    next(new AppError('Error creating template', 500));
  }
};

// Update template
exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await invoiceTemplateDataService.findById(req.params.id);
    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    const { name, description, isDefault, isActive, currency, templateData } = req.body;

    if (isDefault && !template.isDefault) {
      await invoiceTemplateDataService.bulkUpdate({ isDefault: true }, { isDefault: false });
    }

    await invoiceTemplateDataService.update(req.params.id, {
      name: name !== undefined ? name : template.name,
      description: description !== undefined ? description : template.description,
      isDefault: isDefault !== undefined ? isDefault : template.isDefault,
      isActive: isActive !== undefined ? isActive : template.isActive,
      currency: currency !== undefined ? currency : template.currency,
      templateData: templateData !== undefined ? templateData : template.templateData,
      updatedBy: req.user.id
    });

    const updatedTemplate = await invoiceTemplateDataService.findById(req.params.id);
    res.status(200).json({ success: true, data: updatedTemplate });
  } catch (error) {
    logger.error('Error updating template:', error);
    next(new AppError('Error updating template', 500));
  }
};

// Delete template
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await invoiceTemplateDataService.findById(req.params.id);
    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    // Check if it's the default
    if (template.isDefault) {
      return next(new AppError('Cannot delete the default template. Set another template as default first.', 400));
    }

    await invoiceTemplateDataService.delete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    logger.error('Error deleting template:', error);
    next(new AppError('Error deleting template', 500));
  }
};
