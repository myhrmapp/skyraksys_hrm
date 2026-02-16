const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeReview = sequelize.define('EmployeeReview', {
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
    reviewerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reviewPeriod: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., 'Q1 2025', 'Annual 2025'
    },
    reviewType: {
      type: DataTypes.ENUM,
      values: ['quarterly', 'annual', 'probationary', 'performance_improvement'],
      defaultValue: 'quarterly'
    },
    overallRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    technicalSkills: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    communication: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    teamwork: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    leadership: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    punctuality: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    achievements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    areasForImprovement: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    goals: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewerComments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    employeeSelfAssessment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM,
      values: ['draft', 'pending_employee_input', 'pending_approval', 'completed', 'archived'],
      defaultValue: 'draft'
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    hrApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hrApprovedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    hrApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'employee_reviews',
    timestamps: true,
    paranoid: true, // Enable soft delete
    indexes: [
      {
        fields: ['employeeId']
      },
      {
        fields: ['reviewerId']
      },
      {
        fields: ['reviewPeriod']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['employeeId', 'reviewPeriod'],
        name: 'uq_employee_reviews_employee_period'
      }
    ]
  });

  // Define associations
  EmployeeReview.associate = (models) => {
    // Review belongs to an employee
    EmployeeReview.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });

    // Review has a reviewer (manager/HR)
    EmployeeReview.belongsTo(models.User, {
      foreignKey: 'reviewerId',
      as: 'reviewer'
    });

    // HR approval user
    EmployeeReview.belongsTo(models.User, {
      foreignKey: 'hrApprovedBy',
      as: 'hrApprover'
    });
  };

  return EmployeeReview;
};
