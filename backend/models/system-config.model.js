/**
 * SystemConfig Model (Task 4.1)
 * 
 * Database-backed configuration storage with versioning and audit trail.
 * Replaces direct .env file writes for security and compliance.
 * 
 * Features:
 * - Version history tracking
 * - Rollback capability
 * - Audit trail (who changed what, when)
 * - Support for different config categories (email, app, integrations, etc.)
 */

module.exports = (sequelize, DataTypes) => {
  const SystemConfig = sequelize.define('SystemConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Config category: email, app, integrations, etc.'
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Config key within category'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON-encoded config value'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Version number for rollback support'
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User ID who made the change'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional description of the change'
    }
  }, {
    tableName: 'system_configs',
    timestamps: true,
    paranoid: false, // Don't soft-delete, keep full history
    indexes: [
      {
        name: 'system_configs_category_key_version_idx',
        unique: true,
        fields: ['category', 'key', 'version']
      },
      {
        name: 'system_configs_category_key_idx',
        fields: ['category', 'key']
      },
      {
        name: 'system_configs_changed_by_idx',
        fields: ['changedBy']
      }
    ]
  });

  SystemConfig.associate = function(models) {
    SystemConfig.belongsTo(models.User, {
      foreignKey: 'changedBy',
      as: 'changedByUser'
    });
  };

  return SystemConfig;
};
