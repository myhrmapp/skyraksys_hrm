module.exports = (sequelize, DataTypes) => {
  const PayrollVaultConfig = sequelize.define('PayrollVaultConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    designatedHrUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    hrEncryptedDek: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adminEncryptedDek: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hrIv: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    adminIv: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    hrAuthTag: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    adminAuthTag: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'payroll_vault_configs',
    timestamps: true
  });

  return PayrollVaultConfig;
};
