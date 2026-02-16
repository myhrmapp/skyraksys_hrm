const emailService = require('../../../services/email.service');
const nodemailer = require('nodemailer');
const encryptionService = require('../../../utils/encryption');
const logger = require('../../../utils/logger');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../../utils/encryption');
jest.mock('../../../utils/logger');
jest.mock('fs');

describe('EmailService', () => {
  let mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn((callback) => callback(null, true))
    };
    
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Mock encryption service
    encryptionService.isEncrypted.mockReturnValue(false);
    encryptionService.decrypt.mockImplementation(val => val);
    
    // Mock the transporter on the service instance
    emailService.transporter = mockTransporter;
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const messageId = 'test-message-id-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const result = await emailService.sendEmail(
        'recipient@test.com',
        'Test Subject',
        '<h1>Test HTML</h1>'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@test.com',
          subject: 'Test Subject',
          html: '<h1>Test HTML</h1>'
        })
      );
      expect(result).toEqual({ success: true, messageId });
    });

    it('should throw error when transporter not configured', async () => {
      // Remove transporter
      emailService.transporter = null;
      
      await expect(
        emailService.sendEmail('test@test.com', 'Subject', 'Body')
      ).rejects.toThrow('Email service not configured');
      
      // Restore transporter
      emailService.transporter = mockTransporter;
    });

    it('should handle sendMail errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        emailService.sendEmail('test@test.com', 'Subject', 'Body')
      ).rejects.toThrow('Failed to send email');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct format', async () => {
      const messageId = 'welcome-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const user = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        role: 'employee'
      };

      const result = await emailService.sendWelcomeEmail(user, 'TempPass123!');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john.doe@test.com',
          subject: expect.stringContaining('Welcome')
        })
      );
      expect(result.success).toBe(true);
    });

    it('should include temporary password in welcome email', async () => {
      const messageId = 'welcome-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const user = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        role: 'hr'
      };

      await emailService.sendWelcomeEmail(user, 'SecureTemp456!');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('SecureTemp456!');
      expect(emailCall.html).toContain('Jane');
    });
  });

  describe('sendPasswordResetWithTempPassword', () => {
    it('should send password reset email', async () => {
      const messageId = 'reset-123';
      mockTransporter.sendMail.mockResolvedValue({ messageId });

      const user = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com'
      };

      const result = await emailService.sendPasswordResetWithTempPassword(
        user,
        'ResetPass789!'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@test.com',
          subject: expect.stringContaining('Password')
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('loadSmtpPassword', () => {
    it('should return environment password when config file missing', () => {
      const fs = require('fs');
      fs.existsSync = jest.fn(() => false);

      process.env.SMTP_PASSWORD = 'env-password';
      const password = emailService.loadSmtpPassword();

      expect(password).toBe('env-password');
    });

    it( 'should decrypt encrypted password from config', () => {
      const fs = require('fs');
      fs.existsSync = jest.fn(() => true);
      fs.readFileSync = jest.fn(() => JSON.stringify({
        smtpPassword: 'encrypted-pass'
      }));

      encryptionService.isEncrypted.mockReturnValue(true);
      encryptionService.decrypt.mockReturnValue('decrypted-pass');

      const password = emailService.loadSmtpPassword();

      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-pass');
      expect(password).toBe('decrypted-pass');
    });
  });

  describe('stripHtml', () => {
    it('should strip HTML tags from content', () => {
      const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong></p>';
      const text = emailService.stripHtml(html);

      expect(text).not.toContain('<h1>');
      expect(text).not.toContain('</h1>');
      expect(text).toContain('Title');
      expect(text).toContain('Paragraph');
    });
  });

  describe('isConfigured', () => {
    it('should return true when transporter is configured', () => {
      emailService.transporter = mockTransporter;
      expect(emailService.isConfigured()).toBe(true);
    });

    it('should return false when transporter is not configured', () => {
      emailService.transporter = null;
      expect(emailService.isConfigured()).toBe(false);
      emailService.transporter = mockTransporter; // Restore
    });
  });
});
