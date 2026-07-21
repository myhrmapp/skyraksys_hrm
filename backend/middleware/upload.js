const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Company logos still served as static files — keep their directory
const logoUploadDir = path.join(__dirname, '../uploads/company-logos');
if (!fs.existsSync(logoUploadDir)) {
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Employee photos: use memoryStorage — file goes into req.file.buffer
// and is converted to base64 in the controller, then saved directly in DB.
// No files are ever written to disk for employee photos.
const memoryStorage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed!'), false);
  }
};

// Upload limits
const uploadLimits = {
  fileSize: 5 * 1024 * 1024, // 5 MB
  files: 1
};

// Multer instance for employee photos (memory — no disk write)
const upload = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: uploadLimits
});

// Storage configuration for company logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logoUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `company-logo-${timestamp}${extension}`);
  }
});

// Create multer upload instance for logos
const logoUpload = multer({
  storage: logoStorage,
  fileFilter: fileFilter,
  limits: uploadLimits
});

// Middleware for single photo upload
const uploadEmployeePhoto = (req, res, next) => {
  // Check if this is a JSON request (no file upload)
  const contentType = req.get('Content-Type') || '';
  
  if (contentType.includes('application/json')) {
    // For JSON requests, skip multer processing
    return next();
  }
  
  // For multipart/form-data requests, use multer
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Parse JSON strings in FormData back to objects
    // This must happen BEFORE validation middleware
    if (req.body.salary && typeof req.body.salary === 'string') {
      try {
        req.body.salary = JSON.parse(req.body.salary);
      } catch (e) {
        logger.error('Failed to parse salary JSON:', { detail: e });
        logger.error('Raw salary value:', { detail: req.body.salary });
      }
    }
    
    if (req.body.salaryStructure && typeof req.body.salaryStructure === 'string') {
      try {
        req.body.salaryStructure = JSON.parse(req.body.salaryStructure);
      } catch (e) {
        logger.error('Failed to parse salaryStructure JSON:', { detail: e });
        logger.error('Raw salaryStructure value:', { detail: req.body.salaryStructure });
      }
    }
    
    // Convert date strings to Date objects for Joi validation
    // FormData sends everything as strings, but Joi.date() expects Date objects
    const dateFields = ['dateOfBirth', 'hireDate', 'joiningDate', 'confirmationDate', 'resignationDate', 'lastWorkingDate'];
    dateFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string' && req.body[field].trim()) {
        const dateValue = new Date(req.body[field]);
        if (!isNaN(dateValue.getTime())) {
          req.body[field] = dateValue;

        } else {
          logger.warn(`Invalid date format for ${field}:`, { detail: req.body[field] });
          // Remove invalid date to let validator handle it
          delete req.body[field];
        }
      }
    });
    
    return next();
  });
};

// Middleware for company logo upload
const uploadCompanyLogo = (req, res, next) => {
  // Check if this is a JSON request (no file upload)
  const contentType = req.get('Content-Type') || '';
  
  if (contentType.includes('application/json')) {
    // For JSON requests, skip multer processing
    return next();
  }
  
  // For multipart/form-data requests, use multer
  return logoUpload.single('companyLogo')(req, res, next);
};

// Magic-byte file signature validation
// Now reads from req.file.buffer (memory storage) — no disk I/O needed
const validateMagicBytes = (req, res, next) => {
  if (!req.file) return next();

  // For memory storage, data is in req.file.buffer
  const header = req.file.buffer ? req.file.buffer.slice(0, 12) : null;

  if (!header) return next(); // No buffer means disk storage (logo) — skip

  const mimetype = req.file.mimetype;
  let isValid = false;

  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    isValid = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  } else if (mimetype === 'image/png') {
    isValid = header.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  } else if (mimetype === 'image/webp') {
    isValid = header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WEBP';
  }

  if (!isValid) {
    logger.warn('Upload rejected: magic bytes mismatch', {
      mimetype,
      filename: req.file.originalname,
      header: header.slice(0, 8).toString('hex')
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid file: file content does not match the declared image type.'
    });
  }

  next();
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  // Skip error handling for JSON requests (no upload errors expected)
  const contentType = req.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return next();
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    }
  }

  if (error.message.includes('Only JPEG, PNG, and WebP images are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'File upload error: ' + error.message
  });
};

module.exports = {
  uploadEmployeePhoto,
  uploadCompanyLogo,
  handleUploadError,
  validateMagicBytes,
  logoUploadDir
};
