const { Sequelize } = require('sequelize');
require('dotenv').config();
const config = require('../config/config.js');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

if (!dbConfig) {
  logger.error(`Database config not found for environment: ${env}`);
  logger.error('Available environments:', { detail: Object.keys(config) });
  throw new Error(`Database configuration missing for environment: ${env}`);
}

// PostgreSQL-only configuration - respects NODE_ENV for test database
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging !== undefined ? dbConfig.logging : (env === 'development' ? (msg) => logger.debug(msg) : false),
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 30000
    },
    dialectOptions: dbConfig.dialectOptions || {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Test PostgreSQL connection (skip during tests to prevent hanging)
if (process.env.NODE_ENV !== 'test') {
  sequelize.authenticate()
    .then(() => logger.info('PostgreSQL database connection established successfully'))
    .catch(err => {
      logger.error('PostgreSQL connection failed', { error: err.message });
      logger.error('Please ensure PostgreSQL is running and credentials are correct');
      process.exit(1); // Exit if PostgreSQL connection fails
    });
}

const db = {};

// Import all models (restored to working version)
db.User = require('./user.model')(sequelize, Sequelize);
db.Employee = require('./employee.model')(sequelize, Sequelize);
db.Department = require('./department.model')(sequelize, Sequelize);
db.Position = require('./position.model')(sequelize, Sequelize);
db.LeaveRequest = require('./leave-request.model')(sequelize, Sequelize);
db.LeaveBalance = require('./leave-balance.model')(sequelize, Sequelize);
db.LeaveType = require('./leave-type.model')(sequelize, Sequelize);
db.Timesheet = require('./timesheet.model')(sequelize, Sequelize);
db.Project = require('./project.model')(sequelize, Sequelize);
db.Task = require('./task.model')(sequelize, Sequelize);
// db.Payroll = require('./payroll.model')(sequelize, Sequelize); // Legacy - Moved to obsolete
// db.PayrollComponent = require('./payroll-component.model')(sequelize, Sequelize); // Legacy - Replaced by JSON in PayrollData
db.PayrollData = require('./payroll-data.model')(sequelize, Sequelize);
db.SalaryStructure = require('./salary-structure.model')(sequelize, Sequelize);
db.PayslipTemplate = require('./payslip-template.model')(sequelize, Sequelize);
db.Payslip = require('./payslip.model')(sequelize, Sequelize);
db.PayslipAuditLog = require('./payslip-audit-log.model')(sequelize, Sequelize);
db.RefreshToken = require('./refresh-token.model')(sequelize, Sequelize);
db.SystemConfig = require('./system-config.model')(sequelize, Sequelize);
db.EmployeeReview = require('./employee-review.model')(sequelize, Sequelize);
db.AuditLog = require('./audit-log.model')(sequelize, Sequelize);
db.Holiday = require('./holiday.model')(sequelize, Sequelize);
db.Attendance = require('./attendance.model')(sequelize, Sequelize);
db.PasswordResetToken = require('./password-reset-token.model')(sequelize, Sequelize);

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
