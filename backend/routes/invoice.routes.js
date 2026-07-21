const express = require('express');
const { Op, fn, col } = require('sequelize');
const router = express.Router();

const db = require('../models');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { authenticateToken, authorize } = require('../middleware/auth');
const { requirePasswordReauth } = require('../middleware/password-reauth');
const { passwordReauthLimiter } = require('../middleware/rateLimiter');
const { invoiceSchema } = require('../middleware/validators/invoice.validator');
const {
  encryptText,
  decryptText,
  buildLineItemsEncryptedPayload,
  parseLineItemsEncryptedPayload,
  maskValue
} = require('../utils/invoiceEncryption');
const {
  getActiveInvoiceSecretPhrase,
  rotateInvoiceSecretPhrase
} = require('../services/invoiceSecret.service');
const { generateInvoicePDF } = require('../utils/invoicePdfGenerator');
const { requireVaultUnlock } = require('../middleware/vault.middleware');

router.use(authenticateToken);
router.use(requireVaultUnlock);

const canManageInvoices = authorize('hr');
const SECRET_HEADER_NAME = 'x-invoice-secret-phrase';

const defaultTemplateData = {
  title: 'Service Invoice',
  termsAndConditions: 'Payment due within 15 days from invoice date.',
  footerNote: 'This is a system-generated invoice.'
};

function normalizeLineItems(items) {
  return items.map((item) => {
    const hoursSupported = Number.parseFloat(item.hoursSupported || 0);
    const hourlyRate = Number.parseFloat(item.hourlyRate || 0);
    const amount = Number((hoursSupported * hourlyRate).toFixed(2));

    return {
      employeeId: item.employeeId || null,
      employeeName: item.employeeName || null,
      employmentType: item.employmentType,
      hoursSupported,
      hourlyRate,
      amount,
      description: item.description || ''
    };
  });
}

