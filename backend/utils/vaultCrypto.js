const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

class VaultCrypto {
  /**
   * Derive a 256-bit key from a plaintext password/phrase using PBKDF2.
   * In a real system, the salt would be stored per-user. We'll use a fixed salt for simplicity here.
   */
  static deriveKey(password, salt = 'SKYRAKSYS_SECURE_SALT_2026') {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  /**
   * Retrieves the 256-bit derived Server Key from the .env file.
   */
  static getServerKey() {
    const secret = process.env.PAYROLL_VAULT_KEY || 'DEFAULT_INSECURE_DEV_KEY_DO_NOT_USE_IN_PROD';
    return VaultCrypto.deriveKey(secret, 'SKYRAKSYS_SERVER_SALT');
  }

  /**
   * Encrypt a JSON payload using the given 256-bit key buffer (defaults to Server Key).
   */
  static encryptPayload(payload, keyBuffer = VaultCrypto.getServerKey()) {
    if (!keyBuffer || keyBuffer.length !== KEY_LENGTH) {
      throw new Error('Invalid key length for AES-256-GCM');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  /**
   * Decrypt a payload using the given 256-bit key buffer (defaults to Server Key).
   */
  static decryptPayload(encryptedData, ivBase64, authTagBase64, keyBuffer = VaultCrypto.getServerKey()) {
    if (!keyBuffer || keyBuffer.length !== KEY_LENGTH) {
      throw new Error('Invalid key length for AES-256-GCM');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

module.exports = VaultCrypto;
