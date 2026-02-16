/**
 * Unit Tests: Encryption Service
 * 
 * Tests AES-256-GCM encryption/decryption functionality
 * 
 * Created: February 5, 2026 (Phase 1, Week 1, Day 1-2)
 */

const encryptionService = require('../../../utils/encryption');

describe('EncryptionService', () => {
  describe('encrypt()', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'mySecretPassword123';
      const encrypted = encryptionService.encrypt(plaintext);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(typeof encrypted.encrypted).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.authTag).toBe('string');
    });

    it('should produce different IV for each encryption', () => {
      const plaintext = 'samePassword';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);
      
      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to same plaintext
      const decrypted1 = encryptionService.decrypt(encrypted1);
      const decrypted2 = encryptionService.decrypt(encrypted2);
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should throw error for empty string', () => {
      expect(() => {
        encryptionService.encrypt('');
      }).toThrow('Text to encrypt must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => {
        encryptionService.encrypt(12345);
      }).toThrow('Text to encrypt must be a non-empty string');
    });

    it('should throw error for null input', () => {
      expect(() => {
        encryptionService.encrypt(null);
      }).toThrow('Text to encrypt must be a non-empty string');
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data correctly', () => {
      const plaintext = 'SuperSecret123!@#';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '密码🔐パスワード';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for tampered encrypted data', () => {
      const encrypted = encryptionService.encrypt('test');
      
      // Tamper with encrypted data
      encrypted.encrypted = encrypted.encrypted.substring(0, encrypted.encrypted.length - 2) + '00';
      
      expect(() => {
        encryptionService.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encryptionService.encrypt('test');
      
      // Tamper with auth tag
      encrypted.authTag = '0'.repeat(32);
      
      expect(() => {
        encryptionService.decrypt(encrypted);
      }).toThrow('Data may have been tampered with');
    });

    it('should throw error for invalid encrypted object', () => {
      expect(() => {
        encryptionService.decrypt({ invalid: 'object' });
      }).toThrow('Decryption failed');
    });

    it('should throw error for null input', () => {
      expect(() => {
        encryptionService.decrypt(null);
      }).toThrow('Invalid encrypted data object');
    });

    it('should throw error for string input', () => {
      expect(() => {
        encryptionService.decrypt('not-an-object');
      }).toThrow('Invalid encrypted data object');
    });
  });

  describe('isEncrypted()', () => {
    it('should return true for encrypted data', () => {
      const encrypted = encryptionService.encrypt('test');
      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext string', () => {
      expect(encryptionService.isEncrypted('plaintext')).toBe(false);
    });

    it('should return false for null', () => {
      expect(encryptionService.isEncrypted(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(encryptionService.isEncrypted(undefined)).toBe(false);
    });

    it('should return false for incomplete encrypted object', () => {
      expect(encryptionService.isEncrypted({ encrypted: 'abc' })).toBe(false);
      expect(encryptionService.isEncrypted({ encrypted: 'abc', iv: '123' })).toBe(false);
    });
  });

  describe('encryptFields()', () => {
    it('should encrypt specified fields only', () => {
      const obj = {
        username: 'admin',
        password: 'secret123',
        email: 'admin@example.com'
      };
      
      const encrypted = encryptionService.encryptFields(obj, ['password']);
      
      expect(encrypted.username).toBe('admin');
      expect(encrypted.email).toBe('admin@example.com');
      expect(encryptionService.isEncrypted(encrypted.password)).toBe(true);
    });

    it('should handle multiple fields', () => {
      const obj = {
        apiKey: 'key123',
        apiSecret: 'secret456',
        publicData: 'visible'
      };
      
      const encrypted = encryptionService.encryptFields(obj, ['apiKey', 'apiSecret']);
      
      expect(encrypted.publicData).toBe('visible');
      expect(encryptionService.isEncrypted(encrypted.apiKey)).toBe(true);
      expect(encryptionService.isEncrypted(encrypted.apiSecret)).toBe(true);
    });

    it('should skip non-existent fields', () => {
      const obj = { field1: 'value1' };
      const encrypted = encryptionService.encryptFields(obj, ['field1', 'field2']);
      
      expect(encryptionService.isEncrypted(encrypted.field1)).toBe(true);
      expect(encrypted.field2).toBeUndefined();
    });
  });

  describe('decryptFields()', () => {
    it('should decrypt specified fields only', () => {
      const obj = {
        username: 'admin',
        password: encryptionService.encrypt('secret123'),
        email: 'admin@example.com'
      };
      
      const decrypted = encryptionService.decryptFields(obj, ['password']);
      
      expect(decrypted.username).toBe('admin');
      expect(decrypted.email).toBe('admin@example.com');
      expect(decrypted.password).toBe('secret123');
    });

    it('should handle multiple fields', () => {
      const obj = {
        apiKey: encryptionService.encrypt('key123'),
        apiSecret: encryptionService.encrypt('secret456'),
        publicData: 'visible'
      };
      
      const decrypted = encryptionService.decryptFields(obj, ['apiKey', 'apiSecret']);
      
      expect(decrypted.publicData).toBe('visible');
      expect(decrypted.apiKey).toBe('key123');
      expect(decrypted.apiSecret).toBe('secret456');
    });

    it('should skip plaintext fields', () => {
      const obj = {
        field1: encryptionService.encrypt('encrypted'),
        field2: 'plaintext'
      };
      
      const decrypted = encryptionService.decryptFields(obj, ['field1', 'field2']);
      
      expect(decrypted.field1).toBe('encrypted');
      expect(decrypted.field2).toBe('plaintext'); // Unchanged
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle SMTP password encryption workflow', () => {
      // Simulate admin saving config
      const smtpPassword = 'smtp_pass_12345';
      const encryptedPassword = encryptionService.encrypt(smtpPassword);
      
      // Save to "database" (simulated)
      const savedConfig = {
        smtpHost: 'smtp.gmail.com',
        smtpUser: 'user@example.com',
        smtpPassword: encryptedPassword
      };
      
      // Simulate email service loading config
      const loadedPassword = encryptionService.decrypt(savedConfig.smtpPassword);
      
      expect(loadedPassword).toBe(smtpPassword);
    });

    it('should handle concurrent encryption/decryption', () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
      
      // Encrypt all
      const encrypted = passwords.map(p => encryptionService.encrypt(p));
      
      // Decrypt all
      const decrypted = encrypted.map(e => encryptionService.decrypt(e));
      
      expect(decrypted).toEqual(passwords);
    });

    it('should maintain data integrity after multiple encrypt/decrypt cycles', () => {
      let data = 'originalPassword123';
      
      // 10 encrypt/decrypt cycles
      for (let i = 0; i < 10; i++) {
        const encrypted = encryptionService.encrypt(data);
        data = encryptionService.decrypt(encrypted);
      }
      
      expect(data).toBe('originalPassword123');
    });
  });
});
