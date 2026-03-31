module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define('LeaveType', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    maxDaysPerYear: {
      type: DataTypes.INTEGER,
      defaultValue: 20
    },
    carryForward: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    maxCarryForwardDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this leave type is paid (true) or results in LOP deduction (false)'
    }
  }, {
    tableName: 'leave_types',
    timestamps: true,
    paranoid: true
  });

  LeaveType.associate = function(models) {
    LeaveType.hasMany(models.LeaveRequest, {
      foreignKey: 'leaveTypeId',
      as: 'leaveRequests'
    });
    
    LeaveType.hasMany(models.LeaveBalance, {
      foreignKey: 'leaveTypeId',
      as: 'leaveBalances'
    });
  };

  return LeaveType;
};
