const axios = require('axios');
const db = require('../models');
const { Employee, User, SalaryStructure, Payslip, PayrollData } = db;
const bcrypt = require('bcryptjs');
const app = require('../server');
const http = require('http');

let server;
let API_URL;
let adminToken, employeeToken;
let adminUser, employeeUser, employee;

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
    
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    // Admin (HR)
    adminUser = await User.create({
        username: 'testadmin_' + Date.now(),
        email: 'admin_' + Date.now() + '@test.com',
        password: passwordHash,
        role: 'admin',
        isActive: true,
        firstName: 'Test',
        lastName: 'Admin'
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
        status: 'Active',
        hireDate: new Date(),
        departmentId: null, // Optional
        positionId: null // Optional
    });

    console.log('✅ Test data created.');
}

async function login() {
    console.log('🔑 Logging in...');
    
    // Login Admin
    const adminRes = await axios.post(`${API_URL}/auth/login`, {
        email: adminUser.email,
        password: 'Password123!'
    });
    adminToken = adminRes.data.data.accessToken;
    console.log('✅ Admin logged in');

    // Login Employee
    const empRes = await axios.post(`${API_URL}/auth/login`, {
        email: employeeUser.email,
        password: 'Password123!'
    });
    employeeToken = empRes.data.data.accessToken;
    console.log('✅ Employee logged in');
}

async function testPayrollFlow() {
    console.log('💰 Testing Payroll Flow...');
    
    try {
        // 1. Create Salary Structure (Admin)
        console.log('   1. Creating Salary Structure...');
        const salaryStructureData = {
            employeeId: employee.id,
            earnings: {
                basic: 50000,
                hra: 20000,
                specialAllowance: 10000
            },
            deductions: {
                pf: 1800,
                tax: 2000
            },
            effectiveDate: new Date().toISOString().split('T')[0],
            ctc: 960000, // 80k * 12
            grossSalary: 80000,
            netSalary: 76200,
            payrollFrequency: 'monthly',
            remarks: 'Test Structure'
        };

        const structRes = await axios.post(`${API_URL}/salary-structures`, salaryStructureData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   ✅ Salary Structure created:', structRes.data.message);

        // 2. Generate Payslip (Admin)
        console.log('   2. Generating Payslip...');
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        const generateRes = await axios.post(`${API_URL}/payslips/generate`, {
            employeeIds: [employee.id],
            month: month,
            year: year
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   ✅ Payslip generated:', generateRes.data.message);
        
        const generatedPayslipId = generateRes.data.data.payslips[0].id;

        // 3. Employee View Payslip
        console.log('   3. Employee Viewing Payslip...');
        const myPayslipsRes = await axios.get(`${API_URL}/payslips/my`, {
            headers: { Authorization: `Bearer ${employeeToken}` }
        });
        
        const myPayslip = myPayslipsRes.data.data.find(p => p.id === generatedPayslipId);
        if (myPayslip) {
            console.log('   ✅ Employee found their payslip.');
        } else {
            console.error('   ❌ Employee could NOT find their payslip.');
        }

        // 4. Finalize Payslip (Admin)
        console.log('   4. Finalizing Payslip...');
        const finalizeRes = await axios.put(`${API_URL}/payslips/${generatedPayslipId}/finalize`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   ✅ Payslip finalized:', finalizeRes.data.message);

    } catch (err) {
        console.error('❌ Payroll Flow Error:', err.response?.data || err.message);
        if (err.response?.data?.errors) {
            console.error('   Validation Errors:', JSON.stringify(err.response.data.errors, null, 2));
        }
    }
}

async function cleanup() {
    console.log('🧹 Cleaning up...');
    try {
        if (employee) {
            // Delete payslips
            await Payslip.destroy({ where: { employeeId: employee.id }, force: true });
            // Delete payroll data
            if (PayrollData) {
                await PayrollData.destroy({ where: { employeeId: employee.id }, force: true });
            }
            // Delete salary structures
            await SalaryStructure.destroy({ where: { employeeId: employee.id }, force: true });
            // Delete employee
            await employee.destroy({ force: true });
        }
        
        if (employeeUser) await employeeUser.destroy({ force: true });
        if (adminUser) await adminUser.destroy({ force: true });
        
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
        await testPayrollFlow();
    } catch (err) {
        console.error('❌ Global Error:', err);
    } finally {
        await cleanup();
        await stopServer();
        process.exit();
    }
})();
