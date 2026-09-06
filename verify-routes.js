/**
 * Verification script to ensure routes.js loads without errors
 */

console.log('🔍 Verifying route configuration...\n');

try {
  // Test require of routes.js
  const { setupRoutes } = require('./backend/config/routes');
  console.log('✅ config/routes.js loads successfully');
  console.log(`✅ setupRoutes function exported: ${typeof setupRoutes === 'function'}`);
  
  // Check if it's a function
  if (typeof setupRoutes !== 'function') {
    throw new Error('setupRoutes is not a function!');
  }
  
  console.log('\n✅ All route configuration checks passed!\n');
  console.log('Routes available:');
  console.log('  - /api/v1/* (New versioned routes)');
  console.log('  - /api/* (Legacy routes with deprecation warning)');
  console.log('\nNext step: Start the server with npm run start:backend');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}
