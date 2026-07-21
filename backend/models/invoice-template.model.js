module.exports = (sequelize, DataTypes) => {
  const InvoiceTemplate = sequelize.define('InvoiceTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'INR'
    },
    templateData: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        title: 'Service Invoice',
        companySection: {
          showGstin: true,
          showAddress: true
        },
        clientSection: {
          showGstin: true,
          showAddress: true
        },
        lineColumns: ['employeeName', 'employmentType', 'hoursSupported', 'hourlyRate', 'amount', 'description'],
        termsAndConditions: 'Payment due within 15 days from invoice date.',
        footerNote: 'This is a system-generated invoice.'
      }
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
    tableName: 'invoice_templates',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['isDefault'] },
      { fields: ['isActive'] }
    ]
  });

  InvoiceTemplate.associate = function(models) {
    InvoiceTemplate.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    InvoiceTemplate.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    InvoiceTemplate.hasMany(models.Invoice, { foreignKey: 'templateId', as: 'invoices' });
  };

  return InvoiceTemplate;
};
