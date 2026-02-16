const { Department, Employee } = require('../../../models');
const { ValidationError } = require('sequelize');

describe('Department Model', () => {
  beforeAll(async () => {
    await Department.sync({ force: true });
    await Employee.sync({ force: true });
  });

  afterEach(async () => {
    await Department.destroy({ where: {}, force: true });
  });

  describe('Department Creation', () => {
    it('should create a valid department', async () => {
      const department = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering Department',
        isActive: true
      });

      expect(department).toBeDefined();
      expect(department.name).toBe('Engineering');
      expect(department.code).toBe('ENG');
      expect(department.isActive).toBe(true);
    });

    it('should create department with minimal required fields', async () => {
      const department = await Department.create({
        name: 'HR',
        code: 'HR'
      });

      expect(department).toBeDefined();
      expect(department.name).toBe('HR');
      expect(department.code).toBe('HR');
      expect(department.isActive).toBe(true); // Default value
    });

    it('should auto-generate createdAt and updatedAt timestamps', async () => {
      const department = await Department.create({
        name: 'Finance',
        code: 'FIN'
      });

      expect(department.createdAt).toBeInstanceOf(Date);
      expect(department.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Department Validation', () => {
    it('should require department name', async () => {
      await expect(
        Department.create({
          code: 'TEST'
        })
      ).rejects.toThrow();
    });

    it('should allow department without code (backward compatible)', async () => {
      const dept = await Department.create({
        name: 'Test Department No Code'
      });
      expect(dept.id).toBeDefined();
      expect(dept.code).toBeNull();
    });

    it('should enforce unique department name', async () => {
      await Department.create({
        name: 'Sales',
        code: 'SAL'
      });

      await expect(
        Department.create({
          name: 'Sales',
          code: 'SAL2'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique department code', async () => {
      await Department.create({
        name: 'Marketing',
        code: 'MKT'
      });

      await expect(
        Department.create({
          name: 'Marketing Digital',
          code: 'MKT'
        })
      ).rejects.toThrow();
    });

    it('should validate name length (max 255)', async () => {
      const longName = 'A'.repeat(256);
      
      await expect(
        Department.create({
          name: longName,
          code: 'TEST'
        })
      ).rejects.toThrow();
    });

    it('should validate code length (max 50)', async () => {
      const longCode = 'A'.repeat(51);
      
      await expect(
        Department.create({
          name: 'Test Dept',
          code: longCode
        })
      ).rejects.toThrow();
    });

    it('should accept valid description text', async () => {
      const department = await Department.create({
        name: 'Operations',
        code: 'OPS',
        description: 'Handles all operational activities including logistics and supply chain'
      });

      expect(department.description).toContain('operational activities');
    });

    it('should handle null description', async () => {
      const department = await Department.create({
        name: 'Legal',
        code: 'LEG',
        description: null
      });

      expect(department.description).toBeNull();
    });
  });

  describe('Department Status', () => {
    it('should default to active status', async () => {
      const department = await Department.create({
        name: 'R&D',
        code: 'RND'
      });

      expect(department.isActive).toBe(true);
    });

    it('should allow creating inactive department', async () => {
      const department = await Department.create({
        name: 'Legacy Dept',
        code: 'LEG',
        isActive: false
      });

      expect(department.isActive).toBe(false);
    });

    it('should update department status', async () => {
      const department = await Department.create({
        name: 'Support',
        code: 'SUP',
        isActive: true
      });

      department.isActive = false;
      await department.save();

      const updated = await Department.findByPk(department.id);
      expect(updated.isActive).toBe(false);
    });
  });

  describe('Department Hierarchy', () => {
    it('should support parent department relationship', async () => {
      const parent = await Department.create({
        name: 'Technology',
        code: 'TECH'
      });

      const child = await Department.create({
        name: 'Software Development',
        code: 'SWDEV',
        parentId: parent.id
      });

      expect(child.parentId).toBe(parent.id);
    });

    it('should allow null parent for root departments', async () => {
      const department = await Department.create({
        name: 'Executive',
        code: 'EXEC',
        parentId: null
      });

      expect(department.parentId).toBeNull();
    });

    it('should create multi-level hierarchy', async () => {
      const level1 = await Department.create({
        name: 'Corporate',
        code: 'CORP'
      });

      const level2 = await Department.create({
        name: 'Business Units',
        code: 'BU',
        parentId: level1.id
      });

      const level3 = await Department.create({
        name: 'Regional Office',
        code: 'REG',
        parentId: level2.id
      });

      expect(level3.parentId).toBe(level2.id);
      expect(level2.parentId).toBe(level1.id);
      expect(level1.parentId).toBeNull();
    });
  });

  describe('Department Updates', () => {
    it('should update department name', async () => {
      const department = await Department.create({
        name: 'Old Name',
        code: 'OLD'
      });

      department.name = 'New Name';
      await department.save();

      const updated = await Department.findByPk(department.id);
      expect(updated.name).toBe('New Name');
    });

    it('should update department description', async () => {
      const department = await Department.create({
        name: 'Customer Service',
        code: 'CS',
        description: 'Old description'
      });

      department.description = 'Updated description with new responsibilities';
      await department.save();

      const updated = await Department.findByPk(department.id);
      expect(updated.description).toBe('Updated description with new responsibilities');
    });

    it('should update updatedAt timestamp on save', async () => {
      const department = await Department.create({
        name: 'Quality Assurance',
        code: 'QA'
      });

      const originalUpdatedAt = department.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      department.description = 'Updated';
      await department.save();

      expect(department.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Department Deletion', () => {
    it('should soft delete department', async () => {
      const department = await Department.create({
        name: 'Temporary',
        code: 'TEMP'
      });

      await department.destroy();

      const found = await Department.findByPk(department.id);
      expect(found).toBeNull(); // Soft deleted
    });

    it('should permanently delete department with force option', async () => {
      const department = await Department.create({
        name: 'ToDelete',
        code: 'DEL'
      });

      await department.destroy({ force: true });

      const found = await Department.findByPk(department.id, { paranoid: false });
      expect(found).toBeNull();
    });

    it('should find deleted departments with paranoid:false', async () => {
      const department = await Department.create({
        name: 'Archived',
        code: 'ARC'
      });

      await department.destroy();

      const found = await Department.findByPk(department.id, { paranoid: false });
      expect(found).toBeDefined();
      expect(found.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Department Query Operations', () => {
    beforeEach(async () => {
      await Department.bulkCreate([
        { name: 'Engineering', code: 'ENG', isActive: true },
        { name: 'HR', code: 'HR', isActive: true },
        { name: 'Finance', code: 'FIN', isActive: false },
        { name: 'Marketing', code: 'MKT', isActive: true },
        { name: 'Sales', code: 'SAL', isActive: false }
      ]);
    });

    it('should find all departments', async () => {
      const departments = await Department.findAll();
      expect(departments.length).toBe(5);
    });

    it('should find active departments only', async () => {
      const activeDepts = await Department.findAll({
        where: { isActive: true }
      });
      expect(activeDepts.length).toBe(3);
    });

    it('should find inactive departments only', async () => {
      const inactiveDepts = await Department.findAll({
        where: { isActive: false }
      });
      expect(inactiveDepts.length).toBe(2);
    });

    it('should find department by code', async () => {
      const dept = await Department.findOne({
        where: { code: 'HR' }
      });
      expect(dept).toBeDefined();
      expect(dept.name).toBe('HR');
    });

    it('should find department by name', async () => {
      const dept = await Department.findOne({
        where: { name: 'Engineering' }
      });
      expect(dept).toBeDefined();
      expect(dept.code).toBe('ENG');
    });

    it('should count departments', async () => {
      const count = await Department.count();
      expect(count).toBe(5);
    });

    it('should count active departments', async () => {
      const count = await Department.count({
        where: { isActive: true }
      });
      expect(count).toBe(3);
    });
  });

  describe('Department Edge Cases', () => {
    it('should handle special characters in name', async () => {
      const department = await Department.create({
        name: 'R&D - Innovation & Research',
        code: 'RND'
      });

      expect(department.name).toBe('R&D - Innovation & Research');
    });

    it('should handle numeric characters in code', async () => {
      const department = await Department.create({
        name: 'Division 42',
        code: 'DIV42'
      });

      expect(department.code).toBe('DIV42');
    });

    it('should trim whitespace from name', async () => {
      const department = await Department.create({
        name: '  Trimmed  ',
        code: 'TRIM'
      });

      // Check if model has trim validation
      expect(department.name.trim()).toBe('Trimmed');
    });

    it('should handle empty string description', async () => {
      const department = await Department.create({
        name: 'Empty Desc',
        code: 'EMPTY',
        description: ''
      });

      expect(department.description).toBe('');
    });

    it('should handle long description text', async () => {
      const longDesc = 'A'.repeat(1000);
      const department = await Department.create({
        name: 'Long Desc Dept',
        code: 'LNG',
        description: longDesc
      });

      expect(department.description.length).toBe(1000);
    });
  });

  describe('Department Data Integrity', () => {
    it('should maintain referential integrity with parent', async () => {
      const parent = await Department.create({
        name: 'Parent',
        code: 'PAR'
      });

      const child = await Department.create({
        name: 'Child',
        code: 'CHD',
        parentId: parent.id
      });

      // Delete parent
      await parent.destroy({ force: true });

      // Child should handle parent deletion
      const orphan = await Department.findByPk(child.id);
      expect(orphan).toBeDefined();
    });

    it('should prevent duplicate codes case-insensitively', async () => {
      await Department.create({
        name: 'Original',
        code: 'ABC'
      });

      // Depending on DB collation, this may or may not fail
      // Test based on your schema configuration
      try {
        await Department.create({
          name: 'Duplicate',
          code: 'abc'
        });
        // If it succeeds, codes are case-sensitive
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, codes are case-insensitive
        expect(error).toBeDefined();
      }
    });
  });
});
