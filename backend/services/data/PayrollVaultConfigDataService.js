const BaseService = require('../BaseService');
const db = require('../../models');

class PayrollVaultConfigDataService extends BaseService {
  constructor() {
    super(db.PayrollVaultConfig);
  }
}

module.exports = new PayrollVaultConfigDataService();
