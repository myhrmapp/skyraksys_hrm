const BaseService = require('../BaseService');
const { InvoiceTemplate } = require('../../models');

class InvoiceTemplateDataService extends BaseService {
  constructor() {
    super(InvoiceTemplate);
  }
}

module.exports = new InvoiceTemplateDataService();
