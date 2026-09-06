const BaseService = require('../BaseService');
const { KeyResult } = require('../../models');

class KeyResultDataService extends BaseService {
  constructor() {
    super(KeyResult);
  }
}

module.exports = new KeyResultDataService();
