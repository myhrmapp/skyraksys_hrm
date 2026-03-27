module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
    phone: {
      type: DataTypes.STRING,
      validate: {
        len: [10, 15]
      }
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'On Leave', 'Terminated'),
      defaultValue: 'Active'
    },
    // Statutory Details (India-specific)
    aadhaarNumber: {
      type: DataTypes.STRING,
      validate: {
        isEmptyOrValid(value) {
          if (value === '' || value === null || value === undefined) {
            return; // Allow empty values
          }
          if (!/^\d{12}$/.test(value)) {
            throw new Error('Aadhaar number must be exactly 12 digits');
          }
        }
      }
    },
    panNumber: {
      type: DataTypes.STRING,
      validate: {
        isEmptyOrValid(value) {
          if (value === '' || value === null || value === undefined) {
            return; // Allow empty values
          }
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
            throw new Error('PAN number must be in valid format (e.g., ABCDE1234F)');
          }
        }
      }
    },
    uanNumber: {
      type: DataTypes.STRING
    },
    pfNumber: {
      type: DataTypes.STRING
    },
    esiNumber: {
      type: DataTypes.STRING
    },
    // Bank Details
    bankName: {
      type: DataTypes.STRING
    },
    bankAccountNumber: {
      type: DataTypes.STRING
    },
    ifscCode: {
      type: DataTypes.STRING,
      validate: {
        isEmptyOrValid(value) {
          if (value === '' || value === null || value === undefined) {
            return; // Allow empty values
          }
          if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
            throw new Error('IFSC code must be in valid format (e.g., SBIN0001234)');
          }
        }
      }
    },
    bankBranch: {
      type: DataTypes.STRING
    },
    accountHolderName: {
      type: DataTypes.STRING
    },
    // Personal Details
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    state: {
      type: DataTypes.STRING
    },
    pinCode: {
      type: DataTypes.STRING,
      validate: {
        isEmptyOrValid(value) {
          if (value === '' || value === null || value === undefined) {
            return; // Allow empty values
          }
          if (!/^\d{6}$/.test(value)) {
            throw new Error('PIN code must be exactly 6 digits');
          }
        }
      }
    },
    emergencyContactName: {
      type: DataTypes.STRING
    },
    emergencyContactPhone: {
      type: DataTypes.STRING
    },
    emergencyContactRelation: {
      type: DataTypes.STRING
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
    },
    // Photo Upload
    photoUrl: {
      type: DataTypes.STRING,
      validate: {
        isEmptyOrValidUrl(value) {
          if (value === '' || value === null || value === undefined) {
            return; // Allow empty values
          }
          
          // Allow relative paths starting with /
          if (value.startsWith('/')) {
            return; // Valid relative path
          }
          
          // Basic full URL validation for absolute URLs
          const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          if (!urlPattern.test(value)) {
            throw new Error('Photo URL must be a valid URL or relative path');
          }
        }
      }
    },
    maritalStatus: {
      type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    },
    nationality: {
      type: DataTypes.STRING,
      defaultValue: 'Indian'
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'India'
    },
    // Work Details
    workLocation: {
      type: DataTypes.STRING
    },
    employmentType: {
      type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Intern'),
      defaultValue: 'Full-time'
    },
    joiningDate: {
      type: DataTypes.DATEONLY
    },
    confirmationDate: {
      type: DataTypes.DATEONLY
    },
    resignationDate: {
      type: DataTypes.DATEONLY
    },
    lastWorkingDate: {
      type: DataTypes.DATEONLY
    },
    probationPeriod: {
      type: DataTypes.INTEGER, // in months
      defaultValue: 6
    },
    noticePeriod: {
      type: DataTypes.INTEGER, // in days
      defaultValue: 30
    },
    // Comprehensive salary structure (JSON field)
    // DEPRECATED: Use the SalaryStructure association instead.
    // This field is auto-synced from SalaryStructure via afterFind hook below.
    salary: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidSalaryStructure(value) {
          if (value && typeof value === 'object') {
            // Basic validation for salary structure
            if (value.basicSalary !== undefined && (typeof value.basicSalary !== 'number' || value.basicSalary < 0)) {
              throw new Error('Basic salary must be a positive number');
            }
            if (value.currency && !['INR', 'USD', 'EUR', 'GBP'].includes(value.currency)) {
              throw new Error('Invalid currency');
            }
            if (value.payFrequency && !['weekly', 'biweekly', 'monthly', 'annually'].includes(value.payFrequency)) {
              throw new Error('Invalid pay frequency');
            }
          }
        }
      }
    }
  }, {
    tableName: 'employees',
    timestamps: true,
    paranoid: true,
    hooks: {
      // Auto-populate salary JSON from SalaryStructure association
      // so the frontend always sees current data regardless of which field it reads
      afterFind: (result) => {
        const syncSalary = (employee) => {
          if (employee && employee.salaryStructure) {
            const ss = employee.salaryStructure;
            employee.setDataValue('salary', {
              basicSalary: parseFloat(ss.basicSalary) || 0,
              allowances: {
                hra: parseFloat(ss.hra) || 0,
                transport: 0,
                medical: 0,
                food: 0,
                communication: 0,
                special: 0,
                other: parseFloat(ss.allowances) || 0
              },
              deductions: {
                pf: parseFloat(ss.pfContribution) || 0,
                incomeTax: parseFloat(ss.tds) || 0,
                professionalTax: parseFloat(ss.professionalTax) || 0,
                esi: parseFloat(ss.esi) || 0,
                other: parseFloat(ss.otherDeductions) || 0
              },
              benefits: {
                bonus: 0,
                incentive: 0,
                overtime: 0
              },
              taxInformation: {
                taxRegime: 'old',
                ctc: 0,
                takeHome: 0
              },
              currency: ss.currency || 'INR',
              effectiveFrom: ss.effectiveFrom,
              isActive: ss.isActive
            });
          }
        };
        if (Array.isArray(result)) {
          result.forEach(syncSalary);
        } else {
          syncSalary(result);
        }
      }
    }
  });

  Employee.associate = function(models) {
    Employee.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Employee.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
    
    Employee.belongsTo(models.Position, {
      foreignKey: 'positionId',
      as: 'position'
    });
    
    Employee.belongsTo(models.Employee, {
      foreignKey: 'managerId',
      as: 'manager'
    });
    
    Employee.hasMany(models.Employee, {
      foreignKey: 'managerId',
      as: 'subordinates'
    });
    
    Employee.hasMany(models.LeaveRequest, {
      foreignKey: 'employeeId',
      as: 'leaveRequests'
    });
    
    Employee.hasMany(models.LeaveBalance, {
      foreignKey: 'employeeId',
      as: 'leaveBalances'
    });
    
    Employee.hasMany(models.Timesheet, {
      foreignKey: 'employeeId',
      as: 'timesheets'
    });
    
    // Employee.hasMany(models.Payroll, {
    //   foreignKey: 'employeeId',
    //   as: 'payrolls'
    // });
    
    Employee.hasOne(models.SalaryStructure, {
      foreignKey: 'employeeId',
      as: 'salaryStructure'
    });
  };

  return Employee;
};
