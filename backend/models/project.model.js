module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    startDate: {
      type: DataTypes.DATEONLY
    },
    endDate: {
      type: DataTypes.DATEONLY
    },
    status: {
      type: DataTypes.ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'),
      defaultValue: 'Planning'
    },
    clientName: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    paranoid: true
  });

  Project.associate = function(models) {
    Project.belongsTo(models.Employee, {
      foreignKey: 'managerId',
      as: 'manager'
    });
    
    Project.hasMany(models.Task, {
      foreignKey: 'projectId',
      as: 'tasks'
    });
    
    Project.hasMany(models.Timesheet, {
      foreignKey: 'projectId',
      as: 'timesheets'
    });
  };

  return Project;
};
