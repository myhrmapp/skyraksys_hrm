const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../models');

async function runSetup() {
  try {
    await db.sequelize.authenticate();
    console.log('[Test Setup] Database connection authenticated successfully.');

    // Enforce E2E Test State Requirements
    const [leaveTypes, notifications] = await Promise.all([
      db.LeaveType.update(
        { isActive: true }, 
        { where: { name: 'Casual Leave' } }
      ),
      db.Notification.update(
        { isPopup: false }, 
        { where: { isPopup: true } }
      )
    ]);

    console.log(`[Test Setup] Enforced Active status for 'Casual Leave' (Rows updated: ${leaveTypes[0]})`);
    console.log(`[Test Setup] Disabled active Broadcast Popups (Rows updated: ${notifications[0]})`);
    
    console.log('[Test Setup] E2E Database State Sanitization Complete.');
    process.exit(0);
  } catch (error) {
    console.error('[Test Setup] Failed to sanitize database:', error);
    process.exit(1);
  }
}

runSetup();
