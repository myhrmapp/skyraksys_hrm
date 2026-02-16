/**
 * EmployeeReviewService (BE-34)
 *
 * Dedicated service layer for employee performance reviews.
 * Extracts all inline DB operations previously in employee-review.routes.js.
 */

const { Op } = require('sequelize');
const db = require('../models');
const auditService = require('./audit.service');
const logger = require('../utils/logger');

// Shared include definitions to avoid repetition
const REVIEW_LIST_INCLUDES = [
  {
    model: db.Employee,
    as: 'employee',
    attributes: ['id', 'firstName', 'lastName', 'employeeId'],
    include: [
      { model: db.Position, as: 'position', attributes: ['title'] },
      { model: db.Department, as: 'department', attributes: ['name'] }
    ]
  },
  {
    model: db.User,
    as: 'reviewer',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role']
  },
  {
    model: db.User,
    as: 'hrApprover',
    attributes: ['id', 'firstName', 'lastName', 'email']
  }
];

const REVIEW_BASIC_INCLUDES = [
  {
    model: db.Employee,
    as: 'employee',
    attributes: ['id', 'firstName', 'lastName', 'employeeId']
  },
  {
    model: db.User,
    as: 'reviewer',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role']
  }
];

class EmployeeReviewService {
  /**
   * Resolve the Employee record for the current user (used for role-based access control).
   * Returns null if no employee profile exists.
   */
  async _getEmployeeForUser(userId) {
    return db.Employee.findOne({ where: { userId } });
  }

  /**
   * List reviews with pagination and role-based filtering.
   */
  async listReviews({ employeeId, reviewerId, status, reviewType, reviewPeriod, page = 1, limit = 10 }, userRole, userId) {
    const where = {};

    if (employeeId) where.employeeId = employeeId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (status) where.status = status;
    if (reviewType) where.reviewType = reviewType;
    if (reviewPeriod) where.reviewPeriod = { [Op.like]: `%${reviewPeriod}%` };

    // Role-based restrictions
    if (userRole === 'employee') {
      const employee = await this._getEmployeeForUser(userId);
      if (!employee) {
        const err = new Error('Employee profile not found');
        err.statusCode = 404;
        throw err;
      }
      where.employeeId = employee.id;
    } else if (userRole === 'manager') {
      where.reviewerId = userId;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db.EmployeeReview.findAndCountAll({
      where,
      include: REVIEW_LIST_INCLUDES,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      reviews: result.rows,
      totalCount: result.count,
      totalPages: Math.ceil(result.count / parseInt(limit)),
      currentPage: parseInt(page)
    };
  }

  /**
   * Get a single review by ID with role-based access control.
   */
  async getReviewById(id, userRole, userId) {
    const review = await db.EmployeeReview.findByPk(id, {
      include: REVIEW_LIST_INCLUDES
    });

    if (!review) {
      const err = new Error('Review not found');
      err.statusCode = 404;
      throw err;
    }

    if (userRole === 'employee') {
      const employee = await this._getEmployeeForUser(userId);
      if (!employee || review.employeeId !== employee.id) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }
    } else if (userRole === 'manager') {
      if (review.reviewerId !== userId) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }
    }

    return review;
  }

  /**
   * Create a new employee review.
   */
  async createReview(data, reviewerId, req) {
    const {
      employeeId, reviewPeriod, reviewType, overallRating, technicalSkills,
      communication, teamwork, leadership, punctuality, achievements,
      areasForImprovement, goals, reviewerComments, reviewDate, nextReviewDate
    } = data;

    // Verify employee exists
    const employee = await db.Employee.findByPk(employeeId);
    if (!employee) {
      const err = new Error('Employee not found');
      err.statusCode = 404;
      throw err;
    }

    // Check for duplicate review in same period
    const existing = await db.EmployeeReview.findOne({
      where: {
        employeeId,
        reviewPeriod,
        reviewType: reviewType || 'quarterly'
      }
    });
    if (existing) {
      const err = new Error('A review for this employee and period already exists');
      err.statusCode = 400;
      throw err;
    }

    const review = await db.EmployeeReview.create({
      employeeId,
      reviewerId,
      reviewPeriod,
      reviewType: reviewType || 'quarterly',
      overallRating,
      technicalSkills,
      communication,
      teamwork,
      leadership,
      punctuality,
      achievements,
      areasForImprovement,
      goals,
      reviewerComments,
      reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
      status: 'draft'
    });

    const created = await db.EmployeeReview.findByPk(review.id, {
      include: REVIEW_BASIC_INCLUDES
    });

    await auditService.log({
      action: 'CREATED',
      entityType: 'EmployeeReview',
      entityId: created.id,
      userId: reviewerId,
      newValues: { employeeId, reviewPeriod, reviewType, overallRating, status: 'draft' },
      reason: 'Employee review created',
      req
    });

    return created;
  }

