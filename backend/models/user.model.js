module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'hr', 'manager', 'employee'),
      allowNull: false,
      defaultValue: 'employee'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLoginAt: {
      type: DataTypes.DATE
    },
    passwordChangedAt: {
      type: DataTypes.DATE
    },
    emailVerifiedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft delete
    defaultScope: {
      attributes: { exclude: ['password'] }
    },
    scopes: {
      withPassword: {
        attributes: {}
      }
    }
  });

  User.associate = function(models) {
    // User-Employee association
    User.hasOne(models.Employee, {
      foreignKey: 'userId',
      as: 'employee'
    });
    
    User.hasMany(models.RefreshToken, {
      foreignKey: 'userId',
      as: 'refreshTokens'
    });
  };

  return User;
};
