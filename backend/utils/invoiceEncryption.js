const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'encv1';

function getSalt() {
  return process.env.INVOICE_ENCRYPTION_SALT || 'skyraksys-invoice-salt-v1';
}

function deriveKey(secretPhrase) {
  if (!secretPhrase || typeof secretPhrase !== 'string') {
    throw new Error('A valid invoice secret phrase is required');
  }

  return crypto.scryptSync(secretPhrase.trim(), getSalt(), 32);
}

function encryptText(plainText, secretPhrase) {
  if (typeof plainText !== 'string') {
    throw new TypeError('Invoice encryption input must be a string');
  }

  const key = deriveKey(secretPhrase);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${ENCRYPTED_PREFIX}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptText(cipherText, secretPhrase) {
  if (typeof cipherText !== 'string') {
    return cipherText;
  }

  if (!cipherText.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return cipherText;
  }

  const parts = cipherText.split(':');
  if (parts.length !== 4) {
    const error = new Error('Invalid encrypted invoice payload format');
    error.statusCode = 400;
    throw error;
  }

  const [, ivHex, authTagHex, encryptedHex] = parts;

  try {
    const key = deriveKey(secretPhrase);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    const wrapped = new Error(`Invoice decryption failed. The secret phrase is invalid or the stored payload is corrupted. Details: ${error.message}`);
    wrapped.statusCode = 403;
    throw wrapped;
  }
}

function isEncryptedText(value) {
  return typeof value === 'string' && value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

function buildLineItemsEncryptedPayload(lineItems, secretPhrase) {
  return {
    isEncrypted: true,
    cipherText: encryptText(JSON.stringify(lineItems || []), secretPhrase)
  };
}

function parseLineItemsEncryptedPayload(rawLineItems, secretPhrase) {
  if (Array.isArray(rawLineItems)) {
    return rawLineItems;
  }

  if (
    rawLineItems &&
    typeof rawLineItems === 'object' &&
    rawLineItems.isEncrypted === true &&
    typeof rawLineItems.cipherText === 'string'
  ) {
    const decrypted = decryptText(rawLineItems.cipherText, secretPhrase);
    try {
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      const wrapped = new Error(`Invoice line-item payload is invalid or corrupted. Details: ${error.message}`);
      wrapped.statusCode = 400;
      throw wrapped;
    }
  }

  if (typeof rawLineItems === 'string' && isEncryptedText(rawLineItems)) {
    const decrypted = decryptText(rawLineItems, secretPhrase);
    try {
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      const wrapped = new Error(`Invoice line-item payload is invalid or corrupted. Details: ${error.message}`);
      wrapped.statusCode = 400;
      throw wrapped;
    }
  }

  return [];
}

function maskValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return 'REDACTED';
}

module.exports = {
  encryptText,
  decryptText,
  isEncryptedText,
  buildLineItemsEncryptedPayload,
  parseLineItemsEncryptedPayload,
  maskValue
};
