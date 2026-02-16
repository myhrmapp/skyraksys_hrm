/**
 * Services Index
 * Centralized export of all service modules
 * Usage: import { authService, employeeService } from '../services';
 */

// Service Helpers
export { normalizeResponse, normalizeError } from './serviceHelpers';

// Core Services
export { default as apiService } from './api.service';
export { authService } from './auth.service';

// Feature Services
export { employeeService } from './employee.service';
export { leaveService } from './leave.service';
export { timesheetService } from './timesheet.service';
export { attendanceService } from './attendance.service';
export { default as payrollService } from './payroll.service';
export { default as dashboardService } from './dashboard.service';
export { default as settingsService } from './settings.service';
export { default as performanceService } from './performance.service';
export { employeeReviewService } from './employeeReview.service';
export { leaveAccrualService } from './leaveAccrual.service';
export { restoreService } from './restore.service';

// Legacy/Compatibility exports
export { default as ProjectService } from './ProjectService';
export { default as TaskService } from './TaskService';

// Export API Endpoints configuration
export { default as API_ENDPOINTS } from '../config/apiEndpoints';
