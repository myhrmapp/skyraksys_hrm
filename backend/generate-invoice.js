const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config/config.js')['development'];
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function createInvoice() {
  try {
    // Manually define the models since we just want a quick insert
    const Invoice = sequelize.define('Invoice', {
      id: { type: DataTypes.UUID, primaryKey: true },
      invoiceNumber: DataTypes.STRING,
      clientCompany: DataTypes.TEXT,
      billingMonth: DataTypes.INTEGER,
      billingYear: DataTypes.INTEGER,
      issueDate: DataTypes.DATEONLY,
      dueDate: DataTypes.DATEONLY,
      currency: DataTypes.STRING,
      workerType: DataTypes.STRING,
      status: DataTypes.STRING,
      lineItems: DataTypes.JSON,
      subtotal: DataTypes.DECIMAL,
      taxPercent: DataTypes.DECIMAL,
      taxAmount: DataTypes.DECIMAL,
      totalAmount: DataTypes.DECIMAL,
      templateId: DataTypes.UUID
    }, { tableName: 'invoices', timestamps: true });

    const InvoiceTemplate = sequelize.define('InvoiceTemplate', {
      id: { type: DataTypes.UUID, primaryKey: true },
      name: DataTypes.STRING,
      isDefault: DataTypes.BOOLEAN
    }, { tableName: 'invoice_templates', timestamps: true });

    const template = await InvoiceTemplate.findOne({ where: { isDefault: true } });
    if (!template) {
      console.log('No default template found.');
      return;
    }

    const invoice = await Invoice.create({
      id: uuidv4(),
      invoiceNumber: 'INV-2026-001',
      clientCompany: 'Acme Corp',
      billingMonth: 7,
      billingYear: 2026,
      issueDate: '2026-07-21',
      dueDate: '2026-08-05',
      currency: 'INR',
      workerType: 'permanent',
      status: 'sent',
      lineItems: [
        {
          employeeName: 'Jane Doe',
          employmentType: 'Full-Time',
          hoursSupported: 160,
          hourlyRate: 50,
          description: 'Senior Frontend Development',
          amount: 8000
        }
      ],
      subtotal: 8000.00,
      taxPercent: 0,
      taxAmount: 0.00,
      totalAmount: 8000.00,
      templateId: template.id
    });

    console.log('Invoice created successfully: ', invoice.invoiceNumber);
  } catch (error) {
    console.error('Error creating invoice:', error);
  } finally {
    await sequelize.close();
  }
}

createInvoice();
