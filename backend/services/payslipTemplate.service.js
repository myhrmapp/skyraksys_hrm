/**
 * Payslip Template Management Service
 * Handles template CRUD operations, validation, and default templates
 */

const { PayslipTemplate } = require('../models');
const logger = require('../utils/logger');

class PayslipTemplateService {
  constructor() {
    this.defaultTemplate = this.getDefaultTemplate();
  }

  /**
   * Get default payslip template structure
   */
  getDefaultTemplate() {
    return {
      name: 'Default Indian Payslip Template',
      description: 'Standard payslip template following Indian statutory requirements',
      version: '1.0',
      isDefault: true,
      isActive: true,
      
      companyInfo: {
        fields: ['name', 'address', 'city', 'state', 'pincode', 'pan', 'tan', 'pfNumber', 'esicNumber'],
        logo: true
      },
      
      employeeInfo: {
        fields: [
          'employeeId',
          'name',
          'designation',
          'department',
          'dateOfJoining',
          'panNumber',
          'uanNumber',
          'pfNumber',
          'esiNumber',
          'bankAccountNumber',
          'bankName'
        ]
      },
      
      payPeriodInfo: {
        fields: ['payPeriod', 'payPeriodStart', 'payPeriodEnd', 'payDate', 'payslipNumber']
      },
      
      earnings: {
        title: 'Earnings',
        fields: [
          { name: 'basicSalary', label: 'Basic Salary', type: 'currency', required: true },
          { name: 'hra', label: 'House Rent Allowance (HRA)', type: 'currency', required: true },
          { name: 'transportAllowance', label: 'Transport Allowance', type: 'currency', required: false },
          { name: 'medicalAllowance', label: 'Medical Allowance', type: 'currency', required: false },
          { name: 'foodAllowance', label: 'Food Allowance', type: 'currency', required: false },
          { name: 'communicationAllowance', label: 'Communication Allowance', type: 'currency', required: false },
          { name: 'specialAllowance', label: 'Special Allowance', type: 'currency', required: false },
          { name: 'otherAllowance', label: 'Other Allowances', type: 'currency', required: false },
          { name: 'overtimePay', label: 'Overtime Pay', type: 'currency', required: false },
          { name: 'bonus', label: 'Bonus', type: 'currency', required: false },
          { name: 'arrears', label: 'Arrears', type: 'currency', required: false }
        ],
        showTotal: true,
        totalLabel: 'Gross Earnings'
      },
      
      deductions: {
        title: 'Deductions',
        fields: [
          { name: 'providentFund', label: 'Provident Fund (PF)', type: 'currency', required: true },
          { name: 'esic', label: 'ESI Contribution', type: 'currency', required: false },
          { name: 'professionalTax', label: 'Professional Tax', type: 'currency', required: true },
          { name: 'tds', label: 'TDS (Income Tax)', type: 'currency', required: false },
          { name: 'loanDeduction', label: 'Loan/Advance Deduction', type: 'currency', required: false },
          { name: 'medicalPremium', label: 'Medical Insurance', type: 'currency', required: false },
          { name: 'nps', label: 'NPS Contribution', type: 'currency', required: false },
          { name: 'voluntaryPF', label: 'Voluntary PF', type: 'currency', required: false },
          { name: 'otherDeductions', label: 'Other Deductions', type: 'currency', required: false }
        ],
        showTotal: true,
        totalLabel: 'Total Deductions'
      },
      
      attendance: {
        title: 'Attendance Summary',
        fields: [
          { name: 'totalWorkingDays', label: 'Total Working Days', type: 'number' },
          { name: 'presentDays', label: 'Present Days', type: 'number' },
          { name: 'absentDays', label: 'Absent Days', type: 'number' },
          { name: 'lopDays', label: 'LOP Days', type: 'number' },
          { name: 'paidDays', label: 'Paid Days', type: 'number' },
          { name: 'overtimeHours', label: 'Overtime Hours', type: 'number' },
          { name: 'weeklyOffs', label: 'Weekly Offs', type: 'number' },
          { name: 'holidays', label: 'Holidays', type: 'number' }
        ]
      },
      
      summary: {
        fields: [
          { name: 'grossEarnings', label: 'Gross Earnings', type: 'currency', bold: true },
          { name: 'totalDeductions', label: 'Total Deductions', type: 'currency', bold: true },
          { name: 'netPay', label: 'Net Pay', type: 'currency', bold: true, highlight: true }
        ],
        showInWords: true
      },
      
      footer: {
        fields: [
          'generatedDate',
          'disclaimer',
          'companySignature'
        ],
        disclaimer: 'This is a computer-generated payslip and does not require a signature.'
      },
      
      styling: {
        primaryColor: '#2196F3',
        secondaryColor: '#FFC107',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        headerBackground: '#f5f5f5',
        borderColor: '#ddd'
      }
    };
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData, createdBy) {
    try {
      // Validate template structure
      const validation = this.validateTemplate(templateData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Template validation failed',
          errors: validation.errors
        };
      }

      // Create template
      const template = await PayslipTemplate.create({
        name: templateData.name,
        description: templateData.description,
        version: templateData.version || '1.0',
        isDefault: templateData.isDefault || false,
        isActive: templateData.isActive !== false,
        templateData: templateData,
        createdBy: createdBy
      });

      return {
        success: true,
        message: 'Template created successfully',
        data: template
      };
    } catch (error) {
      logger.error('Create template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to create template',
        error: error.message
      };
    }
  }

  /**
   * Get all templates
   */
  async getAllTemplates(filters = {}) {
    try {
      const where = {};
      
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      if (filters.isDefault !== undefined) {
        where.isDefault = filters.isDefault;
      }

      const templates = await PayslipTemplate.findAll({
        where,
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: templates
      };
    } catch (error) {
      logger.error('Get templates error:', { detail: error });
      return {
        success: false,
        message: 'Failed to fetch templates',
        error: error.message
      };
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId) {
    try {
      const template = await PayslipTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      return {
        success: true,
        data: template
      };
    } catch (error) {
      logger.error('Get template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to fetch template',
        error: error.message
      };
    }
  }

  /**
   * Get default template
   */
  async getDefaultTemplateFromDB() {
    try {
      let template = await PayslipTemplate.findOne({
        where: { isDefault: true, isActive: true }
      });

      // If no default template exists, create one
      if (!template) {
        const result = await this.createTemplate(this.defaultTemplate, null);
        if (result.success) {
          template = result.data;
        }
      }

      return {
        success: true,
        data: template || this.defaultTemplate
      };
    } catch (error) {
      logger.error('Get default template error:', { detail: error });
      return {
        success: true,
        data: this.defaultTemplate // Fallback to hardcoded default
      };
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, templateData, updatedBy) {
    try {
      const template = await PayslipTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Validate template structure
      const validation = this.validateTemplate(templateData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Template validation failed',
          errors: validation.errors
        };
      }

      // Update template
      await template.update({
        name: templateData.name || template.name,
        description: templateData.description || template.description,
        version: templateData.version || template.version,
        isDefault: templateData.isDefault !== undefined ? templateData.isDefault : template.isDefault,
        isActive: templateData.isActive !== undefined ? templateData.isActive : template.isActive,
        templateData: templateData,
        updatedBy: updatedBy
      });

      return {
        success: true,
        message: 'Template updated successfully',
        data: template
      };
    } catch (error) {
      logger.error('Update template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to update template',
        error: error.message
      };
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(templateId) {
    try {
      const template = await PayslipTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Don't allow deleting default template
      if (template.isDefault) {
        return {
          success: false,
          message: 'Cannot delete default template'
        };
      }

      // Soft delete
      await template.update({ isActive: false });

      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error) {
      logger.error('Delete template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to delete template',
        error: error.message
      };
    }
  }

  /**
   * Set default template
   */
  async setDefaultTemplate(templateId) {
    try {
      // Remove default flag from all templates
      await PayslipTemplate.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );

      // Set new default
      const template = await PayslipTemplate.findByPk(templateId);
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      await template.update({ isDefault: true, isActive: true });

      return {
        success: true,
        message: 'Default template updated successfully',
        data: template
      };
    } catch (error) {
      logger.error('Set default template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to set default template',
        error: error.message
      };
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId, newName, createdBy) {
    try {
      const original = await PayslipTemplate.findByPk(templateId);
      
      if (!original) {
        return {
          success: false,
          message: 'Original template not found'
        };
      }

      // Create duplicate
      const duplicateData = {
        ...original.templateData,
        name: newName || `${original.name} (Copy)`,
        isDefault: false
      };

      return await this.createTemplate(duplicateData, createdBy);
    } catch (error) {
      logger.error('Duplicate template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to duplicate template',
        error: error.message
      };
    }
  }

  /**
   * Validate template structure
   */
  validateTemplate(templateData) {
    const errors = [];

    // Required fields
    if (!templateData.name || templateData.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!templateData.earnings || !templateData.earnings.fields || templateData.earnings.fields.length === 0) {
      errors.push('At least one earnings field is required');
    }

    if (!templateData.deductions || !templateData.deductions.fields || templateData.deductions.fields.length === 0) {
      errors.push('At least one deductions field is required');
    }

    // Validate earnings fields
    if (templateData.earnings && templateData.earnings.fields) {
      templateData.earnings.fields.forEach((field, index) => {
        if (!field.name) {
          errors.push(`Earnings field at index ${index} is missing name`);
        }
        if (!field.label) {
          errors.push(`Earnings field at index ${index} is missing label`);
        }
      });
    }

    // Validate deductions fields
    if (templateData.deductions && templateData.deductions.fields) {
      templateData.deductions.fields.forEach((field, index) => {
        if (!field.name) {
          errors.push(`Deductions field at index ${index} is missing name`);
        }
        if (!field.label) {
          errors.push(`Deductions field at index ${index} is missing label`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template variants (predefined templates)
   */
  getTemplateVariants() {
    return [
      {
        id: 'basic',
        name: 'Basic Template',
        description: 'Minimal payslip with essential fields only',
        thumbnail: '/templates/basic-thumbnail.png'
      },
      {
        id: 'detailed',
        name: 'Detailed Template',
        description: 'Comprehensive payslip with all allowances and deductions',
        thumbnail: '/templates/detailed-thumbnail.png'
      },
      {
        id: 'executive',
        name: 'Executive Template',
        description: 'Professional template for senior management',
        thumbnail: '/templates/executive-thumbnail.png'
      },
      {
        id: 'contract',
        name: 'Contract Worker Template',
        description: 'Simplified template for contract/freelance workers',
        thumbnail: '/templates/contract-thumbnail.png'
      }
    ];
  }

  /**
   * Export template as JSON
   */
  async exportTemplate(templateId) {
    try {
      const template = await PayslipTemplate.findByPk(templateId);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      return {
        success: true,
        data: {
          name: template.name,
          description: template.description,
          version: template.version,
          templateData: template.templateData,
          exportedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Export template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to export template',
        error: error.message
      };
    }
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateJson, createdBy) {
    try {
      // Validate imported data
      if (!templateJson.name || !templateJson.templateData) {
        return {
          success: false,
          message: 'Invalid template JSON'
        };
      }

      const templateData = {
        ...templateJson.templateData,
        name: templateJson.name,
        description: templateJson.description,
        version: templateJson.version || '1.0',
        isDefault: false
      };

      return await this.createTemplate(templateData, createdBy);
    } catch (error) {
      logger.error('Import template error:', { detail: error });
      return {
        success: false,
        message: 'Failed to import template',
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const payslipTemplateService = new PayslipTemplateService();

module.exports = {
  PayslipTemplateService,
  payslipTemplateService
};
