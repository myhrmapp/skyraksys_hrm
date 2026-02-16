module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
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
    code: {
      type: DataTypes.STRING(10),
      allowNull: true, // Allow null for backward compatibility
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'departments',
    timestamps: true,
    paranoid: true
  });

  Department.associate = function(models) {
    // Self-referencing association for department hierarchy
    Department.belongsTo(Department, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    Department.hasMany(Department, {
      foreignKey: 'parentId',
      as: 'children'
    });

    Department.belongsTo(models.Employee, {
      foreignKey: 'managerId',
      as: 'manager'
    });

    Department.hasMany(models.Employee, {
      foreignKey: 'departmentId',
      as: 'employees'
    });
    
    Department.hasMany(models.Position, {
      foreignKey: 'departmentId',
      as: 'positions'
    });
  };

  return Department;
};
