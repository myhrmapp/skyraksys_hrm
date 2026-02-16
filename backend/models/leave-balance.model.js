module.exports = (sequelize, DataTypes) => {
  const LeaveBalance = sequelize.define('LeaveBalance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    totalAccrued: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    totalTaken: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    totalPending: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    balance: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    carryForward: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'leave_balances',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        unique: true,
        fields: ['employeeId', 'leaveTypeId', 'year']
      }
    ]
  });

  LeaveBalance.associate = function(models) {
    LeaveBalance.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
    
    LeaveBalance.belongsTo(models.LeaveType, {
      foreignKey: 'leaveTypeId',
      as: 'leaveType'
    });
  };

  return LeaveBalance;
};
