const db = require('../models');
const { Notification, User, Employee } = db;
const { Op } = require('sequelize');

class NotificationService {
  /**
   * Helper method to safely emit socket events if socket is initialized
   */
  static emitSocketEvent(room, event, data) {
    try {
      const { getIo } = require('../socket');
      const io = getIo();
      if (io) {
        if (room) io.to(room).emit(event, data);
        else io.emit(event, data);
      }
    } catch (e) {
      // Socket not initialized or other error, safe to ignore during tests or CLI
    }
  }

  static async getNotificationsForUser(userId, departmentId) {
    const whereClause = {
      userId: userId
    };

    return Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
  }

  static async markAllAsRead(userId) {
    return Notification.update(
      { isRead: true },
      { where: { userId: userId, isRead: false } }
    );
  }

  static async sendNotification(userId, title, message, type = 'info', link = null, imageUrl = null) {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      imageUrl,
      targetAudience: 'USER'
    });

    this.emitSocketEvent(`user_${userId}`, 'new_notification', notification);
    return notification;
  }

  static async notifyRole(roles, title, message, type = 'info', link = null, imageUrl = null) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const users = await User.findAll({
      where: {
        role: { [Op.in]: roleArray.map(r => r.toLowerCase()) },
        isActive: true
      }
    });

    const notifications = users.map(user => ({
      userId: user.id,
      title,
      message,
      type,
      link,
      imageUrl,
      targetAudience: 'USER' // Saved as individual notifications
    }));

    if (notifications.length > 0) {
      const created = await Notification.bulkCreate(notifications);
      // Emit to each role room
      roleArray.forEach(role => {
        this.emitSocketEvent(`role_${role.toLowerCase()}`, 'new_notification', {
          title, message, type, link, imageUrl, targetAudience: 'USER'
        });
      });
      return created;
    }
    return [];
  }

  static async notifyDepartment(departmentId, title, message, type = 'info', link = null, imageUrl = null) {
    const employees = await Employee.findAll({
      where: { departmentId },
      include: [{ model: User, as: 'user', where: { isActive: true } }]
    });

    const notifications = employees.map(emp => ({
      userId: emp.user.id,
      title,
      message,
      type,
      link,
      imageUrl,
      targetAudience: 'DEPARTMENT',
      departmentId
    }));

    if (notifications.length > 0) {
      const created = await Notification.bulkCreate(notifications);
      // Emit individually to each user in department
      employees.forEach(emp => {
        this.emitSocketEvent(`user_${emp.user.id}`, 'new_notification', {
          title, message, type, link, imageUrl, targetAudience: 'DEPARTMENT'
        });
      });
      return created;
    }
    return [];
  }

  static async broadcastAnnouncement(title, message, type = 'info', imageUrl = null, isPopup = false) {
    const users = await User.findAll({ where: { isActive: true } });
    const notifications = users.map(user => ({
      userId: user.id,
      title,
      message,
      type,
      imageUrl,
      isPopup,
      targetAudience: 'ALL'
    }));
    
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }
    
    const payload = { title, message, type, imageUrl, isPopup, targetAudience: 'ALL' };
    this.emitSocketEvent(null, 'broadcast', payload);
    return payload;
  }
}

module.exports = NotificationService;
