/**
 * Jest Global Teardown
 * 
 * Closes all database connections after all tests complete
 */

const db = require('../models');

module.exports = async () => {
  try {
    // Close Sequelize connection pool
    if (db && db.sequelize) {
      await db.sequelize.connectionManager.close();
      console.log('✓ Database connections closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error.message);
  }
};
