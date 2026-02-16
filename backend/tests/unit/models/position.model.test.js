const { Position, Department } = require('../../../models');
const { ValidationError } = require('sequelize');

describe('Position Model', () => {
  let testDepartment;

  beforeAll(async () => {
    await Department.sync({ force: true });
    await Position.sync({ force: true });
    
    // Create test department
    testDepartment = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });
  });

  afterEach(async () => {
    await Position.destroy({ where: {}, force: true });
  });

  describe('Position Creation', () => {
    it('should create a valid position', async () => {
      const position = await Position.create({
        title: 'Senior Software Engineer',
        code: 'SSE',
        departmentId: testDepartment.id,
        minSalary: 80000,
        maxSalary: 120000,
        isActive: true
      });

      expect(position).toBeDefined();
      expect(position.title).toBe('Senior Software Engineer');
      expect(position.code).toBe('SSE');
      expect(position.minSalary).toBe(80000);
      expect(position.maxSalary).toBe(120000);
    });

    it('should create position with minimal required fields', async () => {
      const position = await Position.create({
        title: 'Developer',
        code: 'DEV',
        departmentId: testDepartment.id
      });

      expect(position).toBeDefined();
      expect(position.title).toBe('Developer');
      expect(position.minSalary).toBeNull();
      expect(position.maxSalary).toBeNull();
    });

    it('should auto-generate timestamps', async () => {
      const position = await Position.create({
        title: 'QA Engineer',
        code: 'QAE',
        departmentId: testDepartment.id
      });

      expect(position.createdAt).toBeInstanceOf(Date);
      expect(position.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Position Validation', () => {
    it('should require position title', async () => {
      await expect(
        Position.create({
          code: 'TEST',
          departmentId: testDepartment.id
        })
      ).rejects.toThrow();
    });

    it('should allow position without code (backward compatible)', async () => {
      const pos = await Position.create({
        title: 'Test Position No Code',
        departmentId: testDepartment.id
      });
      expect(pos.id).toBeDefined();
      expect(pos.code).toBeNull();
    });

    it('should require department association', async () => {
      await expect(
        Position.create({
          title: 'Test Position',
          code: 'TST'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique position code', async () => {
      await Position.create({
        title: 'Manager',
        code: 'MGR',
        departmentId: testDepartment.id
      });

      await expect(
        Position.create({
          title: 'Senior Manager',
          code: 'MGR',
          departmentId: testDepartment.id
        })
      ).rejects.toThrow();
    });

    it('should validate title length (max 255)', async () => {
      const longTitle = 'A'.repeat(256);
      
      await expect(
        Position.create({
          title: longTitle,
          code: 'TEST',
          departmentId: testDepartment.id
        })
      ).rejects.toThrow();
    });

    it('should validate code length (max 50)', async () => {
      const longCode = 'A'.repeat(51);
      
      await expect(
        Position.create({
          title: 'Test Position',
          code: longCode,
          departmentId: testDepartment.id
        })
      ).rejects.toThrow();
    });
  });

  describe('Salary Range Validation', () => {
    it('should accept valid salary range', async () => {
      const position = await Position.create({
        title: 'Analyst',
        code: 'ANL',
        departmentId: testDepartment.id,
        minSalary: 50000,
        maxSalary: 70000
      });

      expect(position.minSalary).toBe(50000);
      expect(position.maxSalary).toBe(70000);
    });

    it('should handle null salary values', async () => {
      const position = await Position.create({
        title: 'Intern',
        code: 'INT',
        departmentId: testDepartment.id,
        minSalary: null,
        maxSalary: null
      });

      expect(position.minSalary).toBeNull();
      expect(position.maxSalary).toBeNull();
    });

    it('should accept zero salary', async () => {
      const position = await Position.create({
        title: 'Volunteer',
        code: 'VOL',
        departmentId: testDepartment.id,
        minSalary: 0,
        maxSalary: 0
      });

      expect(position.minSalary).toBe(0);
      expect(position.maxSalary).toBe(0);
    });

    it('should accept decimal salary values', async () => {
      const position = await Position.create({
        title: 'Consultant',
        code: 'CNS',
        departmentId: testDepartment.id,
        minSalary: 75000.50,
        maxSalary: 95000.75
      });

      expect(position.minSalary).toBe(75000.50);
      expect(position.maxSalary).toBe(95000.75);
    });

    it('should allow maxSalary greater than minSalary', async () => {
      const position = await Position.create({
        title: 'Lead Developer',
        code: 'LD',
        departmentId: testDepartment.id,
        minSalary: 100000,
        maxSalary: 150000
      });

      expect(position.maxSalary).toBeGreaterThan(position.minSalary);
    });

    it('should allow equal min and max salary', async () => {
      const position = await Position.create({
        title: 'Fixed Rate',
        code: 'FXR',
        departmentId: testDepartment.id,
        minSalary: 60000,
        maxSalary: 60000
      });

      expect(position.minSalary).toBe(position.maxSalary);
    });
  });

  describe('Position Status', () => {
    it('should default to active status', async () => {
      const position = await Position.create({
        title: 'Designer',
        code: 'DES',
        departmentId: testDepartment.id
      });

      expect(position.isActive).toBe(true);
    });

    it('should allow creating inactive position', async () => {
      const position = await Position.create({
        title: 'Deprecated Role',
        code: 'DEP',
        departmentId: testDepartment.id,
        isActive: false
      });

      expect(position.isActive).toBe(false);
    });

    it('should update position status', async () => {
      const position = await Position.create({
        title: 'Specialist',
        code: 'SPC',
        departmentId: testDepartment.id,
        isActive: true
      });

      position.isActive = false;
      await position.save();

      const updated = await Position.findByPk(position.id);
      expect(updated.isActive).toBe(false);
    });
  });

  describe('Position Description', () => {
    it('should accept valid description', async () => {
      const position = await Position.create({
        title: 'Product Manager',
        code: 'PM',
        departmentId: testDepartment.id,
        description: 'Responsible for product strategy and roadmap'
      });

      expect(position.description).toContain('product strategy');
    });

    it('should handle null description', async () => {
      const position = await Position.create({
        title: 'Associate',
        code: 'ASC',
        departmentId: testDepartment.id,
        description: null
      });

      expect(position.description).toBeNull();
    });

    it('should handle long description', async () => {
      const longDesc = 'A'.repeat(2000);
      const position = await Position.create({
        title: 'Director',
        code: 'DIR',
        departmentId: testDepartment.id,
        description: longDesc
      });

      expect(position.description.length).toBe(2000);
    });
  });

  describe('Position Responsibilities', () => {
    it('should accept responsibilities array', async () => {
      const position = await Position.create({
        title: 'Team Lead',
        code: 'TL',
        departmentId: testDepartment.id,
        responsibilities: JSON.stringify([
          'Manage team of 5 developers',
          'Code review',
          'Sprint planning'
        ])
      });

      const responsibilities = JSON.parse(position.responsibilities);
      expect(Array.isArray(responsibilities)).toBe(true);
      expect(responsibilities.length).toBe(3);
    });

    it('should handle null responsibilities', async () => {
      const position = await Position.create({
        title: 'Junior Developer',
        code: 'JD',
        departmentId: testDepartment.id,
        responsibilities: null
      });

      expect(position.responsibilities).toBeNull();
    });
  });

  describe('Position Requirements', () => {
    it('should accept requirements array', async () => {
      const position = await Position.create({
        title: 'Full Stack Developer',
        code: 'FSD',
        departmentId: testDepartment.id,
        requirements: JSON.stringify([
          '5+ years experience',
          'Node.js proficiency',
          'React expertise'
        ])
      });

      const requirements = JSON.parse(position.requirements);
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBe(3);
    });

    it('should handle null requirements', async () => {
      const position = await Position.create({
        title: 'Entry Level',
        code: 'EL',
        departmentId: testDepartment.id,
        requirements: null
      });

      expect(position.requirements).toBeNull();
    });
  });

  describe('Position Updates', () => {
    it('should update position title', async () => {
      const position = await Position.create({
        title: 'Old Title',
        code: 'OLD',
        departmentId: testDepartment.id
      });

      position.title = 'New Title';
      await position.save();

      const updated = await Position.findByPk(position.id);
      expect(updated.title).toBe('New Title');
    });

    it('should update salary range', async () => {
      const position = await Position.create({
        title: 'Engineer',
        code: 'ENG',
        departmentId: testDepartment.id,
        minSalary: 60000,
        maxSalary: 80000
      });

      position.minSalary = 70000;
      position.maxSalary = 90000;
      await position.save();

      const updated = await Position.findByPk(position.id);
      expect(updated.minSalary).toBe(70000);
      expect(updated.maxSalary).toBe(90000);
    });

    it('should update department association', async () => {
      const newDept = await Department.create({
        name: 'HR',
        code: 'HR'
      });

      const position = await Position.create({
        title: 'Recruiter',
        code: 'REC',
        departmentId: testDepartment.id
      });

      position.departmentId = newDept.id;
      await position.save();

      const updated = await Position.findByPk(position.id);
      expect(updated.departmentId).toBe(newDept.id);
    });

    it('should update updatedAt timestamp', async () => {
      const position = await Position.create({
        title: 'Architect',
        code: 'ARC',
        departmentId: testDepartment.id
      });

      const originalUpdatedAt = position.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      position.description = 'Updated';
      await position.save();

      expect(position.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Position Deletion', () => {
    it('should soft delete position', async () => {
      const position = await Position.create({
        title: 'Temporary',
        code: 'TMP',
        departmentId: testDepartment.id
      });

      await position.destroy();

      const found = await Position.findByPk(position.id);
      expect(found).toBeNull();
    });

    it('should find deleted positions with paranoid:false', async () => {
      const position = await Position.create({
        title: 'Archived',
        code: 'ARC',
        departmentId: testDepartment.id
      });

      await position.destroy();

      const found = await Position.findByPk(position.id, { paranoid: false });
      expect(found).toBeDefined();
      expect(found.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Position Query Operations', () => {
    beforeEach(async () => {
      await Position.bulkCreate([
        { title: 'Software Engineer', code: 'SE', departmentId: testDepartment.id, minSalary: 70000, maxSalary: 100000, isActive: true },
        { title: 'Senior Engineer', code: 'SNE', departmentId: testDepartment.id, minSalary: 90000, maxSalary: 130000, isActive: true },
        { title: 'Tech Lead', code: 'TLD', departmentId: testDepartment.id, minSalary: 110000, maxSalary: 150000, isActive: true },
        { title: 'Architect', code: 'ARC', departmentId: testDepartment.id, minSalary: 130000, maxSalary: 180000, isActive: false },
        { title: 'Junior Dev', code: 'JNR', departmentId: testDepartment.id, minSalary: 50000, maxSalary: 70000, isActive: true }
      ]);
    });

    it('should find all positions', async () => {
      const positions = await Position.findAll();
      expect(positions.length).toBe(5);
    });

    it('should find active positions only', async () => {
      const active = await Position.findAll({
        where: { isActive: true }
      });
      expect(active.length).toBe(4);
    });

    it('should find position by code', async () => {
      const position = await Position.findOne({
        where: { code: 'SE' }
      });
      expect(position).toBeDefined();
      expect(position.title).toBe('Software Engineer');
    });

    it('should find positions by department', async () => {
      const positions = await Position.findAll({
        where: { departmentId: testDepartment.id }
      });
      expect(positions.length).toBe(5);
    });

    it('should count positions', async () => {
      const count = await Position.count();
      expect(count).toBe(5);
    });

    it('should find positions by salary range', async () => {
      const positions = await Position.findAll({
        where: {
          minSalary: { [require('sequelize').Op.gte]: 100000 }
        }
      });
      expect(positions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Position Edge Cases', () => {
    it('should handle special characters in title', async () => {
      const position = await Position.create({
        title: 'C++ Developer',
        code: 'CPP',
        departmentId: testDepartment.id
      });

      expect(position.title).toBe('C++ Developer');
    });

    it('should handle numeric values in code', async () => {
      const position = await Position.create({
        title: 'Level 3 Engineer',
        code: 'L3ENG',
        departmentId: testDepartment.id
      });

      expect(position.code).toBe('L3ENG');
    });

    it('should handle very large salary values', async () => {
      const position = await Position.create({
        title: 'CEO',
        code: 'CEO',
        departmentId: testDepartment.id,
        minSalary: 500000,
        maxSalary: 1000000
      });

      expect(position.minSalary).toBe(500000);
      expect(position.maxSalary).toBe(1000000);
    });
  });
});
