const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    period: {
      type: DataTypes.STRING, // e.g., 'Q3 2025'
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM,
      values: ['not_started', 'on_track', 'at_risk', 'completed', 'archived'],
      defaultValue: 'not_started'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2), // 0 to 100 percentage
      defaultValue: 0.00
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'goals',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['employeeId']
      },
      {
        fields: ['period']
      },
      {
        fields: ['status']
      }
    ]
  });

  Goal.associate = (models) => {
    Goal.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
    
    Goal.hasMany(models.KeyResult, {
      foreignKey: 'goalId',
      as: 'keyResults',
      onDelete: 'CASCADE'
    });
  };

  return Goal;
};
