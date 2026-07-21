import api from './api.service';

const NotificationService = {
  getNotifications: async () => {
    return await api.get('/notifications');
  },
  
  markAllAsRead: async () => {
    return await api.put('/notifications/read-all');
  },
  
  broadcast: async (data) => {
    return await api.post('/notifications/broadcast', data);
  }
};

export default NotificationService;
