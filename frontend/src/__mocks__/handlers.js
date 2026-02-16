import { rest } from 'msw';
import { 
  createMockUser, 
  createMockEmployee, 
  createMockLeaveRequest, 
  createMockTimesheet,
  createMockPayslip,
} from '../test-utils/testUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const handlers = [
  // Auth endpoints
  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body;
    
    if (email === 'admin@test.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          token: 'mock-jwt-token',
          user: createMockUser('admin'),
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  rest.post(`${API_URL}/auth/logout`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  rest.get(`${API_URL}/auth/me`, (req, res, ctx) => {
    const token = req.headers.get('Authorization');
    
    if (token) {
      return res(
        ctx.status(200),
        ctx.json({ user: createMockUser('employee') })
      );
    }
    
    return res(ctx.status(401), ctx.json({ message: 'Unauthorized' }));
  }),

  // Employee endpoints
  rest.get(`${API_URL}/employees`, (req, res, ctx) => {
    const employees = [
      createMockEmployee({ id: 1, employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' }),
      createMockEmployee({ id: 2, employeeId: 'EMP002', firstName: 'Jane', lastName: 'Smith' }),
      createMockEmployee({ id: 3, employeeId: 'EMP003', firstName: 'Bob', lastName: 'Johnson' }),
    ];
    
    return res(ctx.status(200), ctx.json({ data: employees }));
  }),

  rest.get(`${API_URL}/employees/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const employee = createMockEmployee({ id: parseInt(id), employeeId: `EMP${String(id).padStart(3, '0')}` });
    
    return res(ctx.status(200), ctx.json({ data: employee }));
  }),

  rest.post(`${API_URL}/employees`, (req, res, ctx) => {
    const employee = createMockEmployee({ ...req.body, id: 999 });
    
    return res(ctx.status(201), ctx.json({ data: employee }));
  }),

  rest.put(`${API_URL}/employees/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const employee = createMockEmployee({ ...req.body, id: parseInt(id) });
    
    return res(ctx.status(200), ctx.json({ data: employee }));
  }),

  rest.delete(`${API_URL}/employees/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Leave endpoints
  rest.get(`${API_URL}/leaves`, (req, res, ctx) => {
    const leaveRequests = [
      createMockLeaveRequest({ id: 1, status: 'Pending' }),
      createMockLeaveRequest({ id: 2, status: 'Approved' }),
      createMockLeaveRequest({ id: 3, status: 'Rejected' }),
    ];
    
    return res(ctx.status(200), ctx.json({ data: leaveRequests }));
  }),

  rest.get(`${API_URL}/leaves/balance`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          annualLeave: 15,
          sickLeave: 10,
          casualLeave: 5,
        },
      })
    );
  }),

  rest.post(`${API_URL}/leaves`, (req, res, ctx) => {
    const leaveRequest = createMockLeaveRequest({ ...req.body, id: 999 });
    
    return res(ctx.status(201), ctx.json({ data: leaveRequest }));
  }),

  rest.put(`${API_URL}/leaves/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const leaveRequest = createMockLeaveRequest({ ...req.body, id: parseInt(id) });
    
    return res(ctx.status(200), ctx.json({ data: leaveRequest }));
  }),

  // Timesheet endpoints
  rest.get(`${API_URL}/timesheets`, (req, res, ctx) => {
    const timesheets = [
      createMockTimesheet({ id: 1, date: '2026-01-20', hours: 8 }),
      createMockTimesheet({ id: 2, date: '2026-01-21', hours: 6 }),
    ];
    
    return res(ctx.status(200), ctx.json({ data: timesheets }));
  }),

  rest.get(`${API_URL}/timesheets/week/:weekStart`, (req, res, ctx) => {
    const timesheets = [
      createMockTimesheet({ id: 1, date: '2026-01-20', hours: 8 }),
      createMockTimesheet({ id: 2, date: '2026-01-21', hours: 6 }),
    ];
    
    return res(ctx.status(200), ctx.json({ data: timesheets }));
  }),

  rest.post(`${API_URL}/timesheets`, (req, res, ctx) => {
    const timesheet = createMockTimesheet({ ...req.body, id: 999 });
    
    return res(ctx.status(201), ctx.json({ data: timesheet }));
  }),

  rest.put(`${API_URL}/timesheets/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const timesheet = createMockTimesheet({ ...req.body, id: parseInt(id) });
    
    return res(ctx.status(200), ctx.json({ data: timesheet }));
  }),

  rest.delete(`${API_URL}/timesheets/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Payroll endpoints
  rest.get(`${API_URL}/payroll`, (req, res, ctx) => {
    const payslips = [
      createMockPayslip({ id: 1, month: 1, year: 2026, status: 'Generated' }),
      createMockPayslip({ id: 2, month: 1, year: 2026, status: 'Sent' }),
      createMockPayslip({ id: 3, month: 12, year: 2025, status: 'Paid' }),
    ];
    
    return res(ctx.status(200), ctx.json({ data: payslips }));
  }),

  rest.post(`${API_URL}/payroll/generate`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          generated: 150,
          message: '150 payslips generated successfully',
        },
      })
    );
  }),

  rest.post(`${API_URL}/payroll/:id/send`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Payslip sent successfully',
      })
    );
  }),

  rest.get(`${API_URL}/payroll/:id/download`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Dashboard endpoints
  rest.get(`${API_URL}/dashboard/stats`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          stats: {
            totalEmployees: 150,
            activeEmployees: 145,
            pendingLeaves: 12,
            pendingTimesheets: 8,
            totalDepartments: 8,
            totalProjects: 15,
          },
          recentActivities: [
            {
              id: 1,
              type: 'employee_joined',
              description: 'John Doe joined Engineering',
              timestamp: new Date().toISOString(),
            },
            {
              id: 2,
              type: 'leave_approved',
              description: 'Leave request approved for Jane Smith',
              timestamp: new Date().toISOString(),
            },
          ],
          departmentStats: [
            { name: 'Engineering', count: 50 },
            { name: 'HR', count: 15 },
            { name: 'Finance', count: 20 },
            { name: 'Sales', count: 35 },
          ],
          leaveStats: {
            approved: 45,
            pending: 12,
            rejected: 5,
          },
        },
      })
    );
  }),

  // Project endpoints
  rest.get(`${API_URL}/projects`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'Project A', code: 'PROJ-A' },
          { id: 2, name: 'Project B', code: 'PROJ-B' },
        ],
      })
    );
  }),

  rest.get(`${API_URL}/tasks`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'Development', projectId: 1 },
          { id: 2, name: 'Testing', projectId: 1 },
        ],
      })
    );
  }),

  // Department endpoints
  rest.get(`${API_URL}/departments`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'Engineering', code: 'ENG' },
          { id: 2, name: 'HR', code: 'HR' },
          { id: 3, name: 'Finance', code: 'FIN' },
        ],
      })
    );
  }),
];

export default handlers;
