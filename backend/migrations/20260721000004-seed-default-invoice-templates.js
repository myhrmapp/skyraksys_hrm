'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if any templates exist
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM invoice_templates LIMIT 1;'
    );
    
    if (existing && existing.length > 0) {
      console.log('Invoice templates already exist, skipping seed.');
      return;
    }

    const now = new Date();

    const templates = [
      {
        id: uuidv4(),
        name: 'Standard Service Invoice',
        description: 'Default template for standard B2B services.',
        isDefault: true,
        isActive: true,
        currency: 'INR',
        templateData: JSON.stringify({
          title: 'TAX INVOICE',
          companySection: { showGstin: true, showAddress: true },
          clientSection: { showGstin: true, showAddress: true },
          lineColumns: ['employeeName', 'employmentType', 'hoursSupported', 'hourlyRate', 'amount', 'description'],
          termsAndConditions: 'Payment is due within 15 days of the invoice date.\nPlease remit payment to the bank account listed below.',
          footerNote: 'This is a system-generated invoice and requires no physical signature.'
        }),
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Hourly Consulting Invoice',
        description: 'Streamlined invoice for consulting services billed by the hour.',
        isDefault: false,
        isActive: true,
        currency: 'INR',
        templateData: JSON.stringify({
          title: 'CONSULTING INVOICE',
          companySection: { showGstin: false, showAddress: true },
          clientSection: { showGstin: false, showAddress: true },
          lineColumns: ['description', 'hoursSupported', 'hourlyRate', 'amount'],
          termsAndConditions: 'Payment due upon receipt.',
          footerNote: 'Thank you for your business!'
        }),
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Fixed Retainer Invoice',
        description: 'Invoice for monthly fixed-fee retainers.',
        isDefault: false,
        isActive: true,
        currency: 'INR',
        templateData: JSON.stringify({
          title: 'RETAINER INVOICE',
          companySection: { showGstin: true, showAddress: true },
          clientSection: { showGstin: true, showAddress: true },
          lineColumns: ['description', 'amount'],
          termsAndConditions: 'Monthly retainer fee is due on the 1st of every month.',
          footerNote: 'System generated invoice.'
        }),
        createdAt: now,
        updatedAt: now
      }
    ];

    await queryInterface.bulkInsert('invoice_templates', templates, {});
  },

  down: async (queryInterface, Sequelize) => {
    // We only delete the ones we just inserted based on name, in case others were added
    await queryInterface.bulkDelete('invoice_templates', {
      name: ['Standard Service Invoice', 'Hourly Consulting Invoice', 'Fixed Retainer Invoice']
    }, {});
  }
};
