const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validationResult, body } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
// Validation rules
const goalValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('period').notEmpty().withMessage('Period is required')
];

const krValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('targetValue').isNumeric().withMessage('Target value must be numeric')
];

// All goal routes require authentication
router.use(authenticateToken);

// Employee routes
router.get('/my-goals', goalController.getMyGoals);

// Manager/HR/Admin routes for specific employee
router.get('/employee/:employeeId', authorize('admin', 'hr', 'manager'), goalController.getEmployeeGoals);

// General Goal routes
router.post('/', goalValidation, validate, goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

// Key Result routes
router.post('/:id/key-results', krValidation, validate, goalController.addKeyResult);
router.put('/:id/key-results/:krId', goalController.updateKeyResult);
router.delete('/:id/key-results/:krId', goalController.deleteKeyResult);

module.exports = router;
