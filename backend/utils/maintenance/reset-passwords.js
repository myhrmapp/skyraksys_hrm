// Check user passwords and reset them if needed
const bcrypt = require('bcryptjs');
const { User } = require('./models');

// SAFETY: Prevent accidental execution in production
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ FATAL: reset-passwords.js cannot be run in production!');
  process.exit(1);
}

const RESET_PASSWORD = process.env.DEV_DEFAULT_PASSWORD || 'DevReset@2026!';

async function checkAndResetPasswords() {
  console.log('\n=== Checking User Passwords ===\n');
  console.log(`ℹ️  Will reset passwords to DEV_DEFAULT_PASSWORD env var (or default dev password)\n`);

  try {
    const users = await User.findAll();
    
    console.log(`Found ${users.length} users:`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (${user.role})`);
      
      if (!user.password) {
        console.log(`   No password set - setting dev reset password`);
        const hashedPassword = await bcrypt.hash(RESET_PASSWORD, 12);
        await user.update({ password: hashedPassword });
        console.log(`   ✅ Password set`);
      } else {
        // Try to check if reset password already works
        const isValidPassword = await bcrypt.compare(RESET_PASSWORD, user.password);
        console.log(`   Current reset password works: ${isValidPassword}`);
        
        if (!isValidPassword) {
          // Reset password
          const hashedPassword = await bcrypt.hash(RESET_PASSWORD, 12);
          await user.update({ password: hashedPassword });
          console.log(`   ✅ Password reset`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking passwords:', error.message);
  }
}

checkAndResetPasswords().then(() => {
  console.log('\n🎉 Password check completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});