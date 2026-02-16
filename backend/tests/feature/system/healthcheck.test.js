const request = require('supertest');
const app = require('../../../server');

describe('API Health Check', () => {
  it('should return status OK and database info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('database');
  });
});
