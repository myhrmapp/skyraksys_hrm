const { KeyResult } = require('../models');
const { AppError } = require('../utils/errors');
const goalDataService = require('../services/data/GoalDataService');
const keyResultDataService = require('../services/data/KeyResultDataService');

// Get all goals for the logged-in employee
exports.getMyGoals = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return next(new AppError('No employee profile found for this user', 404));
    }

    const result = await goalDataService.findAll({
      where: { employeeId },
      include: [
        { model: KeyResult, as: 'keyResults' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const goals = result.data || result;
    res.status(200).json({ success: true, count: goals.length, data: goals });
  } catch (error) {
    next(error);
  }
};

// Get all goals for a specific employee (Manager/HR/Admin)
exports.getEmployeeGoals = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    
    // In a real app, verify that the requester is the manager of this employee or HR/Admin
    const result = await goalDataService.findAll({
      where: { employeeId },
      include: [
        { model: KeyResult, as: 'keyResults' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const goals = result.data || result;
    res.status(200).json({ success: true, count: goals.length, data: goals });
  } catch (error) {
    next(error);
  }
};

// Create a new goal
exports.createGoal = async (req, res, next) => {
  try {
    // If not provided, assume creating for self
    const employeeId = req.body.employeeId || req.user.employeeId;
    if (!employeeId) {
      return next(new AppError('Employee ID is required', 400));
    }

    const goal = await goalDataService.create({
      employeeId,
      title: req.body.title,
      description: req.body.description,
      period: req.body.period,
      dueDate: req.body.dueDate
    });

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// Update a goal
exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await goalDataService.findById(req.params.id);
    if (!goal) return next(new AppError('Goal not found', 404));

    // Verify ownership or permission here if needed

    await goalDataService.update(req.params.id, {
      title: req.body.title !== undefined ? req.body.title : goal.title,
      description: req.body.description !== undefined ? req.body.description : goal.description,
      period: req.body.period !== undefined ? req.body.period : goal.period,
      status: req.body.status !== undefined ? req.body.status : goal.status,
      dueDate: req.body.dueDate !== undefined ? req.body.dueDate : goal.dueDate
    });

    // fetch updated record
    const updatedGoal = await goalDataService.findById(req.params.id);

    res.status(200).json({ success: true, data: updatedGoal });
  } catch (error) {
    next(error);
  }
};

// Delete a goal
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await goalDataService.findById(req.params.id);
    if (!goal) return next(new AppError('Goal not found', 404));

    await goalDataService.delete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// Add a key result to a goal
exports.addKeyResult = async (req, res, next) => {
  try {
    const goalId = req.params.id;
    const goal = await goalDataService.findById(goalId);
    if (!goal) return next(new AppError('Goal not found', 404));

    const kr = await keyResultDataService.create({
      goalId,
      title: req.body.title,
      targetValue: req.body.targetValue,
      currentValue: req.body.currentValue || 0,
      metric: req.body.metric
    });

    await updateGoalProgress(goalId);

    res.status(201).json({ success: true, data: kr });
  } catch (error) {
    next(error);
  }
};

// Update a key result
exports.updateKeyResult = async (req, res, next) => {
  try {
    const kr = await keyResultDataService.findById(req.params.krId);
    if (!kr) return next(new AppError('Key Result not found', 404));

    await keyResultDataService.update(req.params.krId, {
      title: req.body.title !== undefined ? req.body.title : kr.title,
      targetValue: req.body.targetValue !== undefined ? req.body.targetValue : kr.targetValue,
      currentValue: req.body.currentValue !== undefined ? req.body.currentValue : kr.currentValue,
      metric: req.body.metric !== undefined ? req.body.metric : kr.metric
    });

    await updateGoalProgress(kr.goalId);

    const updatedKr = await keyResultDataService.findById(req.params.krId);
    res.status(200).json({ success: true, data: updatedKr });
  } catch (error) {
    next(error);
  }
};

// Delete a key result
exports.deleteKeyResult = async (req, res, next) => {
  try {
    const kr = await keyResultDataService.findById(req.params.krId);
    if (!kr) return next(new AppError('Key Result not found', 404));

    const goalId = kr.goalId;
    await keyResultDataService.delete(req.params.krId);
    await updateGoalProgress(goalId);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// Helper: Calculate average progress of all key results and update parent goal
async function updateGoalProgress(goalId) {
  const goal = await goalDataService.findById(goalId, [{ model: KeyResult, as: 'keyResults' }]);
  
  if (!goal) return;

  if (!goal.keyResults || goal.keyResults.length === 0) {
    await goalDataService.update(goalId, { progress: 0 });
    return;
  }

  let totalProgress = 0;
  goal.keyResults.forEach(kr => {
    if (kr.targetValue > 0) {
      let percent = (kr.currentValue / kr.targetValue) * 100;
      if (percent > 100) percent = 100; // Cap at 100%
      totalProgress += percent;
    }
  });

  const avgProgress = totalProgress / goal.keyResults.length;
  await goalDataService.update(goalId, { progress: avgProgress });
}
