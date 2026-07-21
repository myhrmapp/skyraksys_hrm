const db = require('../models');
const logger = require('../utils/logger');
const encryptionService = require('../utils/encryption');
const {
  encryptText,
  decryptText,
  buildLineItemsEncryptedPayload,
  parseLineItemsEncryptedPayload
} = require('../utils/invoiceEncryption');

const CONFIG_CATEGORY = 'invoice_security';
const CONFIG_KEY = 'secret_phrase';

function normalizePhrase(secretPhrase) {
  return typeof secretPhrase === 'string' ? secretPhrase.trim() : '';
}

function getBootstrapPhrase() {
  return normalizePhrase(process.env.INVOICE_SECRET_PHRASE);
}

function validateNewPhrase(newPhrase, confirmPhrase) {
  const normalizedNewPhrase = normalizePhrase(newPhrase);
  const normalizedConfirmPhrase = normalizePhrase(confirmPhrase);

  if (!normalizedNewPhrase) {
    throw new Error('New secret phrase is required.');
  }

  if (normalizedNewPhrase.length < 8) {
    throw new Error('New secret phrase must be at least 8 characters long.');
  }

  if (normalizedConfirmPhrase && normalizedConfirmPhrase !== normalizedNewPhrase) {
    throw new Error('New secret phrase confirmation does not match.');
  }

  return normalizedNewPhrase;
}

async function getLatestSecretConfig(transaction) {
  return db.SystemConfig.findOne({
    where: {
      category: CONFIG_CATEGORY,
      key: CONFIG_KEY
    },
    order: [['version', 'DESC'], ['createdAt', 'DESC']],
    transaction
  });
}

async function getActiveInvoiceSecretPhrase(transaction) {
  const config = await getLatestSecretConfig(transaction);
  if (config) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed?.phrase) {
        return normalizePhrase(encryptionService.decrypt(parsed.phrase));
      }
    } catch (error) {
      logger.warn('Falling back to bootstrap invoice secret phrase after stored config decryption failure', {
        configId: config.id,
        error: error.message
      });
    }
  }

  return getBootstrapPhrase();
}

async function getNextSecretConfigVersion(transaction) {
  const current = await getLatestSecretConfig(transaction);
  return current ? current.version + 1 : 1;
}

async function storeInvoiceSecretPhrase(secretPhrase, changedBy, transaction, description = null) {
  const version = await getNextSecretConfigVersion(transaction);
  return db.SystemConfig.create({
    category: CONFIG_CATEGORY,
    key: CONFIG_KEY,
    value: JSON.stringify({
      phrase: encryptionService.encrypt(secretPhrase)
    }),
    version,
    changedBy,
    description
  }, { transaction });
}

function buildDecryptedInvoiceData(invoice, currentPhrase) {
  return {
    clientCompany: decryptText(invoice.clientCompany, currentPhrase),
    clientGstin: invoice.clientGstin ? decryptText(invoice.clientGstin, currentPhrase) : null,
    clientAddress: invoice.clientAddress ? decryptText(invoice.clientAddress, currentPhrase) : null,
    notes: invoice.notes ? decryptText(invoice.notes, currentPhrase) : null,
    lineItems: parseLineItemsEncryptedPayload(invoice.lineItems, currentPhrase)
  };
}

function buildEncryptedInvoiceUpdate(plainInvoiceData, newPhrase) {
  return {
    clientCompany: encryptText(plainInvoiceData.clientCompany, newPhrase),
    clientGstin: plainInvoiceData.clientGstin ? encryptText(plainInvoiceData.clientGstin, newPhrase) : null,
    clientAddress: plainInvoiceData.clientAddress ? encryptText(plainInvoiceData.clientAddress, newPhrase) : null,
    notes: plainInvoiceData.notes ? encryptText(plainInvoiceData.notes, newPhrase) : null,
    lineItems: buildLineItemsEncryptedPayload(plainInvoiceData.lineItems, newPhrase)
  };
}

async function rotateInvoiceSecretPhrase({ currentPhrase, newPhrase, confirmPhrase, changedBy }) {
  const normalizedCurrentPhrase = normalizePhrase(currentPhrase);
  const normalizedNewPhrase = validateNewPhrase(newPhrase, confirmPhrase);

  return db.sequelize.transaction(async (transaction) => {
    const activePhrase = await getActiveInvoiceSecretPhrase(transaction);

    if (!activePhrase) {
      throw new Error('Invoice secret phrase is not configured.');
    }

    if (normalizedCurrentPhrase !== activePhrase) {
      throw new Error('Current secret phrase is invalid.');
    }

    if (normalizedNewPhrase === activePhrase) {
      throw new Error('New secret phrase must be different from the current phrase.');
    }

    const invoices = await db.Invoice.findAll({ transaction });

    for (const invoice of invoices) {
      const plainInvoiceData = buildDecryptedInvoiceData(invoice, activePhrase);
      const encryptedUpdate = buildEncryptedInvoiceUpdate(plainInvoiceData, normalizedNewPhrase);
      await invoice.update(encryptedUpdate, { transaction });
    }

    const savedConfig = await storeInvoiceSecretPhrase(
      normalizedNewPhrase,
      changedBy,
      transaction,
      'HR rotated invoice secret phrase'
    );

    await db.AuditLog.create({
      userId: changedBy,
      action: 'UPDATE_SYSTEM_CONFIG',
      entity: 'SystemConfig',
      entityId: savedConfig.id,
      details: {
        category: CONFIG_CATEGORY,
        key: CONFIG_KEY,
        invoiceCount: invoices.length
      }
    }, { transaction });

    return {
      rotatedInvoices: invoices.length,
      version: savedConfig.version
    };
  });
}

module.exports = {
  getActiveInvoiceSecretPhrase,
  rotateInvoiceSecretPhrase,
  validateNewPhrase
};
