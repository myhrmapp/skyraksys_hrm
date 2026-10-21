import QRCode from 'qrcode';

/**
 * Generate a local data URL for a given string (vCard, URL, employee ID)
 * This avoids any external third-party API calls (e.g. api.qrserver.com)
 * and conforms to strict Content-Security-Policy (CSP) headers (img-src 'self' data: blob:).
 *
 * @param {string} text - Text to encode in the QR code
 * @param {Object} options - QR generation options
 * @returns {Promise<string>} Base64 data URL of the generated QR code PNG
 */
export const generateQRCodeDataUrl = async (text, options = {}) => {
  if (!text) return '';
  try {
    const opts = {
      width: options.width || 140,
      margin: options.margin !== undefined ? options.margin : 2,
      color: {
        dark: options.color || '#000000',
        light: options.bgcolor || '#ffffff'
      }
    };
    return await QRCode.toDataURL(text, opts);
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
};

/**
 * Format an employee object into standard vCard 3.0 format for mobile phone scanning
 * @param {Object} employee 
 * @returns {string} vCard string
 */
export const buildEmployeeVCard = (employee) => {
  if (!employee) return '';
  const firstName = employee.firstName || '';
  const lastName = employee.lastName || '';
  const position = employee.position?.title || employee.designation || '';
  const department = employee.department?.name || '';
  const phone = employee.contactNumber || employee.phoneNumber || '';
  const email = employee.user?.email || employee.email || '';

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`.trim(),
    'ORG:SkyrakSys Technologies' + (department ? `;${department}` : ''),
    position ? `TITLE:${position}` : '',
    phone ? `TEL;TYPE=WORK,VOICE:${phone}` : '',
    email ? `EMAIL;TYPE=PREF,INTERNET:${email}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');
};
