/**
 * Password Reset Token Model (GAP Item 11.16)
 * 
 * Replaces in-memory Set/Map with persistent database storage.
 * Supports multi-instance deployments and survives server restarts.
 */

module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tokenId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'Unique token identifier (crypto randomBytes hex)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      comment: 'User who requested the reset'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Email address (for rate limiting lookups)'
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'NULL if unused, timestamp when consumed'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the token expires (1h from creation)'
    }
  }, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    updatedAt: false, // Tokens are immutable after creation (except usedAt)
    indexes: [
      { unique: true, fields: ['tokenId'] },
      { fields: ['email', 'createdAt'] }, // For rate limiting queries
      { fields: ['expiresAt'] }           // For cleanup queries
    ]
  });

  PasswordResetToken.associate = function(models) {
    PasswordResetToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return PasswordResetToken;
};
