/**
 * DashboardService Tests
 * 
 * Tests for dashboard statistics with caching
 */

const DashboardService = require('../../../services/DashboardService');
const { resetCacheInstance } = require('../../../services/CacheService');

// Mock the database
const mockDb = {
    sequelize: {
        query: jest.fn(),
        fn: jest.fn((fnName, col) => ({ fn: fnName, col })), // Mock Sequelize.fn
        col: jest.fn((colName) => ({ col: colName })), // Mock Sequelize.col
        literal: jest.fn((value) => ({ literal: value })) // Mock Sequelize.literal
    },
    Employee: {
        findAll: jest.fn(),
        count: jest.fn()
    },
    LeaveBalance: {
        findAll: jest.fn()
    },
    LeaveRequest: {
        findAll: jest.fn(),
        count: jest.fn()
    },
    Timesheet: {
        findAll: jest.fn(),
        count: jest.fn()
    },
    Payslip: {
        count: jest.fn()
    },
    LeaveType: {},
    Project: {}
};

describe('DashboardService', () => {
    let service;

    beforeEach(() => {
        // Reset cache and create new service
        resetCacheInstance();
        service = new DashboardService(mockDb);
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        if (service && service.cache) {
            await service.cache.clear();
        }
    });

    describe('getEmployeeStats', () => {
        test('should return employee dashboard stats', async () => {
            const employeeId = 1;
            
            // Mock leave balances
            mockDb.LeaveBalance.findAll.mockResolvedValue([
                { balance: 10, totalAccrued: 15, leaveType: { name: 'Annual' } },
                { balance: 5, totalAccrued: 5, leaveType: { name: 'Sick' } }
            ]);
            
            // Mock counts
            mockDb.LeaveRequest.count.mockResolvedValueOnce(2); // pending leaves
            mockDb.Timesheet.count.mockResolvedValueOnce(3); // pending timesheets
            
            // Mock timesheet aggregation
            mockDb.Timesheet.findAll.mockResolvedValueOnce([
                { totalHours: '40', totalDays: '5' }
            ]);
            
            // Mock recent activity
            mockDb.LeaveRequest.findAll.mockResolvedValueOnce([
                { 
                    id: 1, 
                    startDate: new Date('2026-02-10'), 
                    endDate: new Date('2026-02-12'), 
                    status: 'Approved',
                    updatedAt: new Date('2026-02-06'),
                    leaveType: { name: 'Annual' }
                }
            ]);
            mockDb.Timesheet.findAll.mockResolvedValueOnce([
                {
                    id: 1,
                    workDate: new Date('2026-02-05'),
                    status: 'Submitted',
                    updatedAt: new Date('2026-02-05'),
                    project: { name: 'Project Alpha' }
                }
            ]);
            
            // Mock upcoming leaves
            mockDb.LeaveRequest.findAll.mockResolvedValueOnce([
                {
                    id: 2,
                    startDate: new Date('2026-03-01'),
                    endDate: new Date('2026-03-03'),
                    status: 'Approved',
                    leaveType: { name: 'Annual' }
                }
            ]);
            
            const result = await service.getEmployeeStats(employeeId);
            
            expect(result).toBeDefined();
            expect(result.leaveBalance).toHaveProperty('annual');
            expect(result.leaveBalance).toHaveProperty('sick');
            expect(result.leaveBalance.annual).toEqual({ remaining: 10, total: 15, used: 5 });
            expect(result.pendingRequests).toEqual({ leaves: 2, timesheets: 3 });
            expect(result.currentMonth.hoursWorked).toBe(40);
            expect(result.currentMonth.daysWorked).toBe(5);
            expect(result.recentActivity).toHaveLength(2);
            expect(result.upcomingLeaves).toHaveLength(1);
        });

        test('should cache employee stats', async () => {
            const employeeId = 1;
            
            // Setup minimal mocks with required fields
            mockDb.LeaveBalance.findAll.mockResolvedValue([]);
            mockDb.LeaveRequest.count.mockResolvedValue(0);
            mockDb.Timesheet.count.mockResolvedValue(0);
            mockDb.Timesheet.findAll
                .mockResolvedValueOnce([{ totalHours: '0', totalDays: '0' }]) // First query (stats)
                .mockResolvedValueOnce([]); // Second query (recent timesheets)
            mockDb.LeaveRequest.findAll.mockResolvedValue([]);
            
            // First call - cache miss
            await service.getEmployeeStats(employeeId);
            
            // Second call - should use cache
            await service.getEmployeeStats(employeeId);
            
            // findAll should only be called once per query type (2 timesheet queries = 2 calls)
            expect(mockDb.LeaveBalance.findAll).toHaveBeenCalledTimes(1);
        });

        test('should handle empty leave balances', async () => {
            const employeeId = 1;
            
            mockDb.LeaveBalance.findAll.mockResolvedValue([]);
            mockDb.LeaveRequest.count.mockResolvedValue(0);
            mockDb.Timesheet.count.mockResolvedValue(0);
            mockDb.Timesheet.findAll.mockResolvedValue([]);
            mockDb.LeaveRequest.findAll.mockResolvedValue([]);
            
            const result = await service.getEmployeeStats(employeeId);
            
            expect(result.leaveBalance).toEqual({});
        });
    });

    describe('getAdminStats', () => {
        test('should return admin dashboard stats', async () => {
            // Mock combined employee stats query
            mockDb.sequelize.query.mockResolvedValueOnce([
                { total: '100', active: '85', newHires: '5' }
            ]);
            
            // Mock leave stats
            mockDb.LeaveRequest.count
                .mockResolvedValueOnce(10) // onLeaveToday
                .mockResolvedValueOnce(15) // pending
                .mockResolvedValueOnce(20) // approved this month
                .mockResolvedValueOnce(3);  // rejected this month
            
            // Mock timesheet and payroll stats
            mockDb.Timesheet.count
                .mockResolvedValueOnce(25) // pending
                .mockResolvedValueOnce(30) // submitted
                .mockResolvedValueOnce(40); // approved
            mockDb.Payslip.count.mockResolvedValueOnce(80); // processed
            
            const result = await service.getAdminStats();
            
            expect(result.stats.employees).toEqual({
                total: 100,
                active: 85,
                onLeave: 10,
                newHires: 5
            });
            expect(result.stats.leaves).toEqual({
                pending: 15,
                approved: 20,
                rejected: 3
            });
            expect(result.stats.timesheets).toEqual({
                pending: 25,
                submitted: 30,
                approved: 40
            });
            expect(result.stats.payroll).toEqual({
                processed: 80,
                pending: 20,
                total: 100
            });
        });

        test('should cache admin stats', async () => {
            mockDb.sequelize.query.mockResolvedValue([{ total: '10', active: '10', newHires: '0' }]);
            mockDb.LeaveRequest.count.mockResolvedValue(0);
            mockDb.Timesheet.count.mockResolvedValue(0);
            mockDb.Payslip.count.mockResolvedValue(0);
            
            // First call
            await service.getAdminStats();
            
            // Second call - should use cache
            await service.getAdminStats();
            
            // Query should only be called once
            expect(mockDb.sequelize.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('getManagerStats', () => {
        test('should return manager team stats', async () => {
            const managerId = 5;
            const userId = 10;
            
            // Mock team member IDs
            mockDb.Employee.findAll.mockResolvedValueOnce([
                { id: 101 },
                { id: 102 },
                { id: 103 }
            ]);
            
            // Mock employee stats
            mockDb.Employee.count
                .mockResolvedValueOnce(3) // active
                .mockResolvedValueOnce(0); // new hires
            mockDb.LeaveRequest.count
                .mockResolvedValueOnce(1) // onLeaveToday
                .mockResolvedValueOnce(2) // pending
                .mockResolvedValueOnce(5) // approved
                .mockResolvedValueOnce(1); // rejected
            
            // Mock timesheet and payroll stats
            mockDb.Timesheet.count
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(6)
                .mockResolvedValueOnce(10);
            mockDb.Payslip.count.mockResolvedValueOnce(3);
            
            const result = await service.getManagerStats(managerId, userId);
            
            expect(result.stats.employees.total).toBe(3);
            expect(result.stats.employees.active).toBe(3);
            expect(result.stats.leaves.pending).toBe(2);
        });

        test('should handle manager with no team members', async () => {
            const managerId = 5;
            const userId = 10;
            
            mockDb.Employee.findAll.mockResolvedValueOnce([]);
            
            const result = await service.getManagerStats(managerId, userId);
            
            expect(result.stats.employees.total).toBe(0);
            expect(result.stats.employees.active).toBe(0);
        });

        test('should cache team member IDs separately', async () => {
            const managerId = 5;
            const userId = 10;
            
            mockDb.Employee.findAll.mockResolvedValue([{ id: 101 }]);
            mockDb.Employee.count.mockResolvedValue(1);
            mockDb.LeaveRequest.count.mockResolvedValue(0);
            mockDb.Timesheet.count.mockResolvedValue(0);
            mockDb.Payslip.count.mockResolvedValue(0);
            
            // First call
            await service.getManagerStats(managerId, userId);
            
            // Second call - team IDs should be cached
            await service.getManagerStats(managerId, userId);
            
            // findAll for team IDs should only be called once
            expect(mockDb.Employee.findAll).toHaveBeenCalledTimes(1);
        });
    });

    describe('getAdminStatsWithCharts', () => {
        test('should return admin stats with chart data', async () => {
            // Mock base stats
            mockDb.sequelize.query
                .mockResolvedValueOnce([{ total: '100', active: '85', newHires: '5' }]) // employee stats
                .mockResolvedValueOnce([ // employee growth
                    { name: 'Jan', employees: '90' },
                    { name: 'Feb', employees: '95' },
                    { name: 'Mar', employees: '100' }
                ]);
            
            mockDb.LeaveRequest.count.mockResolvedValue(0);
            mockDb.Timesheet.count.mockResolvedValue(0);
            mockDb.Payslip.count.mockResolvedValue(0);
            
            // Mock leave distribution
            mockDb.LeaveRequest.findAll.mockResolvedValueOnce([
                { 'leaveType.name': 'Annual', count: '50' },
                { 'leaveType.name': 'Sick', count: '30' }
            ]);
            
            const result = await service.getAdminStatsWithCharts();
            
            expect(result.stats).toBeDefined();
            expect(result.charts).toBeDefined();
            expect(result.charts.employeeGrowth).toHaveLength(3);
            expect(result.charts.employeeGrowth[0].name).toBe('Jan');
            expect(result.charts.employeeGrowth[0].employees).toBe(90);
            expect(result.charts.leaveDistribution).toHaveLength(2);
        });
    });

    describe('Cache Invalidation', () => {
        test('should invalidate employee stats cache', async () => {
            const employeeId = 1;
            
            const cacheKey = `${service.CACHE_PREFIX.EMPLOYEE_STATS}:${employeeId}`;
            await service.cache.set(cacheKey, { test: 'data' }, 60);
            
            await service.invalidateEmployeeStats(employeeId);
            
            const cached = await service.cache.get(cacheKey);
            expect(cached).toBeNull();
        });

        test('should invalidate manager stats cache', async () => {
            const managerId = 5;
            
            const statsCacheKey = `${service.CACHE_PREFIX.MANAGER_STATS}:${managerId}`;
            const teamCacheKey = `${service.CACHE_PREFIX.MANAGER_TEAM_IDS}:${managerId}`;
            
            await service.cache.set(statsCacheKey, { test: 'stats' }, 60);
            await service.cache.set(teamCacheKey, [1, 2, 3], 60);
            
            await service.invalidateManagerStats(managerId);
            
            expect(await service.cache.get(statsCacheKey)).toBeNull();
            expect(await service.cache.get(teamCacheKey)).toBeNull();
        });

        test('should invalidate all admin stats cache', async () => {
            await service.cache.set(`${service.CACHE_PREFIX.ADMIN_STATS}:all`, { test: 'data' }, 60);
            await service.cache.set(`${service.CACHE_PREFIX.CHART_DATA}:admin`, { test: 'charts' }, 60);
            
            await service.invalidateAdminStats();
            
            expect(await service.cache.get(`${service.CACHE_PREFIX.ADMIN_STATS}:all`)).toBeNull();
            expect(await service.cache.get(`${service.CACHE_PREFIX.CHART_DATA}:admin`)).toBeNull();
        });

        test('should invalidate all dashboard caches', async () => {
            await service.cache.set('dashboard:employee-stats:1', { test: 'data' }, 60);
            await service.cache.set('dashboard:admin-stats:all', { test: 'data' }, 60);
            await service.cache.set('dashboard:manager-stats:5', { test: 'data' }, 60);
            
            await service.invalidateAll();
            
            expect(await service.cache.get('dashboard:employee-stats:1')).toBeNull();
            expect(await service.cache.get('dashboard:admin-stats:all')).toBeNull();
            expect(await service.cache.get('dashboard:manager-stats:5')).toBeNull();
        });
    });

    describe('getCacheStats', () => {
        test('should return cache statistics', () => {
            const stats = service.getCacheStats();
            
            expect(stats).toHaveProperty('totalEntries');
            expect(stats).toHaveProperty('validEntries');
            expect(stats).toHaveProperty('expiredEntries');
            expect(stats).toHaveProperty('maxSize');
        });
    });
});
