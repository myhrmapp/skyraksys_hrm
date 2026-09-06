/**
 * Environment Variable Validator
 * Validates all required environment variables are set
 * 
 * Usage: 
 * - Import at top of server.js: require('./config/validateEnv');
 * - Or run manually: node backend/config/validateEnv.js
 */

const path = require('path');
const fs = require('fs');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Environment variable definitions with validation rules
 */
const envSchema = {
  // Core Application
  NODE_ENV: {
    required: true,
    type: 'string',
    values: ['development', 'test', 'staging', 'production'],
    description: 'Application environment'
  },
  PORT: {
    required: true,
    type: 'number',
    min: 1000,
    max: 65535,
    default: 5000,
    description: 'Server port'
  },

  // Production secrets / weak-default guardrails
  SEED_DEFAULT_PASSWORD: {
    required: false,
    type: 'string',
    minLength: 12,
    sensitive: true,
    requiredInProduction: true,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /admin123/i, /change_me/i, /changeme/i, /password$/i, /skyraskyshrsecret/i],
    description: 'Bootstrap admin password for seeded environments'
  },
  INVOICE_SECRET_PHRASE: {
    required: false,
    type: 'string',
    minLength: 12,
    sensitive: true,
    requiredInProduction: true,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /example/i, /default/i, /secret$/i, /skyraskyshrsecret/i, /admin123/i],
    description: 'Invoice encryption secret phrase'
  },
  
  // Database Configuration
  DB_HOST: {
    required: true,
    type: 'string',
    description: 'Database host'
  },
  DB_PORT: {
    required: false,
    type: 'number',
    default: 5432,
    description: 'Database port'
  },
  DB_NAME: {
    required: true,
    type: 'string',
    description: 'Database name'
  },
  DB_USER: {
    required: true,
    type: 'string',
    description: 'Database username'
  },
  DB_PASSWORD: {
    required: true,
    type: 'string',
    sensitive: true,
    minLength: 1,
    description: 'Database password'
  },
  
  // JWT Configuration
  JWT_SECRET: {
    required: true,
    type: 'string',
    sensitive: true,
    minLength: 32,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /change_me/i, /changeme/i, /example/i, /default/i],
    description: 'JWT secret key (min 32 chars)'
  },
  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    sensitive: true,
    minLength: 32,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /change_me/i, /changeme/i, /example/i, /default/i],
    description: 'JWT refresh token secret (min 32 chars)'
  },
  JWT_EXPIRES_IN: {
    required: false,
    type: 'string',
    default: '15m',
    description: 'JWT access token expiry'
  },
  JWT_REFRESH_EXPIRES_IN: {
    required: false,
    type: 'string',
    default: '7d',
    description: 'JWT refresh token expiry'
  },
  
  // Encryption
  ENCRYPTION_KEY: {
    required: true,
    type: 'string',
    sensitive: true,
    length: 64,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /change_me/i, /changeme/i, /example/i, /default/i],
    description: 'AES-256 encryption key (64 hex chars)'
  },
  PAYROLL_VAULT_KEY: {
    required: false,
    type: 'string',
    sensitive: true,
    minLength: 32,
    requiredInProduction: true,
    forbiddenPatterns: [/REPLACE_WITH_/i, /your-/i, /change_me/i, /changeme/i, /example/i, /default/i, /admin123/i],
    description: 'Production vault key for encrypting payroll and salary data'
  },
  
  // Frontend
  FRONTEND_URL: {
    required: false,
    type: 'url',
    default: 'http://localhost:3000',
    description: 'Frontend URL for CORS'
  },
  
  // Email (optional but recommended for production)
  SMTP_HOST: {
    required: false,
    type: 'string',
    requiredInProduction: true,
    description: 'SMTP server host'
  },
  SMTP_PORT: {
    required: false,
    type: 'number',
    default: 587,
    description: 'SMTP server port'
  },
  SMTP_USER: {
    required: false,
    type: 'string',
    requiredInProduction: true,
    description: 'SMTP username'
  },
  SMTP_PASSWORD: {
    required: false,
    type: 'string',
    sensitive: true,
    requiredInProduction: true,
    description: 'SMTP password'
  },
  SMTP_FROM: {
    required: false,
    type: 'string',
    default: 'noreply@skyraksys.com',
    description: 'Email from address'
  }
};

/**
 * Validation results
 */
const results = {
  passed: [],
  failed: [],
  warnings: [],
  missing: [],
  invalid: []
};

