const db = require('../models');

/**
 * Middleware to ensure the Vault DEK is present in the session if the vault is enabled.
 * Attaches `req.vaultDek` buffer for use in controllers.
 */
exports.requireVaultUnlock = async (req, res, next) => {
  try {
    const config = await db.PayrollVaultConfig.findOne();
    if (!config || !config.isEnabled) {
      // Vault is not enabled, pass through normally
      req.vaultEnabled = false;
      return next();
    }

    req.vaultEnabled = true;

    // Strict RBAC: 
    // 1. If designated HR, allow all.
    if (config.designatedHrUserId === req.user.id) {
      return next();
    }

    // 2. If employee asking for their own data, the downstream controller must verify it.
    // SECURITY ARCHITECT RECOMMENDATION: Forcefully inject the employee ID to prevent IDOR.
    // The controllers must merge this into the Sequelize `where` clause if it exists.
    if (!req.user.employeeId) {
      // If the user doesn't have an employeeId (e.g. an Admin without an employee profile),
      // and they are not the designated HR, completely block access to the vault data.
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You must be the Designated HR or have an Employee Profile to view payslips.'
      });
    }

    req.enforcedEmployeeId = req.user.employeeId;
    
    // Inject it into req.employeeId which is the standard field checked by our services
    req.employeeId = req.user.employeeId;
    
    next();
  } catch (error) {
    console.error('Vault Middleware Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Non-blocking middleware to attach vault status to the request.
 * Used for field-level access control on hybrid routes (like Employee profiles).
 */
exports.attachVaultStatus = async (req, res, next) => {
  try {
    const config = await db.PayrollVaultConfig.findOne();
    req.vaultConfig = config || { isEnabled: false };
    next();
  } catch (error) {
    console.error('Attach Vault Status Error:', error);
    req.vaultConfig = { isEnabled: false };
    next();
  }
};
