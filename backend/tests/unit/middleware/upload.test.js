const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  uploadEmployeePhoto, 
  uploadCompanyLogo, 
  handleUploadError, 
  validateMagicBytes 
} = require('../../../middleware/upload');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('Upload Middleware', () => {
  let mockReq, mockRes, nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      get: jest.fn(),
      headers: {},
      file: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadEmployeePhoto middleware', () => {
    it('should skip multer for JSON requests', () => {
      mockReq.get.mockReturnValue('application/json');
      
      uploadEmployeePhoto(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.get).toHaveBeenCalledWith('Content-Type');
    });

    it('should process multipart/form-data requests with multer', (done) => {
      mockReq.get.mockReturnValue('multipart/form-data');
      mockReq.body = {
        employeeId: 'SKYT001',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      // Mock multer's single() method
      const multerSingleMock = jest.fn((req, res, callback) => {
        // Simulate no file uploaded
        callback(null);
      });
      
      // We can't fully test multer without a real file, but we can verify the flow
      uploadEmployeePhoto(mockReq, mockRes, (err) => {
        if (err) {
          done(err);
        } else {
          // Should have attempted to use multer for multipart requests
          expect(mockReq.get).toHaveBeenCalledWith('Content-Type');
          done();
        }
      });
    });
  });

  describe('handleUploadError middleware', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE');
      mockReq.get.mockReturnValue('multipart/form-data');
      
      handleUploadError(error, mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const error = new multer.MulterError('LIMIT_FILE_COUNT');
      mockReq.get.mockReturnValue('multipart/form-data');
      
      handleUploadError(error, mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    });

    it('should handle invalid file type error', () => {
      const error = new Error('Only JPEG, PNG, and WebP images are allowed!');
      mockReq.get.mockReturnValue('multipart/form-data');
      
      handleUploadError(error, mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      });
    });

    it('should skip error handling for JSON requests', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE');
      mockReq.get.mockReturnValue('application/json');
      
      handleUploadError(error, mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('validateMagicBytes middleware', () => {
    it('should call next() when no file is present', () => {
      mockReq.file = null;
      
      validateMagicBytes(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject file with invalid magic bytes', () => {
      const tempFilePath = path.join(__dirname, 'test-invalid-file.jpg');
      
      // Create a fake file with invalid content
      fs.writeFileSync(tempFilePath, 'This is not a valid image file');
      
      mockReq.file = {
        path: tempFilePath,
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      };
      
      validateMagicBytes(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid file: file content does not match the declared image type.'
      });
      
      // File should be deleted
      expect(fs.existsSync(tempFilePath)).toBe(false);
    });
  });
});
