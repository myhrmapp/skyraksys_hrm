const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KeyResult = sequelize.define('KeyResult', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'goals',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    targetValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currentValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    metric: {
      type: DataTypes.STRING, // e.g. '%', '$', 'count'
      allowNull: true
    }
  }, {
    tableName: 'key_results',
    timestamps: true,
    indexes: [
      {
        fields: ['goalId']
      }
    ]
  });

  KeyResult.associate = (models) => {
    KeyResult.belongsTo(models.Goal, {
      foreignKey: 'goalId',
      as: 'goal'
    });
  };

  return KeyResult;
};
