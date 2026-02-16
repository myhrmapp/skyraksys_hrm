/**
 * Attendance Model (GAP Item 12.1)
 * 
 * Tracks daily employee attendance: check-in, check-out, hours worked,
 * overtime, and status (present, absent, half-day, on-leave, holiday, weekend).
 */

module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      comment: 'FK to employees table'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Attendance date'
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Check-in timestamp'
    },
    checkOut: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Check-out timestamp'
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'half-day', 'on-leave', 'holiday', 'weekend', 'late'),
      allowNull: false,
      defaultValue: 'present',
      comment: 'Attendance status for the day'
    },
    hoursWorked: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Total hours worked (auto-calculated from check-in/out)'
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Overtime hours beyond standard work hours'
    },
    lateMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Minutes late from standard start time'
    },
    earlyLeaveMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Minutes left early from standard end time'
    },
    breakDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Break duration in minutes'
    },
    source: {
      type: DataTypes.ENUM('manual', 'biometric', 'web', 'mobile'),
      defaultValue: 'web',
      comment: 'How the attendance was recorded'
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Optional notes (reason for late arrival, etc.)'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address at check-in (for web/mobile)'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      comment: 'Manager/admin who approved manual adjustments'
    }
  }, {
    tableName: 'attendances',
    timestamps: true,
    paranoid: true, // soft-delete support
    indexes: [
      { unique: true, fields: ['employeeId', 'date'], name: 'idx_attendance_employee_date' },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['employeeId', 'date', 'status'], name: 'idx_attendance_emp_date_status' }
    ]
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.Employee, { foreignKey: 'employeeId', as: 'employee' });
    Attendance.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
  };

  return Attendance;
};
