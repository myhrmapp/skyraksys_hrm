const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAuditAPI() {
  try {
    // Login as admin
    const loginResp = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@skyraksys.com',
      password: 'admin123'
    });
    
    const token = loginResp.data.data.accessToken;
    console.log('✅ Logged in successfully\n');
    
    // Test audit logs endpoint
    console.log('Testing GET /admin/audit-logs?limit=10...');
    const auditResp = await axios.get(`${BASE_URL}/admin/audit-logs?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', auditResp.status);
    console.log('Response data structure:', JSON.stringify(auditResp.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuditAPI();
