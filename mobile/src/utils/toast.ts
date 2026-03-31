import Toast from 'react-native-toast-message';

export const showSuccess = (message: string, title = 'Success') => {
  Toast.show({ type: 'success', text1: title, text2: message, visibilityTime: 2500, position: 'top' });
};

export const showError = (message: string, title = 'Error') => {
  Toast.show({ type: 'error', text1: title, text2: message, visibilityTime: 4000, position: 'top' });
};

export const showInfo = (message: string, title = 'Info') => {
  Toast.show({ type: 'info', text1: title, text2: message, visibilityTime: 3000, position: 'top' });
};
