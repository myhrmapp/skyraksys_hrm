const nodemailer = require('nodemailer');
const encryptionService = require('../utils/encryption');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'noreply@skyraksys.com';
    this.initializeTransporter();
  }

  /**
   * Load SMTP password from config file or environment
   * Decrypts password if stored in encrypted format
   */
  loadSmtpPassword() {
    // Try to load from config file first
    const configPath = path.join(__dirname, '../config/email.config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // Check if password is encrypted
        if (encryptionService.isEncrypted(config.smtpPassword)) {
          // 🔓 DECRYPT PASSWORD AT RUNTIME (Phase 1, Week 1)
          return encryptionService.decrypt(config.smtpPassword);
        }
        
        // Legacy: plaintext password (will be migrated)
        if (typeof config.smtpPassword === 'string') {
          logger.warn('SMTP password stored in plaintext. Please re-save via Admin panel to encrypt.');
          return config.smtpPassword;
        }
      }
    } catch (error) {
      logger.error('Error loading email config:', { detail: error.message });
    }
    
    // Fallback to environment variable
    return process.env.SMTP_PASSWORD;
  }

  initializeTransporter() {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env');
      return;
    }

    try {
      // Load and decrypt password
      const smtpPassword = this.loadSmtpPassword();
      
      if (!smtpPassword) {
        logger.warn('SMTP password not found in config or environment');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword // Use decrypted password
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service connection failed:', { detail: error.message });
        } else {
          logger.info('Email service ready');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service:', { detail: error.message });
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set SMTP credentials in .env file.');
    }

    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', { detail: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email:', { detail: error.message });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(user, tempPassword) {
    const subject = 'Welcome to SkyRakSys HRM System';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8fafc;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .credentials-box {
            background: white;
            border: 2px solid #6366f1;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .credential-row:last-child {
            border-bottom: none;
          }
          .credential-label {
            font-weight: 600;
            color: #64748b;
          }
          .credential-value {
            font-family: 'Courier New', monospace;
            background: #f1f5f9;
            padding: 5px 10px;
            border-radius: 4px;
            color: #1e293b;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">🎉 Welcome to SkyRakSys HRM!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Your user account has been successfully created. You can now access the SkyRakSys Human Resources Management System.</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #6366f1;">📝 Your Login Credentials</h3>
            <div class="credential-row">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${user.email}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Temporary Password:</span>
              <span class="credential-value">${tempPassword}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Role:</span>
              <span class="credential-value">${(user.role || 'USER').toUpperCase()}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> For security reasons, you will be required to change your password after your first login.
          </div>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://95.216.14.232'}" class="button">
              Login Now →
            </a>
          </center>

          <h3>🚀 Getting Started</h3>
          <ol>
            <li>Click the "Login Now" button above or visit the application URL</li>
            <li>Enter your email and temporary password</li>
            <li>You'll be prompted to create a new secure password</li>
            <li>Start exploring the system!</li>
          </ol>

          <h3>📞 Need Help?</h3>
          <p>If you have any questions or need assistance, please contact your HR administrator or IT support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from SkyRakSys HRM System</p>
          <p>© ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendPasswordResetWithTempPassword(user, tempPassword) {
    const subject = 'Password Reset - SkyRakSys HRM';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8fafc;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .credentials-box {
            background: white;
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .credential-row:last-child {
            border-bottom: none;
          }
          .credential-label {
            font-weight: 600;
            color: #64748b;
          }
          .credential-value {
            font-family: 'Courier New', monospace;
            background: #fef2f2;
            padding: 5px 10px;
            border-radius: 4px;
            color: #991b1b;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">🔐 Password Reset</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Your password has been reset by an administrator. Use the temporary password below to log in.</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #ef4444;">🔑 Your New Temporary Password</h3>
            <div class="credential-row">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${user.email}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Temporary Password:</span>
              <span class="credential-value">${tempPassword}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong> You must change this temporary password immediately after logging in. This is for your account security.
          </div>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://95.216.14.232'}" class="button">
              Login Now →
            </a>
          </center>

          <h3>🔒 Security Tips</h3>
          <ul>
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication if available</li>
            <li>Report any suspicious activity immediately</li>
          </ul>

          <p><strong>Did you not request this password reset?</strong><br>
          Please contact your administrator immediately as your account security may be compromised.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from SkyRakSys HRM System</p>
          <p>© ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendAccountStatusChangeEmail(user, isActive) {
    const subject = `Account ${isActive ? 'Activated' : 'Deactivated'} - SkyRakSys HRM`;
    const color = isActive ? '#10b981' : '#64748b';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: ${color};
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8fafc;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .footer {
            text-align: center;
            color: #64748b;
            font-size: 12px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">${isActive ? '✅' : '🔒'} Account ${isActive ? 'Activated' : 'Deactivated'}</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Your SkyRakSys HRM account has been <strong>${isActive ? 'activated' : 'deactivated'}</strong> by an administrator.</p>
          
          ${isActive ? 
            '<p>You can now log in and access the system with your existing credentials.</p>' :
            '<p>You will not be able to log in until your account is reactivated. Please contact your administrator if you believe this is an error.</p>'
          }
        </div>
        <div class="footer">
          <p>This is an automated message from SkyRakSys HRM System</p>
          <p>© ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Send password reset email with secure token link
   * @param {string} email - User email address
   * @param {Object} data - Reset data { name, resetLink, expiresAt, expiresIn }
   * @returns {Promise} Email send result
   */
  async sendPasswordResetEmail(email, data) {
    const templatePath = path.join(__dirname, '../templates/password-reset-email.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace template variables
    const replacements = {
      '{{name}}': data.name || 'User',
      '{{resetLink}}': data.resetLink,
      '{{expiresAt}}': data.expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
      '{{expiresIn}}': data.expiresIn || '1 hour',
      '{{year}}': new Date().getFullYear()
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key, 'g');
      html = html.replace(regex, replacements[key]);
    });

    const subject = '🔐 Password Reset Request - SkyRaksys HRM';

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send leave status notification to employee
   * @param {string} employeeEmail
   * @param {string} employeeName
   * @param {Object} leaveDetails - { leaveType, startDate, endDate, totalDays, comments }
   * @param {string} newStatus - 'Approved' | 'Rejected' | 'Cancelled'
   * @param {string} [approverName] - Name of who approved/rejected
   */
  async sendLeaveStatusEmail(employeeEmail, employeeName, leaveDetails, newStatus, approverName = '') {
    if (!this.isConfigured()) return null;

    const statusConfig = {
      'Approved': { color: '#10b981', icon: '✅', verb: 'approved' },
      'Rejected': { color: '#ef4444', icon: '❌', verb: 'rejected' },
      'Cancelled': { color: '#64748b', icon: '🚫', verb: 'cancelled' },
    };
    const cfg = statusConfig[newStatus] || { color: '#6366f1', icon: '📋', verb: 'updated' };

    const subject = `Leave Request ${cfg.verb.charAt(0).toUpperCase() + cfg.verb.slice(1)} - SkyRakSys HRM`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${cfg.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e5e7eb; }
        .detail-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #64748b; }
        .value { color: #1e293b; }
        .footer { text-align: center; color: #64748b; font-size: 12px; padding: 20px; border-top: 1px solid #e5e7eb; }
      </style></head><body>
        <div class="header"><h1 style="margin:0;">${cfg.icon} Leave Request ${cfg.verb.charAt(0).toUpperCase() + cfg.verb.slice(1)}</h1></div>
        <div class="content">
          <p>Hello <strong>${employeeName}</strong>,</p>
          <p>Your leave request has been <strong>${cfg.verb}</strong>${approverName ? ` by ${approverName}` : ''}.</p>
          <div class="detail-box">
            <div class="detail-row"><span class="label">Leave Type:</span><span class="value">${leaveDetails.leaveType || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Period:</span><span class="value">${leaveDetails.startDate} to ${leaveDetails.endDate}</span></div>
            <div class="detail-row"><span class="label">Total Days:</span><span class="value">${leaveDetails.totalDays || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Status:</span><span class="value" style="color:${cfg.color};font-weight:600;">${newStatus}</span></div>
            ${leaveDetails.comments ? `<div class="detail-row"><span class="label">Comments:</span><span class="value">${leaveDetails.comments}</span></div>` : ''}
          </div>
        </div>
        <div class="footer"><p>This is an automated notification from SkyRakSys HRM System</p><p>&copy; ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p></div>
      </body></html>
    `;

    try {
      return await this.sendEmail(employeeEmail, subject, html);
    } catch (error) {
      logger.warn('Failed to send leave status email:', { detail: error.message });
      return null;
    }
  }

  /**
   * Send timesheet status notification to employee
   * @param {string} employeeEmail
   * @param {string} employeeName
   * @param {Object} timesheetDetails - { weekStart, totalHours, comments }
   * @param {string} newStatus - 'Approved' | 'Rejected'
   * @param {string} [approverName]
   */
  async sendTimesheetStatusEmail(employeeEmail, employeeName, timesheetDetails, newStatus, approverName = '') {
    if (!this.isConfigured()) return null;

    const isApproved = newStatus === 'Approved';
    const color = isApproved ? '#10b981' : '#ef4444';
    const icon = isApproved ? '✅' : '❌';
    const verb = isApproved ? 'approved' : 'rejected';

    const subject = `Timesheet ${verb.charAt(0).toUpperCase() + verb.slice(1)} - SkyRakSys HRM`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e5e7eb; }
        .detail-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #64748b; }
        .value { color: #1e293b; }
        .footer { text-align: center; color: #64748b; font-size: 12px; padding: 20px; border-top: 1px solid #e5e7eb; }
      </style></head><body>
        <div class="header"><h1 style="margin:0;">${icon} Timesheet ${verb.charAt(0).toUpperCase() + verb.slice(1)}</h1></div>
        <div class="content">
          <p>Hello <strong>${employeeName}</strong>,</p>
          <p>Your timesheet has been <strong>${verb}</strong>${approverName ? ` by ${approverName}` : ''}.</p>
          <div class="detail-box">
            <div class="detail-row"><span class="label">Week Starting:</span><span class="value">${timesheetDetails.weekStart || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Total Hours:</span><span class="value">${timesheetDetails.totalHours || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Status:</span><span class="value" style="color:${color};font-weight:600;">${newStatus}</span></div>
            ${timesheetDetails.comments ? `<div class="detail-row"><span class="label">Comments:</span><span class="value">${timesheetDetails.comments}</span></div>` : ''}
          </div>
          ${!isApproved ? '<p>Please review the comments and resubmit your timesheet if needed.</p>' : ''}
        </div>
        <div class="footer"><p>This is an automated notification from SkyRakSys HRM System</p><p>&copy; ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p></div>
      </body></html>
    `;

    try {
      return await this.sendEmail(employeeEmail, subject, html);
    } catch (error) {
      logger.warn('Failed to send timesheet status email:', { detail: error.message });
      return null;
    }
  }

  /**
   * Send payslip notification to employee
   * @param {string} employeeEmail
   * @param {string} employeeName
   * @param {Object} payslipDetails - { month, year, netSalary, currency }
   * @param {string} status - 'finalized' | 'paid'
   */
  async sendPayslipNotificationEmail(employeeEmail, employeeName, payslipDetails, status) {
    if (!this.isConfigured()) return null;

    const isPaid = status === 'paid';
    const color = isPaid ? '#10b981' : '#6366f1';
    const icon = isPaid ? '💰' : '📄';
    const statusLabel = isPaid ? 'Payment Processed' : 'Payslip Available';

    const subject = `${statusLabel} - ${payslipDetails.month || ''} ${payslipDetails.year || ''} - SkyRakSys HRM`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${color} 0%, ${isPaid ? '#059669' : '#8b5cf6'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e5e7eb; }
        .detail-box { background: white; border: 2px solid ${color}; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #64748b; }
        .value { color: #1e293b; }
        .amount { font-size: 1.4em; font-weight: 700; color: ${color}; }
        .button { display: inline-block; background: linear-gradient(135deg, ${color} 0%, ${isPaid ? '#059669' : '#8b5cf6'} 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 12px; padding: 20px; border-top: 1px solid #e5e7eb; }
      </style></head><body>
        <div class="header"><h1 style="margin:0;">${icon} ${statusLabel}</h1></div>
        <div class="content">
          <p>Hello <strong>${employeeName}</strong>,</p>
          <p>${isPaid ? 'Your salary has been processed and disbursed.' : 'Your payslip is now available for review.'}</p>
          <div class="detail-box">
            <div class="detail-row"><span class="label">Period:</span><span class="value">${payslipDetails.month || ''} ${payslipDetails.year || ''}</span></div>
            ${payslipDetails.netSalary ? `<div class="detail-row"><span class="label">Net Salary:</span><span class="amount">${payslipDetails.currency || 'THB'} ${Number(payslipDetails.netSalary).toLocaleString()}</span></div>` : ''}
            <div class="detail-row"><span class="label">Status:</span><span class="value" style="color:${color};font-weight:600;">${statusLabel}</span></div>
          </div>
          <center><a href="${process.env.FRONTEND_URL || 'http://95.216.14.232'}/payslips" class="button">View Payslip →</a></center>
        </div>
        <div class="footer"><p>This is an automated notification from SkyRakSys HRM System</p><p>&copy; ${new Date().getFullYear()} SkyRakSys. All rights reserved.</p></div>
      </body></html>
    `;

    try {
      return await this.sendEmail(employeeEmail, subject, html);
    } catch (error) {
      logger.warn('Failed to send payslip notification email:', { detail: error.message });
      return null;
    }
  }

  // Utility function to strip HTML tags for plain text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Check if email service is configured
  isConfigured() {
    return this.transporter !== null;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
