const crypto = require('crypto');
const db = require('../models');
const VaultCrypto = require('../utils/vaultCrypto');
const ApiResponse = require('../utils/ApiResponse');

exports.getVaultStatus = async (req, res, next) => {
  try {
    const config = await db.PayrollVaultConfig.findOne();
    const isEnabled = config ? config.isEnabled : false;
    
    return res.json(ApiResponse.success({
      isConfigured: !!config,
      isEnabled,
      designatedHrUserId: config ? config.designatedHrUserId : null
    }));
  } catch (error) {
    next(error);
  }
};

exports.setupVault = async (req, res, next) => {
  try {
    let { designatedHrUserId } = req.body;
    if (designatedHrUserId === '') designatedHrUserId = null;
    
    let config = await db.PayrollVaultConfig.findOne();
    if (config && config.isEnabled) {
      return res.status(400).json(ApiResponse.error('Vault is already set up and enabled.'));
    }

    if (!config) {
      config = await db.PayrollVaultConfig.create({
        isEnabled: true,
        designatedHrUserId
      });
    } else {
      await config.update({
        isEnabled: true,
        designatedHrUserId
      });
    }

    return res.json(ApiResponse.success({
      message: 'Vault successfully enabled.'
    }));
  } catch (error) {
    next(error);
  }
};

exports.toggleVault = async (req, res, next) => {
  try {
    let { enable, designatedHrUserId } = req.body;
    if (designatedHrUserId === '') designatedHrUserId = null;
    
    let config = await db.PayrollVaultConfig.findOne();
    if (!config) {
      return res.status(400).json(ApiResponse.error('Vault not configured. Please run setup first.'));
    }

    if (enable) {
      await config.update({ isEnabled: true, designatedHrUserId });
      return res.json(ApiResponse.success({ message: 'Vault enabled.' }));
    } else {
      await config.update({ isEnabled: false });
      return res.json(ApiResponse.success({ message: 'Vault disabled. New data will be stored in plain text.' }));
    }
  } catch (error) {
    next(error);
  }
};
