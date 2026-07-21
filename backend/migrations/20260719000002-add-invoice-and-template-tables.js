'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'INR',
      },
      templateData: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {
          title: 'Service Invoice',
          termsAndConditions: 'Payment due within 15 days from invoice date.',
          footerNote: 'This is a system-generated invoice.',
        },
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      invoiceNumber: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
      },
      clientCompany: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      clientGstin: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      clientAddress: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      billingMonth: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      billingYear: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'INR',
      },
      workerType: {
        type: Sequelize.ENUM('permanent', 'contractor', 'mixed'),
        allowNull: false,
        defaultValue: 'mixed',
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      lineItems: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxPercent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 18,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      templateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'invoice_templates', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('invoice_templates', ['isDefault']);
    await queryInterface.addIndex('invoice_templates', ['isActive']);
    await queryInterface.addIndex('invoices', ['billingMonth', 'billingYear']);
    await queryInterface.addIndex('invoices', ['clientCompany']);
    await queryInterface.addIndex('invoices', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('invoice_templates');

    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_invoices_workerType\";");
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_invoices_status\";");
  },
};
