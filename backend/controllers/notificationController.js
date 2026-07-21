const NotificationService = require('../services/NotificationService');
const { getIo } = require('../socket'); // We will create this

exports.getNotifications = async (req, res) => {
  try {
    const employee = req.user.employee; // Assuming employee relation is populated or we get department from employee
    const departmentId = employee ? employee.departmentId : null;
    const notifications = await NotificationService.getNotificationsForUser(req.user.id, departmentId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.broadcast = async (req, res) => {
  try {
    // Only Admin or HR should hit this route (handled by middleware)
    const { title, message, type, imageUrl, isPopup } = req.body;
    const notification = await NotificationService.broadcastAnnouncement(title, message, type, imageUrl, !!isPopup);
    
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
