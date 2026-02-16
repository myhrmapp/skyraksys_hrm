/**
 * Holiday Model (GAP Item 12.5)
 * 
 * Manages public/company holidays for payroll, leave, and timesheet calculations.
 */

module.exports = (sequelize, DataTypes) => {
  const Holiday = sequelize.define('Holiday', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Holiday name (e.g., New Year, Eid)'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Holiday date'
    },
    type: {
      type: DataTypes.ENUM('public', 'restricted', 'company'),
      allowNull: false,
      defaultValue: 'public',
      comment: 'public=all employees off, restricted=optional, company=company-specific'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Calendar year for quick filtering'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this holiday repeats every year on the same date'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Optional description or notes'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Soft toggle — inactive holidays are not counted'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'holidays',
    timestamps: true,
    indexes: [
      { fields: ['year'] },
      { fields: ['date'] },
      { unique: true, fields: ['date', 'name'], name: 'holidays_date_name_unique' }
    ]
  });

  Holiday.associate = function(models) {
    Holiday.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Holiday;
};