function resetResults() {
  results.passed = [];
  results.failed = [];
  results.warnings = [];
  results.missing = [];
  results.invalid = [];
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(name, rules) {
  const value = process.env[name];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if required
  const isRequired = rules.required || (rules.requiredInProduction && isProduction);
  
  if (!value) {
    if (isRequired) {
      results.missing.push({
        name,
        description: rules.description,
        default: rules.default
      });
      return false;
    } else if (rules.default) {
      results.warnings.push({
        name,
        message: `Using default: ${rules.sensitive ? '[HIDDEN]' : rules.default}`,
        description: rules.description
      });
      return true;
    } else {
      results.warnings.push({
        name,
        message: 'Not set (optional)',
        description: rules.description
      });
      return true;
    }
  }
  
  // Type validation
  if (rules.type === 'number') {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      results.invalid.push({
        name,
        value: rules.sensitive ? '[HIDDEN]' : value,
        error: 'Must be a number'
      });
      return false;
    }
    
    if (rules.min !== undefined && num < rules.min) {
      results.invalid.push({
        name,
        value: num,
        error: `Must be >= ${rules.min}`
      });
      return false;
    }
    
    if (rules.max !== undefined && num > rules.max) {
      results.invalid.push({
        name,
        value: num,
        error: `Must be <= ${rules.max}`
      });
      return false;
    }
  }
  
  // String validation
  if (rules.type === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      results.invalid.push({
        name,
        value: rules.sensitive ? '[HIDDEN]' : value,
        error: `Must be at least ${rules.minLength} characters`
      });
      return false;
    }
    
    if (rules.length && value.length !== rules.length) {
      results.invalid.push({
        name,
        value: rules.sensitive ? '[HIDDEN]' : value,
        error: `Must be exactly ${rules.length} characters`
      });
      return false;
    }

    if (rules.forbiddenPatterns && Array.isArray(rules.forbiddenPatterns)) {
      const matchedPattern = rules.forbiddenPatterns.find((pattern) => pattern.test(value));
      if (matchedPattern) {
        results.invalid.push({
          name,
          value: rules.sensitive ? '[HIDDEN]' : value,
          error: 'Contains placeholder or unsafe default content'
        });
        return false;
      }
    }
    
    if (rules.values && !rules.values.includes(value)) {
      results.invalid.push({
        name,
        value,
        error: `Must be one of: ${rules.values.join(', ')}`
      });
      return false;
    }
  }
  
  // URL validation
  if (rules.type === 'url') {
    try {
      new URL(value);
    } catch (e) {
      results.invalid.push({
        name,
        value,
        error: 'Must be a valid URL'
      });
      return false;
    }
  }
  
  results.passed.push({
    name,
    value: rules.sensitive ? '[HIDDEN]' : value
  });
  return true;
}

/**
 * Run validation
 */
function validate() {
  resetResults();

  console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}   Environment Variable Validation${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  console.log(`Environment: ${colors.bold}${process.env.NODE_ENV || 'NOT SET'}${colors.reset}\n`);
  
  // Validate each variable
  Object.entries(envSchema).forEach(([name, rules]) => {
    validateEnvVar(name, rules);
  });
  
  // Display results
  if (results.passed.length > 0) {
    console.log(`${colors.green}${colors.bold}✅ Valid (${results.passed.length})${colors.reset}`);
    results.passed.forEach(({ name, value }) => {
      console.log(`   ${colors.green}✓${colors.reset} ${name}: ${value}`);
    });
    console.log('');
  }
  
  if (results.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Warnings (${results.warnings.length})${colors.reset}`);
    results.warnings.forEach(({ name, message, description }) => {
      console.log(`   ${colors.yellow}⚠${colors.reset} ${name}: ${message}`);
      if (description) {
        console.log(`     ${colors.yellow}→${colors.reset} ${description}`);
      }
    });
    console.log('');
  }
  
  if (results.missing.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Missing Required (${results.missing.length})${colors.reset}`);
    results.missing.forEach(({ name, description, default: def }) => {
      console.log(`   ${colors.red}✗${colors.reset} ${name}`);
      console.log(`     ${colors.red}→${colors.reset} ${description}`);
      if (def) {
        console.log(`     ${colors.yellow}→${colors.reset} Default available: ${def}`);
      }
    });
    console.log('');
  }
  
  if (results.invalid.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Invalid (${results.invalid.length})${colors.reset}`);
    results.invalid.forEach(({ name, value, error }) => {
      console.log(`   ${colors.red}✗${colors.reset} ${name}: ${value}`);
      console.log(`     ${colors.red}→${colors.reset} ${error}`);
    });
    console.log('');
  }
  
  // Summary
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const total = Object.keys(envSchema).length;
  console.log(`Total variables: ${total}`);
  console.log(`${colors.green}✅ Valid: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings.length}${colors.reset}`);
  console.log(`${colors.red}❌ Missing: ${results.missing.length}${colors.reset}`);
  console.log(`${colors.red}❌ Invalid: ${results.invalid.length}${colors.reset}\n`);
  
  // Final verdict
  const hasErrors = results.missing.length > 0 || results.invalid.length > 0;
  
  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.red}Fix the errors above before starting the server.${colors.reset}\n`);
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log(`${colors.yellow}⚠️  Development mode: Server will continue but may have issues.${colors.reset}\n`);
    }
  } else if (results.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Review warnings above - some features may not work.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL CHECKS PASSED${colors.reset}\n`);
  }
  
  return !hasErrors;
}

// Run validation if executed directly
if (require.main === module) {
  validate();
} else {
  // Export for use as module
  function validateAndExit() {
    const isValid = validate();
    if (!isValid) {
      process.exit(1);
    }
  }

  module.exports = { validate, validateAndExit, envSchema };
}
