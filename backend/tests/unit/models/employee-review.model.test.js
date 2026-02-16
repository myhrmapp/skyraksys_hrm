const db = require('../../../models');

describe('EmployeeReview Model', () => {
  let testEmployee, testUser, testDepartment, testPosition, testReviewer;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testDepartment = await db.Department.create({
      name: `Test Department ${uniqueId}`,
      code: `TD${uniqueId}`
    });

    testPosition = await db.Position.create({
      title: `Test Position ${uniqueId}`,
      code: `TP${uniqueId}`,
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'employee'
    });

    testEmployee = await db.Employee.create({
      userId: testUser.id,
      employeeId: `EMP${uniqueId}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${uniqueId}@company.com`,
      hireDate: '2024-01-01',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      status: 'Active'
    });

    testReviewer = await db.User.create({
      firstName: 'Manager',
      lastName: 'User',
      email: `manager${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'manager'
    });
  });

  afterEach(async () => {
    await db.EmployeeReview.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create employee review with required fields', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q1 2026'
      });

      expect(review.id).toBeDefined();
      expect(review.employeeId).toBe(testEmployee.id);
      expect(review.reviewerId).toBe(testReviewer.id);
      expect(review.reviewPeriod).toBe('Q1 2026');
    });

    it('should fail without employeeId', async () => {
      await expect(db.EmployeeReview.create({
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q1 2026'
      })).rejects.toThrow();
    });

    it('should fail without reviewerId', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewPeriod: 'Q1 2026'
      })).rejects.toThrow();
    });

    it('should fail without reviewPeriod', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique employeeId + reviewPeriod combination', async () => {
      await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q2 2026'
      });

      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q2 2026'
      })).rejects.toThrow();
    });
  });

  describe('Review Type Enum Validation', () => {
    it('should accept valid reviewType: quarterly', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q3 2026',
        reviewType: 'quarterly'
      });

      expect(review.reviewType).toBe('quarterly');
    });

    it('should accept valid reviewType: annual', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Annual 2026',
        reviewType: 'annual'
      });

      expect(review.reviewType).toBe('annual');
    });

    it('should reject invalid reviewType', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Q4 2026',
        reviewType: 'invalid_type'
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status: draft', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'H1 2026',
        status: 'draft'
      });

      expect(review.status).toBe('draft');
    });

    it('should accept valid status: completed', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'H2 2026',
        status: 'completed'
      });

      expect(review.status).toBe('completed');
    });

    it('should reject invalid status', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Mid-Year 2026',
        status: 'invalid_status'
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default reviewType as quarterly', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'FY 2026'
      });

      expect(review.reviewType).toBe('quarterly');
    });

    it('should apply default status as draft', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Season 2026'
      });

      expect(review.status).toBe('draft');
    });

    it('should apply default hrApproved as false', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Period 2026'
      });

      expect(review.hrApproved).toBe(false);
    });
  });

  describe('Rating Validation', () => {
    it('should accept valid overallRating (1.0-5.0)', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Rating Test 1',
        overallRating: 4.50
      });

      expect(parseFloat(review.overallRating)).toBe(4.50);
    });

    it('should reject overallRating below 1.0', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Rating Test 2',
        overallRating: 0.5
      })).rejects.toThrow();
    });

    it('should reject overallRating above 5.0', async () => {
      await expect(db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Rating Test 3',
        overallRating: 5.5
      })).rejects.toThrow();
    });

    it('should validate technicalSkills rating range', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Tech Skills 2026',
        technicalSkills: 3.75
      });

      expect(parseFloat(review.technicalSkills)).toBe(3.75);
    });

    it('should validate communication rating range', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Comm Skills 2026',
        communication: 4.25
      });

      expect(parseFloat(review.communication)).toBe(4.25);
    });
  });

  describe('Optional Fields', () => {
    it('should store achievements', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Achievement 2026',
        achievements: 'Completed 3 major projects successfully.'
      });

      expect(review.achievements).toBe('Completed 3 major projects successfully.');
    });

    it('should store areasForImprovement', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Improvement 2026',
        areasForImprovement: 'Needs to work on time management.'
      });

      expect(review.areasForImprovement).toBe('Needs to work on time management.');
    });

    it('should store reviewerComments', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Comments 2026',
        reviewerComments: 'Excellent team player with strong technical skills.'
      });

      expect(review.reviewerComments).toBe('Excellent team player with strong technical skills.');
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete employee review', async () => {
      const review = await db.EmployeeReview.create({
        employeeId: testEmployee.id,
        reviewerId: testReviewer.id,
        reviewPeriod: 'Delete Test 2026'
      });

      await review.destroy();

      const foundReview = await db.EmployeeReview.findByPk(review.id);
      expect(foundReview).toBeNull();

      const deletedReview = await db.EmployeeReview.findByPk(review.id, { paranoid: false });
      expect(deletedReview).not.toBeNull();
      expect(deletedReview.deletedAt).not.toBeNull();
    });
  });
});
