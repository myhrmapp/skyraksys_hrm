// Development logging utility
// Centralized console logging that can be toggled for production
/* eslint-disable no-console */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    console.warn(...args); // Always log warnings
  },
  
  error: (...args) => {
    console.error(...args); // Always log errors
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

export default logger;