function computeInvoiceTotals(lineItems, taxPercent) {
  const subtotal = Number(
    lineItems.reduce((sum, item) => sum + (Number.parseFloat(item.amount || 0) || 0), 0).toFixed(2)
  );
  const normalizedTax = Number.parseFloat(taxPercent || 0) || 0;
  const taxAmount = Number(((subtotal * normalizedTax) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  return { subtotal, taxPercent: normalizedTax, taxAmount, totalAmount };
}

function buildHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function resolveSecretPhrase(req) {
  const raw = req.headers[SECRET_HEADER_NAME];
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return String(raw[0] || '').trim();
  }
  return '';
}

function assertSecretPhrase(secretPhrase) {
  const configuredSecret = process.env.INVOICE_SECRET_PHRASE;
  if (!configuredSecret) {
    throw buildHttpError('Invoice encryption is not configured. Missing INVOICE_SECRET_PHRASE.', 500);
  }
  if (!secretPhrase) {
    throw buildHttpError('Secret phrase is required in x-invoice-secret-phrase header.', 400);
  }
  if (secretPhrase !== configuredSecret) {
    throw buildHttpError('Invalid secret phrase for invoice access.', 403);
  }
}

async function assertActiveSecretPhrase(secretPhrase) {
  const configuredSecret = await getActiveInvoiceSecretPhrase();
  if (!configuredSecret) {
    throw buildHttpError('Invoice encryption is not configured. Missing INVOICE_SECRET_PHRASE.', 500);
  }
  if (!secretPhrase) {
    throw buildHttpError('Secret phrase is required in x-invoice-secret-phrase header.', 400);
  }
  if (secretPhrase !== configuredSecret) {
    throw buildHttpError('Invalid secret phrase for invoice access.', 403);
  }
}

async function maybeGetValidatedSecret(req) {
  const secretPhrase = resolveSecretPhrase(req);
  if (!secretPhrase) {
    return '';
  }
  await assertActiveSecretPhrase(secretPhrase);
  return secretPhrase;
}

async function requireValidatedSecret(req) {
  const secretPhrase = resolveSecretPhrase(req);
  await assertActiveSecretPhrase(secretPhrase);
  return secretPhrase;
}

function maskInvoiceLineItems(rawLineItems) {
  let count = 0;
  if (Array.isArray(rawLineItems)) {
    count = rawLineItems.length;
  } else if (rawLineItems?.isEncrypted) {
    count = 'encrypted';
  }

  return [{
    employeeName: 'REDACTED',
    employmentType: 'REDACTED',
    hoursSupported: 'REDACTED',
    hourlyRate: 'REDACTED',
    amount: 'REDACTED',
    description: `Sensitive data hidden (${count} line items)`
  }];
}

function serializeInvoiceForResponse(invoice, secretPhrase) {
  const plain = invoice.get ? invoice.get({ plain: true }) : { ...invoice };
  const hasSecret = !!secretPhrase;

  if (!hasSecret) {
    return {
      ...plain,
      clientCompany: maskValue(plain.clientCompany),
      clientGstin: maskValue(plain.clientGstin),
      clientAddress: maskValue(plain.clientAddress),
      notes: maskValue(plain.notes),
      lineItems: maskInvoiceLineItems(plain.lineItems),
      isSensitiveDataHidden: true
    };
  }

  try {
    return {
      ...plain,
      clientCompany: decryptText(plain.clientCompany, secretPhrase),
      clientGstin: plain.clientGstin ? decryptText(plain.clientGstin, secretPhrase) : '',
      clientAddress: plain.clientAddress ? decryptText(plain.clientAddress, secretPhrase) : '',
      notes: plain.notes ? decryptText(plain.notes, secretPhrase) : '',
      lineItems: parseLineItemsEncryptedPayload(plain.lineItems, secretPhrase),
      isSensitiveDataHidden: false
    };
  } catch (error) {
    const wrapped = new Error('Invoice decryption failed. The secret phrase is invalid or the stored payload is corrupted.');
    wrapped.statusCode = error?.statusCode || 403;
    throw wrapped;
  }
}

async function ensureTemplate(templateId) {
  if (templateId) {
    const template = await db.InvoiceTemplate.findOne({ where: { id: templateId, isActive: true } });
    if (!template) {
      throw new Error('Selected invoice template was not found or is inactive');
    }
    return template;
  }

  let template = await db.InvoiceTemplate.findOne({ where: { isDefault: true, isActive: true } });
  if (!template) {
    template = await db.InvoiceTemplate.create({
      name: 'Default Service Invoice Template',
      description: 'Default invoice template for client billing in India',
      isDefault: true,
      isActive: true,
      currency: 'INR',
      templateData: defaultTemplateData
    });
  }

  return template;
}

async function generateInvoiceNumber(billingMonth, billingYear) {
  const yyyy = String(billingYear);
  const mm = String(billingMonth).padStart(2, '0');
  const prefix = `INV-${yyyy}${mm}`;

  const count = await db.Invoice.count({
    where: {
      billingMonth,
      billingYear,
      invoiceNumber: { [Op.like]: `${prefix}-%` }
    }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
}

async function resolveTemplateIdForUpdate(invoice, value) {
  let templateId = invoice.templateId;

  if (value.templateId !== undefined) {
    if (value.templateId) {
      const template = await ensureTemplate(value.templateId);
      templateId = template.id;
    } else {
      templateId = null;
    }
  }

  return templateId;
}

function applyEncryptedFieldUpdates(payload, value, secretPhrase) {
  if (value.clientCompany !== undefined) {
    payload.clientCompany = encryptText(value.clientCompany, secretPhrase);
  }
  if (value.clientGstin !== undefined) {
    payload.clientGstin = value.clientGstin ? encryptText(value.clientGstin, secretPhrase) : null;
  }
  if (value.clientAddress !== undefined) {
    payload.clientAddress = value.clientAddress ? encryptText(value.clientAddress, secretPhrase) : null;
  }
  if (value.notes !== undefined) {
    payload.notes = value.notes ? encryptText(value.notes, secretPhrase) : null;
  }
}

function applyLineItemTotalsForUpdate(payload, value, invoice, secretPhrase) {
  if (value.lineItems) {
    const lineItems = normalizeLineItems(value.lineItems);
    const taxPercent = value.taxPercent !== undefined ? value.taxPercent : invoice.taxPercent;
    const totals = computeInvoiceTotals(lineItems, taxPercent);
    payload.lineItems = buildLineItemsEncryptedPayload(lineItems, secretPhrase);
    payload.subtotal = totals.subtotal;
    payload.taxPercent = totals.taxPercent;
    payload.taxAmount = totals.taxAmount;
    payload.totalAmount = totals.totalAmount;
    return;
  }

  if (value.taxPercent !== undefined) {
    const existingLineItems = parseLineItemsEncryptedPayload(invoice.lineItems, secretPhrase);
    const totals = computeInvoiceTotals(existingLineItems, value.taxPercent);
    payload.subtotal = totals.subtotal;
    payload.taxPercent = totals.taxPercent;
    payload.taxAmount = totals.taxAmount;
    payload.totalAmount = totals.totalAmount;
  }
}

router.get('/templates', async (req, res, next) => {
  try {
    const templates = await db.InvoiceTemplate.findAll({
      where: { isActive: true },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(ApiResponse.success(templates));
  } catch (error) {
    next(error);
  }
});

router.post('/templates', canManageInvoices, async (req, res, next) => {
  try {
    const { error, value } = invoiceSchema.createTemplate.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(ApiResponse.validation(error.details.map((d) => d.message)));
    }

    if (value.isDefault) {
      await db.InvoiceTemplate.update({ isDefault: false }, { where: { isDefault: true } });
    }

    const template = await db.InvoiceTemplate.create({
      ...value,
      templateData: value.templateData ? { ...defaultTemplateData, ...value.templateData } : defaultTemplateData,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    res.status(201).json(ApiResponse.success(template, 'Invoice template created successfully'));
  } catch (error) {
    next(error);
  }
});

router.put('/templates/:id', canManageInvoices, async (req, res, next) => {
  try {
    const { error, value } = invoiceSchema.updateTemplate.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(ApiResponse.validation(error.details.map((d) => d.message)));
    }

    const template = await db.InvoiceTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json(ApiResponse.notFound('Invoice template not found'));
    }

    if (value.isDefault === true) {
      await db.InvoiceTemplate.update({ isDefault: false }, { where: { isDefault: true } });
    }

    const mergedTemplateData = value.templateData
      ? { ...(template.templateData || defaultTemplateData), ...value.templateData }
      : template.templateData;

    await template.update({
      ...value,
      templateData: mergedTemplateData,
      updatedBy: req.user.id
    });

    res.json(ApiResponse.success(template, 'Invoice template updated successfully'));
  } catch (error) {
    next(error);
  }
});

router.get('/hours-summary', canManageInvoices, async (req, res, next) => {
  try {
    const month = Number.parseInt(req.query.month, 10);
    const year = Number.parseInt(req.query.year, 10);
    const { employeeId } = req.query;

    if (!month || !year) {
      return res.status(400).json(ApiResponse.error('month and year are required', 400));
    }

    // PostgreSQL-compatible month/year filter using DATE_PART
    const hoursQuery = await db.Timesheet.findAll({
      attributes: [
        'employeeId',
        [fn('SUM', col('totalHoursWorked')), 'hoursSupported']
      ],
      where: {
        status: 'Approved',
        ...(employeeId && { employeeId }),
        [Op.and]: [
          db.sequelize.where(fn('DATE_PART', 'month', col('weekStartDate')), month),
          db.sequelize.where(fn('DATE_PART', 'year', col('weekStartDate')), year)
        ]
      },
      group: ['employeeId'],
      raw: true
    });

    const employeeIds = hoursQuery.map((row) => row.employeeId);
    const employees = await db.Employee.findAll({
      where: { id: { [Op.in]: employeeIds } },
      attributes: ['id', 'employeeId', 'firstName', 'lastName', 'employmentType'],
      raw: true
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    const data = hoursQuery.map((row) => {
      const employee = employeeMap.get(row.employeeId);
      return {
        employeeId: row.employeeId,
        employeeCode: employee?.employeeId || null,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee',
        employmentType: employee?.employmentType || 'permanent',
        hoursSupported: Number.parseFloat(row.hoursSupported || 0)
      };
    });

    res.json(ApiResponse.success(data));
  } catch (error) {
    logger.error('Invoice hours summary error', { error: error.message });
    next(error);
  }
});

router.post('/secret-phrase/rotate', canManageInvoices, passwordReauthLimiter, requirePasswordReauth, async (req, res, next) => {
  try {
    const result = await rotateInvoiceSecretPhrase({
      currentPhrase: req.body.currentPhrase,
      newPhrase: req.body.newPhrase,
      confirmPhrase: req.body.confirmPhrase,
      changedBy: req.user.id
    });

    res.json(ApiResponse.success(result, 'Invoice secret phrase updated successfully'));
  } catch (error) {
    if (error.message === 'Current secret phrase is invalid.' ||
        error.message === 'New secret phrase is required.' ||
        error.message === 'New secret phrase must be at least 8 characters long.' ||
        error.message === 'New secret phrase confirmation does not match.' ||
        error.message === 'New secret phrase must be different from the current phrase.') {
      return res.status(400).json(ApiResponse.error(error.message, 400));
    }
    next(error);
  }
});

router.get('/', canManageInvoices, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, billingMonth, billingYear, clientCompany } = req.query;
    const where = {};
    const secretPhrase = await maybeGetValidatedSecret(req);

    if (status) where.status = status;
    if (billingMonth) where.billingMonth = Number.parseInt(billingMonth, 10);
    if (billingYear) where.billingYear = Number.parseInt(billingYear, 10);
    if (clientCompany) {
      return res.status(400).json(ApiResponse.error('Filtering by client company is disabled for encrypted invoice data.', 400));
    }

    const offset = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
    const result = await db.Invoice.findAndCountAll({
      where,
      include: [
        { model: db.InvoiceTemplate, as: 'template', attributes: ['id', 'name'] }
      ],
      order: [['billingYear', 'DESC'], ['billingMonth', 'DESC'], ['createdAt', 'DESC']],
      offset,
      limit: Number.parseInt(limit, 10)
    });

    const serializedInvoices = result.rows.map((invoice) => serializeInvoiceForResponse(invoice, secretPhrase));

    res.json(ApiResponse.success({
      invoices: serializedInvoices,
      pagination: {
        totalRecords: result.count,
        currentPage: Number.parseInt(page, 10),
        totalPages: Math.ceil(result.count / Number.parseInt(limit, 10)),
        itemsPerPage: Number.parseInt(limit, 10)
      },
      encryption: {
        secretHeader: SECRET_HEADER_NAME,
        hasSecretPhrase: !!secretPhrase,
        sensitiveDataHidden: !secretPhrase
      }
    }));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
    }
    next(error);
  }
});

router.get('/:id', canManageInvoices, async (req, res, next) => {
  try {
    const secretPhrase = await maybeGetValidatedSecret(req);
    const invoice = await db.Invoice.findByPk(req.params.id, {
      include: [
        { model: db.InvoiceTemplate, as: 'template' }
      ]
    });

    if (!invoice) {
      return res.status(404).json(ApiResponse.notFound('Invoice not found'));
    }

    res.json(ApiResponse.success(serializeInvoiceForResponse(invoice, secretPhrase)));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
    }
    next(error);
  }
});

router.post('/', canManageInvoices, async (req, res, next) => {
  try {
    const secretPhrase = await requireValidatedSecret(req);
    const { error, value } = invoiceSchema.createInvoice.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(ApiResponse.validation(error.details.map((d) => d.message)));
    }

    const template = await ensureTemplate(value.templateId || null);
    const lineItems = normalizeLineItems(value.lineItems);

    // Fill employeeName from employeeId where missing
    const needsNames = lineItems.filter((i) => i.employeeId && !i.employeeName);
    if (needsNames.length > 0) {
      const employees = await db.Employee.findAll({
        where: { id: { [Op.in]: needsNames.map((i) => i.employeeId) } },
        attributes: ['id', 'firstName', 'lastName']
      });
      const map = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
      lineItems.forEach((item) => {
        if (item.employeeId && !item.employeeName) {
          item.employeeName = map.get(item.employeeId) || 'Unknown Employee';
        }
      });
    }

    const totals = computeInvoiceTotals(lineItems, value.taxPercent);
    const invoiceNumber = await generateInvoiceNumber(value.billingMonth, value.billingYear);

    const invoice = await db.Invoice.create({
      ...value,
      invoiceNumber,
      clientCompany: encryptText(value.clientCompany, secretPhrase),
      clientGstin: value.clientGstin ? encryptText(value.clientGstin, secretPhrase) : null,
      clientAddress: value.clientAddress ? encryptText(value.clientAddress, secretPhrase) : null,
      templateId: template.id,
      lineItems: buildLineItemsEncryptedPayload(lineItems, secretPhrase),
      subtotal: totals.subtotal,
      taxPercent: totals.taxPercent,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      notes: value.notes ? encryptText(value.notes, secretPhrase) : null,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    res.status(201).json(ApiResponse.success(serializeInvoiceForResponse(invoice, secretPhrase), 'Invoice created successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
    }
    if (error.message.includes('Selected invoice template')) {
      return res.status(400).json(ApiResponse.error(error.message, 400));
    }
    next(error);
  }
});

router.put('/:id', canManageInvoices, async (req, res, next) => {
  try {
    const secretPhrase = await requireValidatedSecret(req);
    const { error, value } = invoiceSchema.updateInvoice.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(ApiResponse.validation(error.details.map((d) => d.message)));
    }

    const invoice = await db.Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json(ApiResponse.notFound('Invoice not found'));
    }

    const templateId = await resolveTemplateIdForUpdate(invoice, value);

    const payload = { ...value, templateId, updatedBy: req.user.id };
    applyEncryptedFieldUpdates(payload, value, secretPhrase);
    applyLineItemTotalsForUpdate(payload, value, invoice, secretPhrase);

    await invoice.update(payload);

    res.json(ApiResponse.success(serializeInvoiceForResponse(invoice, secretPhrase), 'Invoice updated successfully'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(ApiResponse.error(error.message, error.statusCode));
    }
    if (error.message.includes('Selected invoice template')) {
      return res.status(400).json(ApiResponse.error(error.message, 400));
    }
    next(error);
  }
});

router.patch('/:id/status', canManageInvoices, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json(ApiResponse.error('Invalid status', 400));
    }

    const invoice = await db.Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json(ApiResponse.notFound('Invoice not found'));
    }

    await invoice.update({ status, updatedBy: req.user.id });
    res.json(ApiResponse.success(invoice, 'Invoice status updated successfully'));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', canManageInvoices, async (req, res, next) => {
  try {
    const invoice = await db.Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json(ApiResponse.notFound('Invoice not found'));
    }

    await invoice.destroy();
    res.json(ApiResponse.success(null, 'Invoice deleted successfully'));
  } catch (error) {
    next(error);
  }
});

// Generate and Download Invoice PDF
router.get('/:id/pdf', canManageInvoices, async (req, res) => {
  try {
    const invoice = await db.Invoice.findByPk(req.params.id, {
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'username'] },
        { model: db.User, as: 'updater', attributes: ['id', 'username'] },
        { model: db.InvoiceTemplate, as: 'template' }
      ]
    });

    if (!invoice) {
      return res.status(404).json(ApiResponse.error('Invoice not found', 404));
    }

    // Use linked template or fallback to default
    let templateToUse = invoice.template;
    if (!templateToUse) {
      templateToUse = await db.InvoiceTemplate.findOne({ where: { isDefault: true } });
    }
    // Final fallback
    if (!templateToUse) {
      templateToUse = { templateData: defaultTemplateData, currency: 'USD' };
    }

    // The generateInvoicePDF function streams directly to `res`
    await generateInvoicePDF(invoice, templateToUse, res);

  } catch (error) {
    logger.error(`Error generating PDF for Invoice ID ${req.params.id}:`, error);
    if (!res.headersSent) {
      res.status(500).json(ApiResponse.error('Error generating PDF', 500));
    }
  }
});

module.exports = router;
