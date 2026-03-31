const sanitizeHtml = require('sanitize-html');

/**
 * Sanitization utility for user inputs
 * Prevents XSS attacks by cleaning HTML and dangerous scripts
 */

// Strict sanitization - only allow plain text
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  return sanitizeHtml(text, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
};

// Basic sanitization - allow simple formatting
const sanitizeBasicHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {},
    allowedSchemes: []
  });
};

// Fields allowed through when updating a timesheet
const TIMESHEET_UPDATE_ALLOWED = new Set([
  'id', 'projectId', 'taskId',
  'weekStartDate', 'weekEndDate',
  'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours',
  'fridayHours', 'saturdayHours', 'sundayHours',
  'totalHours', 'totalHoursWorked', 'description', 'approverComments'
]);

// Sanitize timesheet data — whitelist safe fields and sanitize text
const sanitizeTimesheetData = (data) => {
  const sanitized = {};

  for (const key of Object.keys(data)) {
    if (TIMESHEET_UPDATE_ALLOWED.has(key)) {
      sanitized[key] = data[key];
    }
  }

  // Sanitize text fields
  if (sanitized.description) {
    sanitized.description = sanitizeText(sanitized.description);
  }
  
  if (sanitized.approverComments) {
    sanitized.approverComments = sanitizeText(sanitized.approverComments);
  }
  
  return sanitized;
};

// Sanitize bulk timesheet data
const sanitizeBulkTimesheetData = (timesheets) => {
  if (!Array.isArray(timesheets)) return timesheets;
  return timesheets.map(sanitizeTimesheetData);
};

module.exports = {
  sanitizeText,
  sanitizeBasicHtml,
  sanitizeTimesheetData,
  sanitizeBulkTimesheetData
};
