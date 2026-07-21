const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, isAdminOrHR } = require('../middleware/auth'); // Ensure these exist

// All notification routes require authentication
router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllAsRead);

// Broadcast route (Admin/HR only)
router.post('/broadcast', isAdminOrHR, notificationController.broadcast);

module.exports = router;
