const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/status', authenticateToken, vaultController.getVaultStatus);
router.post('/setup', authenticateToken, authorize('admin'), vaultController.setupVault);
router.post('/toggle', authenticateToken, authorize('admin', 'hr'), vaultController.toggleVault);

module.exports = router;
