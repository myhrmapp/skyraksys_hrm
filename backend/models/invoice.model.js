module.exports = function invoiceModel(sequelize, DataTypes) {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceNumber: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'clients', key: 'id' }
    },
    clientCompany: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    clientGstin: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    clientAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billingMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 }
    },
    billingYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 2000, max: 2100 }
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'INR'
    },
    workerType: {
      type: DataTypes.ENUM('permanent', 'contractor', 'mixed'),
      allowNull: false,
      defaultValue: 'mixed'
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    lineItems: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 18
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'invoice_templates', key: 'id' }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['invoiceNumber'], unique: true },
      { fields: ['billingMonth', 'billingYear'] },
      { fields: ['clientCompany'] },
      { fields: ['status'] }
    ]
  });

  Invoice.associate = function(models) {
    Invoice.belongsTo(models.InvoiceTemplate, { foreignKey: 'templateId', as: 'template' });
    Invoice.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    Invoice.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Invoice.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  const VaultCrypto = require('../utils/vaultCrypto');

  Invoice.beforeSave(async (invoice, options) => {
    try {
      const config = await sequelize.models.PayrollVaultConfig.findOne();
      if (config && config.isEnabled) {
        const payload = {
          subtotal: invoice.getDataValue('subtotal'),
          taxPercent: invoice.getDataValue('taxPercent'),
          taxAmount: invoice.getDataValue('taxAmount'),
          totalAmount: invoice.getDataValue('totalAmount'),
          lineItems: invoice.getDataValue('lineItems')
        };
        const encrypted = VaultCrypto.encryptPayload(payload);
        invoice.setDataValue('encryptedFinancials', JSON.stringify(encrypted));
        
        invoice.setDataValue('subtotal', null);
        invoice.setDataValue('taxPercent', null);
        invoice.setDataValue('taxAmount', null);
        invoice.setDataValue('totalAmount', null);
        invoice.setDataValue('lineItems', null);
      }
    } catch (e) {
      console.error('Error encrypting invoice before save:', e);
    }
  });

  const decryptInvoice = async (invoice) => {
    const encryptedDataStr = invoice.getDataValue('encryptedFinancials');
    if (invoice && encryptedDataStr) {
      try {
        const enc = JSON.parse(encryptedDataStr);
        const payload = VaultCrypto.decryptPayload(enc.encryptedData, enc.iv, enc.authTag);
        invoice.setDataValue('subtotal', payload.subtotal);
        invoice.setDataValue('taxPercent', payload.taxPercent);
        invoice.setDataValue('taxAmount', payload.taxAmount);
        invoice.setDataValue('totalAmount', payload.totalAmount);
        invoice.setDataValue('lineItems', payload.lineItems);
      } catch (e) {
        console.error('Failed to decrypt invoice:', e);
      }
    }
  };

  Invoice.afterFind(async (result, options) => {
    if (!result) return;
    if (Array.isArray(result)) {
      for (const p of result) {
        await decryptInvoice(p);
      }
    } else {
      await decryptInvoice(result);
    }
  });

  return Invoice;
};
