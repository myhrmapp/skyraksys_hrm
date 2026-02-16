const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class ConfigService {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.backupPath = path.join(__dirname, '..', '.env.backup');
  }

  /**
   * Read .env file and parse into key-value pairs
   */
  async readEnvFile() {
    try {
      const content = await fs.readFile(this.envPath, 'utf-8');
      const lines = content.split('\n');
      
      const config = {
        raw: content,
        parsed: {},
        comments: [],
        sections: []
      };

      let currentSection = 'General';
      let sectionData = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Section headers (comments starting with ##)
        if (trimmedLine.startsWith('##')) {
          if (sectionData.length > 0) {
            config.sections.push({
              name: currentSection,
              variables: sectionData
            });
            sectionData = [];
          }
          currentSection = trimmedLine.replace(/^##\s*/, '').trim();
        }
        // Regular comments
        else if (trimmedLine.startsWith('#') && !trimmedLine.includes('=')) {
          config.comments.push({
            line: index,
            text: trimmedLine
          });
        }
        // Key-value pairs
        else if (trimmedLine.includes('=') && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').trim();
          
          config.parsed[key.trim()] = value;
          sectionData.push({
            key: key.trim(),
            value: value,
            line: index
          });
        }
      });

      // Add last section
      if (sectionData.length > 0) {
        config.sections.push({
          name: currentSection,
          variables: sectionData
        });
      }

      return config;
    } catch (error) {
      logger.error('Error reading .env file:', { detail: error });
      throw error;
    }
  }

  /**
   * Get all environment variables (both from .env and process.env)
   */
  async getAllConfig() {
    try {
      const envFile = await this.readEnvFile();
      
      // Get current process.env values
      const currentEnv = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_DIALECT: process.env.DB_DIALECT,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        EMAIL_FROM: process.env.EMAIL_FROM,
        FRONTEND_URL: process.env.FRONTEND_URL,
        SEED_DEMO_DATA: process.env.SEED_DEMO_DATA
      };

      return {
        file: envFile,
        current: currentEnv,
        sections: envFile.sections
      };
    } catch (error) {
      logger.error('Error getting config:', { detail: error });
      throw error;
    }
  }

  /**
   * Update a single environment variable
   * @param {string} key - Variable name
   * @param {string} value - New value
   */
  async updateConfig(key, value) {
    try {
      // Create backup first
      await this.createBackup();

      const content = await fs.readFile(this.envPath, 'utf-8');
      const lines = content.split('\n');
      
      let updated = false;
      const newLines = lines.map(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith(`${key}=`) || trimmedLine.startsWith(`${key} =`)) {
          updated = true;
          return `${key}=${value}`;
        }
        
        return line;
      });

      // If key doesn't exist, add it at the end
      if (!updated) {
        newLines.push(`${key}=${value}`);
      }

      await fs.writeFile(this.envPath, newLines.join('\n'), 'utf-8');

      return {
        success: true,
        message: `Configuration ${key} updated successfully`,
        restartRequired: true
      };
    } catch (error) {
      logger.error('Error updating config:', { detail: error });
      throw error;
    }
  }

  /**
   * Update multiple environment variables
   * @param {object} updates - Object with key-value pairs to update
   */
  async updateMultipleConfig(updates) {
    try {
      // Create backup first
      await this.createBackup();

      const content = await fs.readFile(this.envPath, 'utf-8');
      const lines = content.split('\n');
      
      const updatedKeys = new Set();
      const newLines = lines.map(line => {
        const trimmedLine = line.trim();
        
        for (const [key, value] of Object.entries(updates)) {
          if (trimmedLine.startsWith(`${key}=`) || trimmedLine.startsWith(`${key} =`)) {
            updatedKeys.add(key);
            return `${key}=${value}`;
          }
        }
        
        return line;
      });

      // Add any new keys that weren't found
      for (const [key, value] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
          newLines.push(`${key}=${value}`);
        }
      }

      await fs.writeFile(this.envPath, newLines.join('\n'), 'utf-8');

      return {
        success: true,
        message: `${Object.keys(updates).length} configuration(s) updated successfully`,
        updatedKeys: Array.from(updatedKeys),
        restartRequired: true
      };
    } catch (error) {
      logger.error('Error updating multiple configs:', { detail: error });
      throw error;
    }
  }

  /**
   * Create a backup of the current .env file
   */
  async createBackup() {
    try {
      const content = await fs.readFile(this.envPath, 'utf-8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        path.dirname(this.envPath),
        `.env.backup.${timestamp}`
      );
      
      await fs.writeFile(backupFile, content, 'utf-8');
      
      return {
        success: true,
        backupFile,
        timestamp
      };
    } catch (error) {
      logger.error('Error creating backup:', { detail: error });
      throw error;
    }
  }

  /**
   * Restore from backup
   * @param {string} backupFile - Path to backup file
   */
  async restoreFromBackup(backupFile) {
    try {
      const backupPath = path.join(path.dirname(this.envPath), backupFile);
      const content = await fs.readFile(backupPath, 'utf-8');
      
      await fs.writeFile(this.envPath, content, 'utf-8');
      
      return {
        success: true,
        message: 'Configuration restored from backup',
        restartRequired: true
      };
    } catch (error) {
      logger.error('Error restoring from backup:', { detail: error });
      throw error;
    }
  }

  /**
   * Get list of backup files
   */
  async listBackups() {
    try {
      const dirPath = path.dirname(this.envPath);
      const files = await fs.readdir(dirPath);
      
      const backups = [];
      
      for (const file of files) {
        if (file.startsWith('.env.backup')) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            fileName: file,
            size: stats.size,
            created: stats.mtime,
            formattedSize: this.formatBytes(stats.size)
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      logger.error('Error listing backups:', { detail: error });
      throw error;
    }
  }

  /**
   * Validate configuration values
   * @param {object} config - Configuration object to validate
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Required fields
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
    required.forEach(key => {
      if (!config[key]) {
        errors.push(`${key} is required`);
      }
    });

    // Port validation
    if (config.PORT && (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535)) {
      errors.push('PORT must be a number between 1 and 65535');
    }

    // Email validation
    if (config.SMTP_HOST && !config.SMTP_USER) {
      warnings.push('SMTP_USER is required when SMTP_HOST is set');
    }

    // CORS validation
    if (config.CORS_ORIGIN && !config.CORS_ORIGIN.startsWith('http')) {
      warnings.push('CORS_ORIGIN should start with http:// or https://');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new ConfigService();
