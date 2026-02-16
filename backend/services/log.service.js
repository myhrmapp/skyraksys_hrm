const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class LogService {
  constructor() {
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.logFiles = {
      error: 'error.log',
      combined: 'combined.log',
      access: 'access.log'
    };
  }

  /**
   * Ensure logs directory exists
   */
  async ensureLogsDirectory() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  /**
   * Read log file with pagination
   * @param {string} logType - 'error', 'combined', or 'access'
   * @param {object} options - { lines: number, offset: number, search: string }
   */
  async readLog(logType, options = {}) {
    const { lines = 100, offset = 0, search = '' } = options;

    try {
      await this.ensureLogsDirectory();
      
      const fileName = this.logFiles[logType];
      if (!fileName) {
        throw new Error(`Invalid log type: ${logType}`);
      }

      const filePath = path.join(this.logsDir, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          logs: [],
          total: 0,
          message: `Log file ${fileName} does not exist yet`
        };
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      let logLines = content.split('\n').filter(line => line.trim());

      // Apply search filter
      if (search) {
        logLines = logLines.filter(line => 
          line.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Reverse to show newest first
      logLines.reverse();

      // Apply pagination
      const total = logLines.length;
      const paginatedLogs = logLines.slice(offset, offset + lines);

      return {
        logs: paginatedLogs,
        total,
        offset,
        lines,
        hasMore: offset + lines < total
      };
    } catch (error) {
      logger.error(`Error reading ${logType} log:`, { detail: error });
      throw error;
    }
  }

  /**
   * Get all available log files with their sizes
   */
  async getLogFiles() {
    try {
      await this.ensureLogsDirectory();
      
      const files = [];
      
      for (const [type, fileName] of Object.entries(this.logFiles)) {
        const filePath = path.join(this.logsDir, fileName);
        
        try {
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          const lineCount = content.split('\n').filter(line => line.trim()).length;
          
          files.push({
            type,
            fileName,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            lines: lineCount,
            lastModified: stats.mtime
          });
        } catch {
          // File doesn't exist yet
          files.push({
            type,
            fileName,
            size: 0,
            sizeFormatted: '0 B',
            lines: 0,
            lastModified: null,
            exists: false
          });
        }
      }

      return files;
    } catch (error) {
      logger.error('Error getting log files:', { detail: error });
      throw error;
    }
  }

  /**
   * Clear a specific log file
   * @param {string} logType - 'error', 'combined', or 'access'
   */
  async clearLog(logType) {
    try {
      await this.ensureLogsDirectory();
      
      const fileName = this.logFiles[logType];
      if (!fileName) {
        throw new Error(`Invalid log type: ${logType}`);
      }

      const filePath = path.join(this.logsDir, fileName);
      
      // Write empty string to clear file
      await fs.writeFile(filePath, '', 'utf-8');
      
      return {
        success: true,
        message: `Log file ${fileName} cleared successfully`
      };
    } catch (error) {
      logger.error(`Error clearing ${logType} log:`, { detail: error });
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    try {
      const files = await this.getLogFiles();
      
      const stats = {
        totalSize: 0,
        totalLines: 0,
        files: {}
      };

      files.forEach(file => {
        stats.totalSize += file.size;
        stats.totalLines += file.lines;
        stats.files[file.type] = {
          size: file.sizeFormatted,
          lines: file.lines,
          exists: file.exists !== false
        };
      });

      stats.totalSizeFormatted = this.formatBytes(stats.totalSize);

      return stats;
    } catch (error) {
      logger.error('Error getting log stats:', { detail: error });
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Tail log file (get last N lines)
   * @param {string} logType - 'error', 'combined', or 'access'
   * @param {number} lines - Number of lines to return (default: 50)
   */
  async tailLog(logType, lines = 50) {
    try {
      const result = await this.readLog(logType, { lines, offset: 0 });
      return result;
    } catch (error) {
      logger.error(`Error tailing ${logType} log:`, { detail: error });
      throw error;
    }
  }
}

module.exports = new LogService();
