export const colors = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',

  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  border: '#E0E0E0',
  divider: '#EEEEEE',
  disabled: '#BDBDBD',

  attendance: {
    present: '#4CAF50',
    late: '#FF9800',
    absent: '#F44336',
    leave: '#2196F3',
    holiday: '#9C27B0',
    weekend: '#E0E0E0',
    halfDay: '#FFC107',
  },

  status: {
    active: '#4CAF50',
    inactive: '#9E9E9E',
    pending: '#FF9800',
    approved: '#4CAF50',
    rejected: '#F44336',
    draft: '#9E9E9E',
    submitted: '#2196F3',
  },
} as const;
