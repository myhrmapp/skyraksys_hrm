module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define('Position', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true, // Allow null for backward compatibility
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    level: {
      type: DataTypes.ENUM('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'),
      defaultValue: 'Entry'
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    minSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('minSalary');
        if (rawValue === null || rawValue === undefined) return null;
        const parsed = parseFloat(rawValue);
        return isNaN(parsed) ? null : parsed;
      }
    },
    maxSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('maxSalary');
        if (rawValue === null || rawValue === undefined) return null;
        const parsed = parseFloat(rawValue);
        return isNaN(parsed) ? null : parsed;
      }
    },
    responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('responsibilities');
        return rawValue ? rawValue : null;
      }
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('requirements');
        return rawValue ? rawValue : null;
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'positions',
    timestamps: true,
    paranoid: true
  });

  Position.associate = function(models) {
    Position.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
    
    Position.hasMany(models.Employee, {
      foreignKey: 'positionId',
      as: 'employees'
    });
  };

  return Position;
};
