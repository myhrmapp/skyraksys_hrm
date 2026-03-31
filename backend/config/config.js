require('dotenv').config();
const { logger } = require('./logger');

// Custom query logger with timing (merged from database.js)
const queryLogger = (sql, timing) => {
  const duration = timing || 0;
  if (duration > 100) {
    logger.warn(`Slow Query (${duration}ms): ${sql.substring(0, 200)}...`);
  } else if (process.env.LOG_ALL_QUERIES === 'true') {
    logger.debug(`Query (${duration}ms): ${sql.substring(0, 200)}...`);
  }
};

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'skyraksys_hrm',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    timezone: process.env.DB_TIMEZONE || '+00:00',
    logging: process.env.ENABLE_QUERY_LOGGING === 'true' ? queryLogger : false,
    benchmark: process.env.ENABLE_QUERY_LOGGING === 'true',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME_TEST || 'skyraksys_hrm_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    timezone: process.env.DB_TIMEZONE || '+00:00',
    logging: false
  },
  
  production: {
    username: process.env.DB_USER || 'hrm_app',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'skyraksys_hrm_prod',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    timezone: process.env.DB_TIMEZONE || '+00:00',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 30000
    },
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DB_SSL_CA ? require('fs').readFileSync(process.env.DB_SSL_CA).toString() : undefined
      }
    } : {}
  }
};
