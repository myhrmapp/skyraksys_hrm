const db = require('../../../models');

describe('PayslipTemplate Model', () => {
  afterEach(async () => {
    await db.PayslipTemplate.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create payslip template with required name', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Standard Payslip Template'
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Standard Payslip Template');
    });

    it('should fail without name', async () => {
      await expect(db.PayslipTemplate.create({
        description: 'A template'
      })).rejects.toThrow();
    });

    it('should validate name length', async () => {
      await expect(db.PayslipTemplate.create({
        name: ''
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default isDefault as false', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Custom Template'
      });

      expect(template.isDefault).toBe(false);
    });

    it('should apply default isActive as true', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Active Template'
      });

      expect(template.isActive).toBe(true);
    });

    it('should apply default JSON fields as arrays or objects', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'JSON Template'
      });

      expect(Array.isArray(template.headerFields)).toBe(true);
      expect(Array.isArray(template.earningsFields)).toBe(true);
      expect(Array.isArray(template.deductionsFields)).toBe(true);
      expect(Array.isArray(template.footerFields)).toBe(true);
      expect(typeof template.styling).toBe('object');
    });

    it('should apply default styling configuration', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Styled Template'
      });

      expect(template.styling.fontFamily).toBe('Arial');
      expect(template.styling.fontSize).toBe('12px');
      expect(template.styling.headerColor).toBe('#1976d2');
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Detailed Template',
        description: 'Comprehensive payslip template with all fields'
      });

      expect(template.description).toBe('Comprehensive payslip template with all fields');
    });

    it('should allow custom JSON configurations', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Custom JSON Template',
        headerFields: [{ name: 'Company Logo', type: 'image' }],
        earningsFields: [{ name: 'Basic Salary', formula: 'base' }],
        deductionsFields: [{ name: 'Tax', formula: 'gross * 0.1' }]
      });

      expect(template.headerFields.length).toBe(1);
      expect(template.earningsFields[0].name).toBe('Basic Salary');
      expect(template.deductionsFields[0].formula).toBe('gross * 0.1');
    });

    it('should allow setting isDefault flag', async () => {
      const template = await db.PayslipTemplate.create({
        name: 'Default Template',
        isDefault: true
      });

      expect(template.isDefault).toBe(true);
    });
  });
});
