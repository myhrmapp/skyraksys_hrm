/**
 * DEPRECATED — This file now re-exports from config.js (the single source of truth).
 * All query logging, SSL, and pool settings have been consolidated into config.js.
 * Kept for backward compatibility with utility scripts that import this path.
 */
module.exports = require('./config.js');
