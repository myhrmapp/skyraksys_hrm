const BaseService = require('../BaseService');
const { Goal } = require('../../models');

class GoalDataService extends BaseService {
  constructor() {
    super(Goal);
  }
}

module.exports = new GoalDataService();