  /**
   * Update an employee review with role-based field restrictions.
   */
  async updateReview(id, body, userRole, userId, req) {
    const review = await db.EmployeeReview.findByPk(id);
    if (!review) {
      const err = new Error('Review not found');
      err.statusCode = 404;
      throw err;
    }

    const oldValues = {
      status: review.status,
      overallRating: review.overallRating,
      employeeSelfAssessment: review.employeeSelfAssessment,
      reviewerComments: review.reviewerComments
    };

    if (userRole === 'employee') {
      const employee = await this._getEmployeeForUser(userId);
      if (!employee || review.employeeId !== employee.id) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }
      const { employeeSelfAssessment } = body;
      await review.update({
        employeeSelfAssessment,
        status: 'pending_approval'
      });
    } else if (userRole === 'manager') {
      if (review.reviewerId !== userId) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }
      await review.update(body); // body already validated + stripped by Joi in route
    } else if (['admin', 'hr'].includes(userRole)) {
      await review.update(body); // body already validated + stripped by Joi in route
    } else {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    const updated = await db.EmployeeReview.findByPk(id, {
      include: [...REVIEW_BASIC_INCLUDES, {
        model: db.User,
        as: 'hrApprover',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    await auditService.log({
      action: 'UPDATED',
      entityType: 'EmployeeReview',
      entityId: id,
      userId,
      oldValues,
      newValues: {
        status: updated.status,
        overallRating: updated.overallRating,
        employeeSelfAssessment: updated.employeeSelfAssessment,
        reviewerComments: updated.reviewerComments
      },
      reason: body.reason || 'Employee review updated',
      req
    });

    return updated;
  }

  /**
   * Update review status (submit, approve, etc.)
   */
  async updateReviewStatus(id, data, userRole, userId, req) {
    const { status, hrApproved } = data;

    const review = await db.EmployeeReview.findByPk(id);
    if (!review) {
      const err = new Error('Review not found');
      err.statusCode = 404;
      throw err;
    }

    const oldValues = {
      status: review.status,
      hrApproved: review.hrApproved,
      hrApprovedBy: review.hrApprovedBy,
      hrApprovedAt: review.hrApprovedAt
    };

    const updateData = { status };

    if (hrApproved !== undefined && ['admin', 'hr'].includes(userRole)) {
      updateData.hrApproved = hrApproved;
      if (hrApproved) {
        updateData.hrApprovedBy = userId;
        updateData.hrApprovedAt = new Date();
        updateData.status = 'completed';
      }
    }

    await review.update(updateData);

    const updated = await db.EmployeeReview.findByPk(id, {
      include: REVIEW_BASIC_INCLUDES
    });

    const auditAction = hrApproved ? 'APPROVED' : (status === 'submitted' ? 'SUBMITTED' : 'STATUS_CHANGED');
    await auditService.log({
      action: auditAction,
      entityType: 'EmployeeReview',
      entityId: id,
      userId,
      oldValues,
      newValues: {
        status: updated.status,
        hrApproved: updated.hrApproved,
        hrApprovedBy: updated.hrApprovedBy,
        hrApprovedAt: updated.hrApprovedAt
      },
      reason: data.reason || `Review status changed to ${status}`,
      req
    });

    return updated;
  }

  /**
   * Delete an employee review.
   */
  async deleteReview(id, userId, req) {
    const review = await db.EmployeeReview.findByPk(id, {
      include: [{
        model: db.Employee,
        as: 'employee',
        attributes: ['id', 'firstName', 'lastName', 'employeeId']
      }]
    });

    if (!review) {
      const err = new Error('Review not found');
      err.statusCode = 404;
      throw err;
    }

    const oldValues = {
      employeeId: review.employeeId,
      reviewPeriod: review.reviewPeriod,
      reviewType: review.reviewType,
      overallRating: review.overallRating,
      status: review.status
    };

    await review.destroy();

    await auditService.log({
      action: 'DELETED',
      entityType: 'EmployeeReview',
      entityId: id,
      userId,
      oldValues,
      reason: 'Employee review deleted by admin',
      req
    });
  }

  /**
   * Get review statistics/dashboard with role-based filtering.
   */
  async getDashboard(userRole, userId) {
    const where = {};

    if (userRole === 'manager') {
      where.reviewerId = userId;
    } else if (userRole === 'employee') {
      const employee = await this._getEmployeeForUser(userId);
      if (employee) {
        where.employeeId = employee.id;
      }
    }

    const [totalReviews, reviewsByStatus, reviewsByType, averageRatings] = await Promise.all([
      db.EmployeeReview.count({ where }),
      db.EmployeeReview.findAll({
        where,
        attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['status']
      }),
      db.EmployeeReview.findAll({
        where,
        attributes: ['reviewType', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['reviewType']
      }),
      db.EmployeeReview.findOne({
        where: { ...where, overallRating: { [Op.not]: null } },
        attributes: [
          [db.sequelize.fn('AVG', db.sequelize.col('overallRating')), 'avgOverallRating'],
          [db.sequelize.fn('AVG', db.sequelize.col('technicalSkills')), 'avgTechnicalSkills'],
          [db.sequelize.fn('AVG', db.sequelize.col('communication')), 'avgCommunication'],
          [db.sequelize.fn('AVG', db.sequelize.col('teamwork')), 'avgTeamwork']
        ]
      })
    ]);

    return { totalReviews, reviewsByStatus, reviewsByType, averageRatings };
  }
}

module.exports = new EmployeeReviewService();
