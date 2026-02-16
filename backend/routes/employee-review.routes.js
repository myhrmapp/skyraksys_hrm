const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const employeeReviewService = require('../services/EmployeeReviewService');
const { employeeReviewSchema } = require('../middleware/validators/employeeReview.validator');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

// ── Dashboard must be registered BEFORE /:id to avoid matching "meta" as an id ──

// Get review statistics/dashboard
router.get('/meta/dashboard', authenticateToken, async (req, res, next) => {
  try {
    const data = await employeeReviewService.getDashboard(req.user.role, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching review dashboard:', { detail: error });
    next(error);
  }
});

// Get all employee reviews (with filters)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const data = await employeeReviewService.listReviews(req.query, req.user.role, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching employee reviews:', { detail: error });
    next(error);
  }
});

// Get reviews for a specific employee
router.get('/employee/:employeeId', authenticateToken, async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const db = require('../models');
    
    const reviews = await db.EmployeeReview.findAll({
      where: { employeeId },
      order: [['reviewDate', 'DESC'], ['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('Error fetching employee reviews:', { detail: error });
    next(error);
  }
});

// Get a specific employee review
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const data = await employeeReviewService.getReviewById(req.params.id, req.user.role, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching employee review:', { detail: error });
    next(error);
  }
});

// Create a new employee review
router.post('/', authenticateToken, authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { error, value } = employeeReviewSchema.create.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }
    const data = await employeeReviewService.createReview(value, req.user.id, req);
    res.status(201).json({ success: true, message: 'Employee review created successfully', data });
  } catch (error) {
    logger.error('Error creating employee review:', { detail: error });
    next(error);
  }
});

// Update an employee review
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    // Validate for manager/admin/hr roles (employee only submits self-assessment)
    if (['manager', 'admin', 'hr'].includes(req.user.role)) {
      const { error, value } = employeeReviewSchema.update.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
      }
      const data = await employeeReviewService.updateReview(req.params.id, value, req.user.role, req.user.id, req);
      return res.json({ success: true, message: 'Employee review updated successfully', data });
    }
    // Employee role — service handles field restriction
    const data = await employeeReviewService.updateReview(req.params.id, req.body, req.user.role, req.user.id, req);
    res.json({ success: true, message: 'Employee review updated successfully', data });
  } catch (error) {
    logger.error('Error updating employee review:', { detail: error });
    next(error);
  }
});

// Update review status (submit, approve, etc.)
router.put('/:id/status', authenticateToken, authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { error, value } = employeeReviewSchema.updateStatus.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }
    const data = await employeeReviewService.updateReviewStatus(req.params.id, value, req.user.role, req.user.id, req);
    res.json({ success: true, message: 'Review status updated successfully', data });
  } catch (error) {
    logger.error('Error updating review status:', { detail: error });
    next(error);
  }
});

// Submit review (convenience endpoint)
router.patch('/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const data = await employeeReviewService.updateReviewStatus(
      req.params.id, 
      { status: 'pending_approval' }, 
      req.user.role, 
      req.user.id, 
      req
    );
    res.json({ success: true, message: 'Review submitted successfully', data });
  } catch (error) {
    logger.error('Error submitting review:', { detail: error });
    next(error);
  }
});

// Approve review (convenience endpoint)
router.patch('/:id/approve', authenticateToken, authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const data = await employeeReviewService.updateReviewStatus(
      req.params.id, 
      { status: 'completed', ...req.body }, 
      req.user.role, 
      req.user.id, 
      req
    );
    res.json({ success: true, message: 'Review approved successfully', data });
  } catch (error) {
    logger.error('Error approving review:', { detail: error });
    next(error);
  }
});

// Employee self-assessment
router.patch('/:id/self-assessment', authenticateToken, async (req, res, next) => {
  try {
    const db = require('../models');
    const review = await db.EmployeeReview.findByPk(req.params.id);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    
    // Only the employee being reviewed can add self-assessment
    const employee = await db.Employee.findOne({ where: { userId: req.user.id } });
    if (!employee || review.employeeId !== employee.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const { selfRating, selfComments } = req.body;
    await review.update({
      employeeSelfAssessment: selfComments || req.body.employeeSelfAssessment,
      overallRating: selfRating || review.overallRating
    });
    
    const updated = await db.EmployeeReview.findByPk(req.params.id);
    res.json({ success: true, message: 'Self-assessment added successfully', data: updated });
  } catch (error) {
    logger.error('Error adding self-assessment:', { detail: error });
    next(error);
  }
});

// Delete an employee review
router.delete('/:id', authenticateToken, authorize('admin', 'hr'), async (req, res, next) => {
  try {
    await employeeReviewService.deleteReview(req.params.id, req.user.id, req);
    res.json({ success: true, message: 'Employee review deleted successfully' });
  } catch (error) {
    logger.error('Error deleting employee review:', { detail: error });
    next(error);
  }
});

module.exports = router;
