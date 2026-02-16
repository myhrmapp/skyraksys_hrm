const axios = require('axios');
const db = require('../models');
const { Employee, User, Project, Task, Timesheet } = db;
const bcrypt = require('bcryptjs');
const app = require('../server');
const http = require('http');

let server;
let API_URL;
let employeeToken, managerToken;
let employeeUser, managerUser, employee, manager;
let project, assignedTask, unassignedTask;

async function startServer() {
    return new Promise((resolve, reject) => {
        server = http.createServer(app);
        server.listen(0, () => { // Random port
            const port = server.address().port;
            API_URL = `http://localhost:${port}/api`;
            console.log(`🚀 Test server running on port ${port}`);
            resolve();
        });
        server.on('error', reject);
    });
}

async function stopServer() {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                console.log('🛑 Test server stopped');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

async function setup() {
    console.log('🚀 Setting up test data...');
    
    // Create Project
    project = await Project.create({
        name: 'Test Project ' + Date.now(),
        status: 'Active',
        isActive: true,
        startDate: new Date()
    });

    // Create Users & Employees
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    // Manager
    managerUser = await User.create({
        username: 'testmanager_' + Date.now(),
        email: 'manager_' + Date.now() + '@test.com',
        password: passwordHash,
        role: 'manager',
        isActive: true,
        firstName: 'Test',
        lastName: 'Manager'
    });
    manager = await Employee.create({
        userId: managerUser.id,
        firstName: 'Test',
        lastName: 'Manager',
        email: managerUser.email,
        employeeId: 'M' + Date.now(),
        status: 'Active',
        hireDate: new Date()
    });

    // Employee
    employeeUser = await User.create({
        username: 'testemployee_' + Date.now(),
        email: 'employee_' + Date.now() + '@test.com',
        password: passwordHash,
        role: 'employee',
        isActive: true,
        firstName: 'Test',
        lastName: 'Employee'
    });
    employee = await Employee.create({
        userId: employeeUser.id,
        firstName: 'Test',
        lastName: 'Employee',
        email: employeeUser.email,
        employeeId: 'E' + Date.now(),
        managerId: manager.id,
        status: 'Active',
        hireDate: new Date()
    });

    // Create Tasks
    assignedTask = await Task.create({
        name: 'Assigned Task',
        projectId: project.id,
        assignedTo: employee.id,
        status: 'In Progress',
        isActive: true
    });

    unassignedTask = await Task.create({
        name: 'Unassigned Task',
        projectId: project.id,
        assignedTo: manager.id, // Assigned to someone else
        status: 'In Progress',
        isActive: true
    });

    console.log('✅ Test data created.');
}

async function login() {
    console.log('🔑 Logging in...');
    
    // Login Employee
    const empRes = await axios.post(`${API_URL}/auth/login`, {
        email: employeeUser.email,
        password: 'Password123!'
    });
    employeeToken = empRes.data.data.accessToken;
    console.log('✅ Employee logged in');

    // Login Manager
    const mgrRes = await axios.post(`${API_URL}/auth/login`, {
        email: managerUser.email,
        password: 'Password123!'
    });
    managerToken = mgrRes.data.data.accessToken;
    console.log('✅ Manager logged in');
}

async function testTaskVisibility() {
    console.log('👀 Testing Task Visibility...');
    try {
        const res = await axios.get(`${API_URL}/tasks`, {
            headers: { Authorization: `Bearer ${employeeToken}` }
        });
        
        const tasks = res.data.data;
        const hasAssigned = tasks.find(t => t.id === assignedTask.id);
        const hasUnassigned = tasks.find(t => t.id === unassignedTask.id);

        if (hasAssigned && !hasUnassigned) {
            console.log('✅ Task visibility correct: Employee sees only assigned task.');
        } else {
            console.error('❌ Task visibility FAILED:', { 
                hasAssigned: !!hasAssigned, 
                hasUnassigned: !!hasUnassigned 
            });
        }
    } catch (err) {
        console.error('❌ Error fetching tasks:', err.message);
    }
}

async function testTimesheetFlow() {
    console.log('📝 Testing Timesheet Flow...');
    
    const weekStart = new Date();
    // Set to previous Monday
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day == 0 ? -6 : 1); 
    weekStart.setDate(diff);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const timesheetData = [{
        projectId: project.id,
        taskId: assignedTask.id,
        weekStartDate: weekStartDate,
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0
    }];

    try {
        // 1. Save Draft
        console.log('   1. Saving Draft...');
        const draftRes = await axios.post(`${API_URL}/timesheets/bulk-save`, {
            timesheets: timesheetData
        }, {
            headers: { Authorization: `Bearer ${employeeToken}` }
        });
        console.log('   ✅ Draft saved:', draftRes.data.message);

        // 2. Submit
        console.log('   2. Submitting...');
        const submitRes = await axios.post(`${API_URL}/timesheets/bulk-submit`, {
            weekStartDate: weekStartDate
        }, {
            headers: { Authorization: `Bearer ${employeeToken}` }
        });
        console.log('   ✅ Submitted:', submitRes.data.message);

        // 3. Approve (Manager)
        console.log('   3. Approving (Manager)...');
        
        // Fetch pending approvals as manager
        const pendingRes = await axios.get(`${API_URL}/timesheets/approval/pending`, {
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        
        const pendingIds = pendingRes.data.data
            .filter(t => t.employeeId === employee.id)
            .map(t => t.id);
            
        if (pendingIds.length > 0) {
            const approveRes = await axios.post(`${API_URL}/timesheets/bulk-approve`, {
                timesheetIds: pendingIds
            }, {
                headers: { Authorization: `Bearer ${managerToken}` }
            });
            console.log('   ✅ Approved:', approveRes.data.message);
        } else {
            console.error('   ❌ No pending timesheets found for approval.');
        }

    } catch (err) {
        console.error('❌ Timesheet Flow Error:', err.response?.data || err.message);
    }
}

async function cleanup() {
    console.log('🧹 Cleaning up...');
    try {
        // Delete timesheets first
        if (project) {
            await Timesheet.destroy({ where: { projectId: project.id }, force: true });
        }
        
        if (employee) await employee.destroy({ force: true });
        if (manager) await manager.destroy({ force: true });
        if (employeeUser) await employeeUser.destroy({ force: true });
        if (managerUser) await managerUser.destroy({ force: true });
        if (assignedTask) await assignedTask.destroy({ force: true });
        if (unassignedTask) await unassignedTask.destroy({ force: true });
        if (project) await project.destroy({ force: true });
        
        console.log('✅ Cleanup complete.');
    } catch (err) {
        console.error('⚠️ Cleanup warning:', err.message);
    }
}

(async () => {
    try {
        await startServer();
        await setup();
        await login();
        await testTaskVisibility();
        await testTimesheetFlow();
    } catch (err) {
        console.error('❌ Global Error:', err);
    } finally {
        await cleanup();
        await stopServer();
        process.exit();
    }
})();
