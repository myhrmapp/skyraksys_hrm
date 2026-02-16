/**
 * Encryption Utility - AES-256-GCM
 * 
 * Purpose: Secure encryption/decryption of sensitive data (passwords, API keys, etc.)
 * Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
 * 
 * Security Features:
 * - 256-bit encryption key
 * - Galois/Counter Mode (GCM) for authenticated encryption
 * - Random IV (Initialization Vector) for each encryption
 * - Authentication tag to detect tampering
 * 
 * Usage:
 *   const encryptionService = require('./utils/encryption');
 *   
 *   // Encrypt
 *   const encrypted = encryptionService.encrypt('myPassword123');
 *   // Store encrypted object: { encrypted, iv, authTag }
 *   
 *   // Decrypt
 *   const decrypted = encryptionService.decrypt(encrypted);
 *   // Returns: 'myPassword123'
 * 
 * Created: February 5, 2026 (Phase 1, Week 1)
 * Author: Development Team
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Use environment variable for encryption key (32 bytes for AES-256)
    // If not set, derive from JWT_SECRET (for backward compatibility)
    if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
      throw new Error('FATAL: ENCRYPTION_KEY environment variable must be set in production (64-char hex string)');
    }

    if (process.env.ENCRYPTION_KEY) {
      this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    } else if (process.env.JWT_SECRET) {
      // Derive from JWT_SECRET — keep same derivation as original for backward compatibility
      // In production, ENCRYPTION_KEY is required (guarded above), so this path is dev/test only
      this.encryptionKey = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
    } else if (process.env.NODE_ENV === 'test') {
      // Test-only fallback
      this.encryptionKey = crypto.scryptSync('test-encryption-key', 'salt', 32);
    } else {
      throw new Error('FATAL: Either ENCRYPTION_KEY or JWT_SECRET must be set. Cannot start without encryption key.');
    }

    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // 128-bit IV for GCM
    this.authTagLength = 16; // 128-bit authentication tag
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * 
   * @param {string} text - Plaintext to encrypt
   * @returns {Object} - { encrypted, iv, authTag } - All as hex strings
   * @throws {Error} If encryption fails
   * 
   * @example
   *   const encrypted = encryptionService.encrypt('myPassword');
   *   // Returns: { encrypted: '3f2a...', iv: '9b4c...', authTag: '1e5d...' }
   */
  encrypt(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text to encrypt must be a non-empty string');
      }

      // Generate random IV for this encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (prevents tampering)
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('[ENCRYPTION ERROR]', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted data using AES-256-GCM
   * 
   * @param {Object} encryptedData - { encrypted, iv, authTag } - All as hex strings
   * @returns {string} - Decrypted plaintext
   * @throws {Error} If decryption fails or data is tampered
   * 
   * @example
   *   const decrypted = encryptionService.decrypt({
   *     encrypted: '3f2a...',
   *     iv: '9b4c...',
   *     authTag: '1e5d...'
   *   });
   *   // Returns: 'myPassword'
   */
  decrypt(encryptedData) {
    try {
      // Validate input
      if (!encryptedData || typeof encryptedData !== 'object') {
        throw new Error('Invalid encrypted data object');
      }

      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Encrypted data must contain: encrypted, iv, authTag');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );

      // Set authentication tag (will fail if data was tampered)
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      // Decrypt
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[DECRYPTION ERROR]', error.message);
      
      // More specific error for tampering
      if (error.message.includes('Unsupported state') || error.message.includes('auth')) {
        throw new Error('Decryption failed: Data may have been tampered with');
      }
      
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Check if data is encrypted (has required structure)
   * 
   * @param {*} data - Data to check
   * @returns {boolean} - True if data appears to be encrypted
   * 
   * @example
   *   const isEncrypted = encryptionService.isEncrypted(someData);
   *   if (!isEncrypted) {
   *     // Need to encrypt this data
   *   }
   */
  isEncrypted(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    return (
      typeof data.encrypted === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.authTag === 'string'
    );
  }

  /**
   * Encrypt object properties selectively
   * 
   * @param {Object} obj - Object with plaintext properties
   * @param {string[]} fieldsToEncrypt - Array of property names to encrypt
   * @returns {Object} - New object with specified fields encrypted
   * 
   * @example
   *   const config = {
   *     smtpHost: 'smtp.gmail.com',
   *     smtpUser: 'user@example.com',
   *     smtpPassword: 'plaintext123'
   *   };
   *   
   *   const encrypted = encryptionService.encryptFields(config, ['smtpPassword']);
   *   // config.smtpPassword is now { encrypted, iv, authTag }
   */
  encryptFields(obj, fieldsToEncrypt) {
    const result = { ...obj };

    fieldsToEncrypt.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field]);
      }
    });

    return result;
  }

  /**
   * Decrypt object properties selectively
   * 
   * @param {Object} obj - Object with encrypted properties
   * @param {string[]} fieldsToDecrypt - Array of property names to decrypt
   * @returns {Object} - New object with specified fields decrypted
   * 
   * @example
   *   const decrypted = encryptionService.decryptFields(config, ['smtpPassword']);
   *   // config.smtpPassword is now plaintext string
   */
  decryptFields(obj, fieldsToDecrypt) {
    const result = { ...obj };

    fieldsToDecrypt.forEach(field => {
      if (this.isEncrypted(result[field])) {
        result[field] = this.decrypt(result[field]);
      }
    });

    return result;
  }
}

// Export singleton instance
module.exports = new EncryptionService();
