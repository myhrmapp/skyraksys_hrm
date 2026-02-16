// E2E Test: Employee Review Workflow
// Framework: Playwright/Cypress compatible syntax
// Test review cycle from creation to approval with self-assessment

describe('Employee Review E2E Workflow', () => {
  let testAdmin, testManager, testEmployee;
  let adminToken, managerToken, employeeToken;
  
  beforeAll(async () => {
    // Setup test users
    testAdmin = await createTestUser('admin');
    testManager = await createTestUser('manager');
    testEmployee = await createTestUser('employee');
    
    adminToken = await loginUser(testAdmin);
    managerToken = await loginUser(testManager);
    employeeToken = await loginUser(testEmployee);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Admin Create Review', () => {
    it('should allow admin to create employee review', async () => {
      await loginAs(testAdmin);
      await page.goto('/employee-reviews');
      
      // Click create review button
      await page.click('[data-testid="create-review-btn"]');
      await page.waitForSelector('[data-testid="review-form"]');
      
      // Select employee
      await page.click('[data-testid="employee-select"]');
      await page.fill('[data-testid="employee-search"]', testEmployee.name);
      await page.click(`[data-employee-id="${testEmployee.id}"]`);
      
      // Select review type and period
      await page.selectOption('[data-testid="review-type"]', { value: 'Annual' });
      await page.selectOption('[data-testid="review-period"]', { value: '2024' });
      
      // Set review date
      await page.fill('[data-testid="review-date"]', '2024-12-31');
      
      // Assign reviewer
      await page.click('[data-testid="reviewer-select"]');
      await page.click(`[data-reviewer-id="${testManager.id}"]`);
      
      // Add objectives
      await page.fill('[data-testid="objectives"]', 'Complete all assigned projects\nImprove technical skills\nMentor junior team members');
      
      // Save review
      await page.click('[data-testid="save-review-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('created');
      
      // Verify review in list
      await page.goto('/employee-reviews');
      const latestReview = await page.locator('[data-testid="review-item"]').first();
      expect(await latestReview.textContent()).toContain(testEmployee.name);
    });
  });

  describe('Employee Self-Assessment', () => {
    it('should allow employee to complete self-assessment', async () => {
      await loginAs(testEmployee);
      await page.goto('/my-reviews');
      
      // Wait for reviews list
      await page.waitForSelector('[data-testid="review-list"]');
      
      // Click pending review
      await page.click('[data-status="Pending Self-Assessment"]:first-child');
      await page.waitForSelector('[data-testid="self-assessment-form"]');
      
      // Fill rating categories
      const categories = [
        { name: 'performance', rating: 4 },
        { name: 'technical', rating: 4 },
        { name: 'communication', rating: 5 },
        { name: 'teamwork', rating: 5 },
        { name: 'leadership', rating: 3 }
      ];
      
      for (const category of categories) {
        await page.click(`[data-testid="${category.name}-rating-${category.rating}"]`);
      }
      
      // Add self comments
      await page.fill('[data-testid="self-comments"]', 
        'I have successfully completed all assigned projects this year. ' +
        'I improved my technical skills by learning new frameworks. ' +
        'I actively participated in team collaboration and mentored two junior developers.'
      );
      
      // List achievements
      await page.fill('[data-testid="achievements"]', 
        '- Led the migration to React 18\n' +
        '- Reduced page load time by 40%\n' +
        '- Mentored 2 junior developers'
      );
      
      // List areas for development
      await page.fill('[data-testid="development-areas"]', 
        '- Cloud architecture (AWS/Azure)\n' +
        '- Advanced database optimization\n' +
        '- Public speaking skills'
      );
      
      // Submit self-assessment
      await page.click('[data-testid="submit-assessment-btn"]');
      await page.waitForSelector('[data-testid="confirm-dialog"]');
      await page.click('[data-testid="confirm-submit"]');
      
      // Verify submission
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('submitted');
      
      // Verify status updated
      const status = await page.textContent('[data-testid="review-status"]');
      expect(status).toContain('Pending Manager Review');
    });
  });

  describe('Manager Edit Ratings', () => {
    it('should allow manager to review and edit ratings', async () => {
      await loginAs(testManager);
      await page.goto('/team-reviews');
      
      // Wait for team reviews list
      await page.waitForSelector('[data-testid="team-reviews-list"]');
      
      // Click pending review
      await page.click('[data-status="Pending Manager Review"]:first-child');
      await page.waitForSelector('[data-testid="manager-review-form"]');
      
      // View employee's self-assessment
      const selfAssessment = await page.locator('[data-testid="self-assessment-section"]');
      expect(selfAssessment).toBeTruthy();
      
      // Edit manager ratings
      const managerRatings = [
        { name: 'performance', rating: 5 },
        { name: 'technical', rating: 4 },
        { name: 'communication', rating: 5 },
        { name: 'teamwork', rating: 5 },
        { name: 'leadership', rating: 4 }
      ];
      
      for (const rating of managerRatings) {
        await page.click(`[data-testid="manager-${rating.name}-rating-${rating.rating}"]`);
      }
      
      // Set overall rating
      await page.click('[data-testid="overall-rating-5"]');
      
      // Add manager comments
      await page.fill('[data-testid="manager-comments"]', 
        'Excellent performance throughout the year. ' +
        'Demonstrated strong technical skills and leadership qualities. ' +
        'Successfully led critical projects and mentored team members.'
      );
      
      // Add recommendations
      await page.fill('[data-testid="recommendations"]', 
        'Recommend for promotion to Senior Developer. ' +
        'Suggest attending advanced cloud architecture training.'
      );
      
      // Save review
      await page.click('[data-testid="save-manager-review-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('saved');
    });
  });

  describe('Admin Approve Review', () => {
    it('should allow admin to approve final review', async () => {
      await loginAs(testAdmin);
      await page.goto('/employee-reviews');
      
      // Filter pending approval
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-status="Pending Approval"]');
      
      // Click review to approve
      await page.click('[data-testid="review-item"]:first-child');
      await page.waitForSelector('[data-testid="review-detail"]');
      
      // Review all sections
      expect(await page.locator('[data-testid="self-assessment-section"]')).toBeTruthy();
      expect(await page.locator('[data-testid="manager-review-section"]')).toBeTruthy();
      
      // Verify ratings
      const overallRating = await page.textContent('[data-testid="overall-rating"]');
      expect(overallRating).toBeTruthy();
      
      // Approve review
      await page.click('[data-testid="approve-review-btn"]');
      await page.waitForSelector('[data-testid="approval-dialog"]');
      await page.fill('[data-testid="approval-notes"]', 'Review approved. Excellent performance.');
      await page.click('[data-testid="confirm-approval-btn"]');
      
      // Verify approval
      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('approved');
      
      // Verify status
      const status = await page.textContent('[data-testid="status-badge"]');
      expect(status).toContain('Approved');
    });
  });

  describe('Dashboard Stats Update', () => {
    it('should reflect completed review in dashboard statistics', async () => {
      await loginAs(testAdmin);
      await page.goto('/dashboard');
      
      // Wait for dashboard stats
      await page.waitForSelector('[data-testid="dashboard-stats"]');
      
      // Check review statistics
      const completedReviews = await page.textContent('[data-testid="completed-reviews-count"]');
      expect(Number(completedReviews)).toBeGreaterThan(0);
      
      // Navigate to reviews widget
      await page.click('[data-testid="reviews-widget"]');
      await page.waitForURL('**/employee-reviews');
      
      // Verify recently completed review appears
      const recentReviews = await page.locator('[data-testid="recent-review"]').count();
      expect(recentReviews).toBeGreaterThan(0);
      
      // Check employee dashboard
      await loginAs(testEmployee);
      await page.goto('/dashboard');
      
      // Verify review badge or notification
      const reviewNotification = await page.locator('[data-testid="review-completed-badge"]');
      expect(reviewNotification).toBeTruthy();
    });
  });
});

// Helper functions
async function createTestUser(role) {
  return { id: Math.floor(Math.random() * 1000), name: `Test ${role}`, email: `${role}@test.com`, role };
}

async function loginUser(user) {
  return 'test-token-' + user.id;
}

async function loginAs(user) {
  await page.goto('/login');
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', 'testPassword123');
  await page.click('[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function cleanupTestUsers() {
  // Cleanup implementation
}
