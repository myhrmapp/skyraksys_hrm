module.exports = (sequelize, DataTypes) => {
  const Timesheet = sequelize.define('Timesheet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' }
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' }
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tasks', key: 'id' }
    },
    weekStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start of week (Monday)'
    },
    weekEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End of week (Sunday)'
    },
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ISO week number'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Year of the week'
    },
    totalHoursWorked: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('totalHoursWorked');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    mondayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('mondayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    tuesdayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('tuesdayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    wednesdayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('wednesdayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    thursdayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('thursdayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    fridayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('fridayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    saturdayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('saturdayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    sundayHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0,
      get() {
        const rawValue = this.getDataValue('sundayHours');
        return rawValue ? parseFloat(rawValue) : 0;
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Rejected'),
      defaultValue: 'Draft'
    },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    rejectedAt: { type: DataTypes.DATE, allowNull: true },
    approverComments: { type: DataTypes.TEXT, allowNull: true },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'employees', key: 'id' }
    },
    rejectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'employees', key: 'id' }
    }
  }, {
    tableName: 'timesheets',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['employeeId', 'weekStartDate'] },
      { fields: ['projectId', 'weekStartDate'] },
      { fields: ['status'] },
      { fields: ['weekStartDate', 'weekEndDate'] },
      {
        unique: true,
        fields: ['employeeId', 'weekStartDate', 'projectId', 'taskId'],
        name: 'uq_timesheets_employee_week_project_task'
      }
    ]
  });

  Timesheet.associate = function(models) {
    Timesheet.belongsTo(models.Employee, { foreignKey: 'employeeId', as: 'employee' });
    Timesheet.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    Timesheet.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task' });
    Timesheet.belongsTo(models.Employee, { foreignKey: 'approvedBy', as: 'approver' });
    Timesheet.belongsTo(models.Employee, { foreignKey: 'rejectedBy', as: 'rejector' });
  };

  return Timesheet;
};