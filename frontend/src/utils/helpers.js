// Re-export centralized formatCurrency for backward compatibility
export { formatCurrency } from './formatCurrency';

// Re-export centralized date utilities
export { displayDate, displayDateTime, displayTime, toAPIDate, toAPIDateTime } from './dateUtils';

/**
 * Format date to readable format.
 * Uses explicit timezone (Asia/Kolkata) so output is deterministic.
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'time')
 * @returns {string} - Formatted date
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const tz = 'Asia/Kolkata';
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric', timeZone: tz },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: tz },
    time: { hour: '2-digit', minute: '2-digit', timeZone: tz }
  };
  
  return dateObj.toLocaleDateString('en-IN', options[format] || options.short);
};

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} - Number of days
 */
export const calculateDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays + 1; // Include both start and end dates
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Is valid phone
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Generate employee ID
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {number} count - Employee count
 * @returns {string} - Generated employee ID
 */
export const generateEmployeeId = (firstName, lastName, count) => {
  const prefix = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  const number = String(count + 1).padStart(4, '0');
  return `${prefix}${number}`;
};

/**
 * Calculate total hours from time entries
 * @param {Array} entries - Array of time entries with hours
 * @returns {number} - Total hours
 */
export const calculateTotalHours = (entries) => {
  if (!Array.isArray(entries)) return 0;
  return entries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
};

// formatCurrency is now re-exported from ./formatCurrency.js (see top of file)

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any} - Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Get status badge class
 * @param {string} status - Status value
 * @returns {string} - Bootstrap badge class
 */
export const getStatusBadgeClass = (status) => {
  const statusMap = {
    active: 'badge-success',
    inactive: 'badge-danger',
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    processed: 'badge-info',
    draft: 'badge-secondary'
  };
  
  return statusMap[status?.toLowerCase()] || 'badge-secondary';
};

/**
 * Sort array by property
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} - Sorted array
 */
export const sortByProperty = (array, property, direction = 'asc') => {
  if (!Array.isArray(array)) return [];
  
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

/**
 * Filter array by search term
 * @param {Array} array - Array to filter
 * @param {string} searchTerm - Search term
 * @param {Array} searchFields - Fields to search in
 * @returns {Array} - Filtered array
 */
export const filterBySearch = (array, searchTerm, searchFields) => {
  if (!Array.isArray(array) || !searchTerm) return array;
  
  const term = searchTerm.toLowerCase();
  
  return array.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(term);
    });
  });
};
