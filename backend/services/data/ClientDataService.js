const BaseService = require('../BaseService');
const { Client } = require('../../models');

class ClientDataService extends BaseService {
  constructor() {
    super(Client);
  }
}

module.exports = new ClientDataService();
