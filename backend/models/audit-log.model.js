/**
 * Audit Log Model
 * 
 * Purpose: Track all sensitive operations for compliance and security auditing
 * 
 * Use Cases:
 * - Track WHO changed WHAT, WHEN, and WHY
 * - Compliance requirements (SOX, GDPR, PCI-DSS)
 * - Security incident investigation
 * - Data integrity verification
 * - Regulatory audits
 * 
 * Created: February 5, 2026 (Phase 1, Week 1, Day 3-5)
 */

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for audit log entry'
    },
    
    // What happened
    // NOTE: DB column is VARCHAR(50) (base migration). DB-level enforcement is
    // handled by CHECK constraint chk_audit_logs_action_values (migration 20260327000001).
    // Using STRING(50) + validate.isIn for app-layer validation to match the DB type.
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of action performed (UPPER_CASE convention)',
      validate: {
        isIn: [[
          // CRUD operations
          'CREATED', 'UPDATED', 'DELETED', 'RESTORED',
          // Status workflows
          'STATUS_CHANGED', 'APPROVED', 'REJECTED', 'SUBMITTED',
          // Leave / payroll management
          'BALANCE_ADJUSTED', 'PAYMENT_PROCESSED',
          // Auth — login/logout
          'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
          'ACCOUNT_LOCKED_TEMP', 'ACCOUNT_LOCKED_MANUAL',
          // Auth — tokens
          'TOKEN_REFRESHED', 'TOKEN_REFRESH_FAILED',
          // Auth — passwords
          'PASSWORD_CHANGED', 'PASSWORD_RESET_BY_ADMIN',
          'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
          // Permissions
          'PERMISSION_CHANGED',
          // Data operations
          'EXPORTED', 'IMPORTED',
          // System config
          'EMAIL_CONFIG_UPDATED', 'VIEW_SYSTEM_CONFIG', 'UPDATE_SYSTEM_CONFIG',
          'SYSTEM_CONFIG_ACCESS_GRANTED', 'SYSTEM_CONFIG_ACCESS_DENIED',
          'SYSTEM_CONFIG_PASSWORD_VERIFY_FAILED',
          // Security
          'DISTRIBUTED_ATTACK_DETECTED',
          // Timesheet
          'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED', 'TIMESHEET_STATUS_CHANGE'
        ]]
      }
    },
    
    // What was affected
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Model/table name (e.g., LeaveBalance, EmployeeReview, User)',
      validate: {
        notEmpty: true
      }
    },
    
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the affected record (use 00000000-0000-0000-0000-000000000000 for failed events)'
      // Note: Removed isUUID validation to allow placeholder UUID for failed authentication events
    },
    
    // Who did it
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for failed logins where user doesn't exist
      comment: 'User who performed the action (null for failed logins of non-existent users)',
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT' // Never delete user if audit logs exist
    },
    
    // Before/After state
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'State before change (for updates/deletes)',
      defaultValue: null
    },
    
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'State after change (for creates/updates)',
      defaultValue: null
    },
    
    // Why it happened
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin-provided reason for change (required for sensitive operations)',
      defaultValue: null
    },
    
    // Where it happened
    ipAddress: {
      type: DataTypes.STRING(45), // IPv6 max length
      allowNull: true,
      comment: 'IP address of the client'
      // Note: Validation removed to support various IPv6 formats (::1, ::ffff:127.0.0.1, etc.)
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/client user agent string'
    },
    
    // Additional context
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context (request ID, batch ID, correlation ID, etc.)',
      defaultValue: {}
    },
    
    // Performance tracking
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Operation duration in milliseconds',
      validate: {
        min: 0
      }
    },
    
    // Success/Failure
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the operation succeeded'
    },
    
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if operation failed'
    },
    
    // Virtual field for backward compatibility with tests
    entity: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('entityType');
      },
      set(value) {
        this.setDataValue('entityType', value);
      }
    },
    
    // Virtual field for auth audit logs that use 'details' instead of 'metadata'
    details: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('metadata');
      },
      set(value) {
        this.setDataValue('metadata', value);
      }
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable (no updates allowed)
    paranoid: false, // Audit logs cannot be soft-deleted
    
    indexes: [
      // Common query patterns
      {
        name: 'idx_audit_logs_user_id',
        fields: ['userId'],
        comment: 'Query logs by user'
      },
      {
        name: 'idx_audit_logs_entity',
        fields: ['entityType', 'entityId'],
        comment: 'Query logs for specific entity'
      },
      {
        name: 'idx_audit_logs_action',
        fields: ['action'],
        comment: 'Query logs by action type'
      },
      {
        name: 'idx_audit_logs_created_at',
        fields: ['createdAt'],
        comment: 'Time-range queries (most common)'
      },
      {
        name: 'idx_audit_logs_success',
        fields: ['success'],
        comment: 'Query failed operations'
      },
      // Composite indexes for complex queries
      {
        name: 'idx_audit_logs_user_action_date',
        fields: ['userId', 'action', 'createdAt'],
        comment: 'User activity reports'
      },
      {
        name: 'idx_audit_logs_entity_date',
        fields: ['entityType', 'entityId', 'createdAt'],
        comment: 'Entity history timeline'
      }
    ],
    
    hooks: {
      // Prevent updates to audit logs (immutable)
      beforeUpdate: (instance) => {
        throw new Error('Audit logs are immutable and cannot be updated');
      },
      
      // Prevent deletion of audit logs (compliance)
      beforeDestroy: (instance) => {
        throw new Error('Audit logs cannot be deleted (compliance requirement)');
      },
      
      // Sanitize sensitive data before saving
      beforeCreate: (instance) => {
        // Remove sensitive fields from oldValues/newValues
        const sensitiveFields = ['password', 'passwordHash', 'token', 'apiKey', 'secret', 'ssn'];
        
        if (instance.oldValues) {
          instance.oldValues = sanitizeObject(instance.oldValues, sensitiveFields);
        }
        
        if (instance.newValues) {
          instance.newValues = sanitizeObject(instance.newValues, sensitiveFields);
        }
      }
    }
  });

  // Helper function to sanitize objects
  function sanitizeObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Associations
  AuditLog.associate = function(models) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'RESTRICT' // Cannot delete user with audit logs
    });
  };

  // Instance methods
  AuditLog.prototype.getChangesSummary = function() {
    if (!this.oldValues || !this.newValues) return null;
    
    const changes = {};
    const oldKeys = Object.keys(this.oldValues || {});
    const newKeys = Object.keys(this.newValues || {});
    const allKeys = [...new Set([...oldKeys, ...newKeys])];
    
    allKeys.forEach(key => {
      const oldValue = this.oldValues?.[key];
      const newValue = this.newValues?.[key];
      
      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    });
    
    return Object.keys(changes).length > 0 ? changes : null;
  };

  // Class methods
  AuditLog.getEntityHistory = async function(entityType, entityId, options = {}) {
    const { limit = 100, offset = 0, includeUser = true } = options;
    
    const queryOptions = {
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    };
    
    if (includeUser) {
      queryOptions.include = [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }];
    }
    
    return await AuditLog.findAll(queryOptions);
  };

  AuditLog.getUserActivity = async function(userId, startDate, endDate, options = {}) {
    const { limit = 100, actions = null } = options;
    
    const where = {
      userId,
      createdAt: {
        [sequelize.Sequelize.Op.gte]: startDate,
        [sequelize.Sequelize.Op.lte]: endDate
      }
    };
    
    if (actions && Array.isArray(actions)) {
      where.action = { [sequelize.Sequelize.Op.in]: actions };
    }
    
    return await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit
    });
  };

  AuditLog.getFailedOperations = async function(startDate, endDate, options = {}) {
    const { limit = 100, entityType = null } = options;
    
    const where = {
      success: false,
      createdAt: {
        [sequelize.Sequelize.Op.gte]: startDate,
        [sequelize.Sequelize.Op.lte]: endDate
      }
    };
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    return await AuditLog.findAll({
      where,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit
    });
  };

  return AuditLog;
};
