process.env.INVOICE_SECRET_PHRASE = 'SkyraskysHRSecret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../../server');
const db = require('../../../models');
const {
  encryptText,
  buildLineItemsEncryptedPayload
} = require('../../../utils/invoiceEncryption');

let invoiceCounter = 0;

describe('Invoice secret phrase rotation API', () => {
  const hrPassword = 'HrPass123!';
  let hrUser;
  let hrToken;
  let adminUser;
  let adminToken;
  let invoice;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(hrPassword, 10);

    hrUser = await db.User.create({
      email: 'hr-invoice-secret@test.com',
      password: hashedPassword,
      firstName: 'HR',
      lastName: 'Invoice',
      role: 'hr',
      isActive: true,
      isLocked: false
    });

    adminUser = await db.User.create({
      email: 'admin-invoice-secret@test.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Invoice',
      role: 'admin',
      isActive: true,
      isLocked: false
    });

    const hrLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: hrUser.email, password: hrPassword });
    hrToken = hrLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: hrPassword });
    adminToken = adminLogin.body.data.accessToken;
  });

  beforeEach(async () => {
    await db.SystemConfig.destroy({ where: { category: 'invoice_security', key: 'secret_phrase' }, force: true });
    await db.Invoice.destroy({ where: {}, force: true });
    invoiceCounter += 1;

    invoice = await db.Invoice.create({
      invoiceNumber: `INV-202607-${String(invoiceCounter).padStart(4, '0')}`,
      clientCompany: encryptText('Acme Client Pvt Ltd', 'SkyraskysHRSecret'),
      clientGstin: encryptText('29ABCDE1234F1Z5', 'SkyraskysHRSecret'),
      clientAddress: encryptText('Bangalore, India', 'SkyraskysHRSecret'),
      billingMonth: 7,
      billingYear: 2026,
      issueDate: '2026-07-01',
      dueDate: '2026-07-15',
      currency: 'INR',
      workerType: 'mixed',
      status: 'draft',
      lineItems: buildLineItemsEncryptedPayload([
        {
          employeeId: null,
          employeeName: 'Worker One',
          employmentType: 'contractor',
          hoursSupported: 12,
          hourlyRate: 1000,
          amount: 12000,
          description: 'Support hours'
        }
      ], 'SkyraskysHRSecret'),
      subtotal: 12000,
      taxPercent: 18,
      taxAmount: 2160,
      totalAmount: 14160,
      notes: encryptText('Confidential billing note', 'SkyraskysHRSecret'),
      createdBy: hrUser.id,
      updatedBy: hrUser.id
    });
  });

  afterAll(async () => {
    await db.Invoice.destroy({ where: {}, force: true });
    await db.SystemConfig.destroy({ where: { category: 'invoice_security', key: 'secret_phrase' }, force: true });
    await db.User.destroy({ where: { email: ['hr-invoice-secret@test.com', 'admin-invoice-secret@test.com'] }, force: true });
    await db.sequelize.close();
  });

  it('allows HR to rotate the phrase and re-encrypt existing invoices', async () => {
    const rotateResponse = await request(app)
      .post('/api/invoices/secret-phrase/rotate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        password: hrPassword,
        currentPhrase: 'SkyraskysHRSecret',
        newPhrase: 'NewSkyraksysPhrase2026',
        confirmPhrase: 'NewSkyraksysPhrase2026'
      });

    expect(rotateResponse.status).toBe(200);
    expect(rotateResponse.body.success).toBe(true);
    expect(rotateResponse.body.data.rotatedInvoices).toBe(1);

    const oldPhraseResponse = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-invoice-secret-phrase', 'SkyraskysHRSecret');

    expect(oldPhraseResponse.status).toBe(403);

    const newPhraseResponse = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .set('x-invoice-secret-phrase', 'NewSkyraksysPhrase2026');

    expect(newPhraseResponse.status).toBe(200);
    expect(newPhraseResponse.body.data.clientCompany).toBe('Acme Client Pvt Ltd');
    expect(newPhraseResponse.body.data.notes).toBe('Confidential billing note');
    expect(newPhraseResponse.body.data.lineItems[0].employeeName).toBe('Worker One');

    const configRecord = await db.SystemConfig.findOne({
      where: { category: 'invoice_security', key: 'secret_phrase' },
      order: [['version', 'DESC']]
    });

    expect(configRecord).toBeTruthy();
    expect(configRecord.version).toBe(1);
  });

  it('rejects non-HR users from rotating the phrase', async () => {
    const response = await request(app)
      .post('/api/invoices/secret-phrase/rotate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        password: hrPassword,
        currentPhrase: 'SkyraskysHRSecret',
        newPhrase: 'AnotherPhrase2026',
        confirmPhrase: 'AnotherPhrase2026'
      });

    expect(response.status).toBe(403);
  });
});
