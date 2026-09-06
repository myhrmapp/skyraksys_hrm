const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('Starting Global Setup...');
  const backendDir = path.resolve(__dirname, '../../../backend');
  try {
    console.log('Running robust backend setup script...');
    execSync('node scripts/test-setup.js', { cwd: backendDir, stdio: 'inherit' });
    console.log('Global Setup completed successfully.');
  } catch (error) {
    console.error('Failed to run global setup:', error.message);
  }
};
