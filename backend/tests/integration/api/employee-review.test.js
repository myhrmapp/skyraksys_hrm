const request = require('supertest');
const app = require('../../../server');
const TestHelper = require('../../helpers/testHelper');

describe('Employee Review API Integration Tests', () => {
  let helper, adminUser, hrUser, managerUser, employeeUser;
  let adminToken, hrToken, managerToken, employeeToken;

  beforeAll(async () => {
    helper = new TestHelper(app);
    
    // Create test users
    ({ user: adminUser, token: adminToken } = await helper.createAdminUser());
    ({ user: hrUser, token: hrToken } = await helper.createHRUser());
    ({ user: managerUser, token: managerToken } = await helper.createManagerUser());
    ({ user: employeeUser, token: employeeToken } = await helper.createEmployeeUser());
  });

  afterAll(async () => {
    await helper.cleanup();
  });

  // Test 1: Get all reviews
  describe('GET /api/employee-reviews', () => {
    it('should get all reviews for admin', async () => {
      const response = await request(app)
        .get('/api/employee-reviews')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
    });

    it('should get own reviews for employee', async () => {
      const response = await request(app)
        .get('/api/employee-reviews')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get team reviews for manager', async () => {
      const response = await request(app)
        .get('/api/employee-reviews')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 2: Create review
  describe('POST /api/employee-reviews', () => {
    it('should create review as admin', async () => {
      const reviewData = {
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        reviewType: 'annual',
        reviewPeriod: '2026-Q1',
        reviewDate: new Date().toISOString().split('T')[0],
        overallRating: 4,
        technicalSkills: 5,
        communication: 4,
        teamwork: 4,
        leadership: 3,
        reviewerComments: 'Good performance overall',
        goals: 'Improve leadership skills',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/employee-reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.employeeId).toBe(reviewData.employeeId);
    });

    it('should allow manager to create review for team member', async () => {
      const reviewData = {
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        reviewType: 'quarterly',
        reviewPeriod: '2026-Q2',
        overallRating: 4
      };

      const response = await request(app)
        .post('/api/employee-reviews')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to create review', async () => {
      const reviewData = {
        employeeId: adminUser.employee.id,
        reviewType: 'Annual'
      };

      const response = await request(app)
        .post('/api/employee-reviews')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(reviewData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 3: Get review by ID
  describe('GET /api/employee-reviews/:id', () => {
    it('should get review by id', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id
      });

      const response = await request(app)
        .get(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(review.id);
    });

    it('should allow employee to view own review', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id
      });

      const response = await request(app)
        .get(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(review.id);
    });
  });

  // Test 4: Update review
  describe('PUT /api/employee-reviews/:id', () => {
    it('should update review as admin', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        status: 'draft'
      });

      const updateData = {
        overallRating: 5,
        comments: 'Updated comments',
        status: 'pending_approval'
      };

      const response = await request(app)
        .put(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(parseFloat(response.body.data.overallRating)).toBe(updateData.overallRating);
    });

    it('should allow reviewer to update review', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        status: 'draft'
      });

      const response = await request(app)
        .put(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ overallRating: 4 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 5: Submit review
  describe('PATCH /api/employee-reviews/:id/submit', () => {
    it('should submit review', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        status: 'draft'
      });

      const response = await request(app)
        .patch(`/api/employee-reviews/${review.id}/submit`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending_approval');
    });
  });

  // Test 6: Approve review
  describe('PATCH /api/employee-reviews/:id/approve', () => {
    it('should approve review as admin', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        status: 'pending_approval'
      });

      const response = await request(app)
        .patch(`/api/employee-reviews/${review.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approverComments: 'Approved' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });

  // Test 7: Add employee self-assessment
  describe('PATCH /api/employee-reviews/:id/self-assessment', () => {
    it('should allow employee to add self-assessment', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        status: 'draft'
      });

      const response = await request(app)
        .patch(`/api/employee-reviews/${review.id}/self-assessment`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ 
          selfRating: 4,
          selfComments: 'I believe I have performed well'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 8: Delete review
  describe('DELETE /api/employee-reviews/:id', () => {
    it('should delete review as admin', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id
      });

      const response = await request(app)
        .delete(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow employee to delete review', async () => {
      const review = await helper.createEmployeeReview({
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id
      });

      const response = await request(app)
        .delete(`/api/employee-reviews/${review.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 9: Get reviews by employee
  describe('GET /api/employee-reviews/employee/:employeeId', () => {
    it('should get reviews for specific employee', async () => {
      const response = await request(app)
        .get(`/api/employee-reviews/employee/${employeeUser.employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Test 10: Validation tests
  describe('Validation', () => {
    it('should require employeeId', async () => {
      const response = await request(app)
        .post('/api/employee-reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reviewType: 'annual' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate rating range', async () => {
      const reviewData = {
        employeeId: employeeUser.employee.id,
        reviewerId: managerUser.id,
        overallRating: 6 // Invalid: should be 1-5
      };

      const response = await request(app)
        .post('/api/employee-reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reviewData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Test 11: Filter reviews
  describe('GET /api/employee-reviews with filters', () => {
    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/employee-reviews?status=completed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test 12: Authorization tests
  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/employee-reviews');

      expect(response.status).toBe(401);
    });
  });
});
