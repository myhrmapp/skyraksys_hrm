module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    contactPerson: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gstin: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['companyName'] },
      { fields: ['isActive'] }
    ]
  });

  Client.associate = function(models) {
    Client.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Client.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    Client.hasMany(models.Invoice, { foreignKey: 'clientId', as: 'invoices' });
  };

  return Client;
};
