module.exports = (sequelize, DataTypes) => {
  const LeaveRequest = sequelize.define('LeaveRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    leaveTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'leave_types',
        key: 'id'
      }
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    totalDays: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      validate: {
        min: 0,
        isPositive(value) {
          if (parseFloat(value) < 0) {
            throw new Error('Total days must be a positive number');
          }
        }
      },
      get() {
        const rawValue = this.getDataValue('totalDays');
        return rawValue ? parseFloat(rawValue) : null;
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested'),
      defaultValue: 'Pending'
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    rejectedAt: {
      type: DataTypes.DATE
    },
    approverComments: {
      type: DataTypes.TEXT
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for rejection'
    },
    employeeComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional comments from employee'
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of attachment file references'
    },
    isHalfDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    halfDayType: {
      type: DataTypes.ENUM('First Half', 'Second Half')
    },
    isCancellation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indicates if this is a cancellation request'
    },
    originalLeaveRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'References the original leave request being cancelled'
    },
    cancellationNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for cancellation'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'employees', key: 'id' },
      comment: 'Employee ID of the approver (manager/HR)'
    }
  }, {
    tableName: 'leave_requests',
    timestamps: true,
    paranoid: true
  });

  LeaveRequest.associate = function(models) {
    LeaveRequest.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
    
    LeaveRequest.belongsTo(models.LeaveType, {
      foreignKey: 'leaveTypeId',
      as: 'leaveType'
    });
    
    LeaveRequest.belongsTo(models.Employee, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    
    // Self-referential association for cancellations
    LeaveRequest.belongsTo(models.LeaveRequest, {
      foreignKey: 'originalLeaveRequestId',
      as: 'originalLeaveRequest'
    });
    
    LeaveRequest.hasMany(models.LeaveRequest, {
      foreignKey: 'originalLeaveRequestId',
      as: 'cancellationRequests'
    });
  };

  return LeaveRequest;
};
