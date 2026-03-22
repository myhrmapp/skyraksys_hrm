const db = require('../models');
const { QueryTypes } = require('sequelize');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.sequelize = db.sequelize;
  }

  /**
   * Get list of all tables in the database
   */
  async getTables() {
    try {
      const tables = await this.sequelize.query(`
        SELECT 
          table_name,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size,
          (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `, { type: QueryTypes.SELECT });

      return tables;
    } catch (error) {
      logger.error('Error getting tables:', { detail: error });
      throw error;
    }
  }

  /**
   * Get schema information for a specific table
   */
  async getTableSchema(tableName) {
    try {
      const columns = await this.sequelize.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = :tableName
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, {
        replacements: { tableName },
        type: QueryTypes.SELECT
      });

      // Get primary keys
      const primaryKeys = await this.sequelize.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = :tableName::regclass
        AND i.indisprimary;
      `, {
        replacements: { tableName },
        type: QueryTypes.SELECT
      });

      // Get foreign keys
      const foreignKeys = await this.sequelize.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = :tableName;
      `, {
        replacements: { tableName },
        type: QueryTypes.SELECT
      });

      // Get indexes
      const indexes = await this.sequelize.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = :tableName
        AND t.relkind = 'r';
      `, {
        replacements: { tableName },
        type: QueryTypes.SELECT
      });

      return {
        columns,
        primaryKeys: primaryKeys.map(pk => pk.attname),
        foreignKeys,
        indexes
      };
    } catch (error) {
      logger.error('Error getting table schema:', { detail: error });
      throw error;
    }
  }

  /**
   * Get data from a specific table with pagination
   */
  async getTableData(tableName, options = {}) {
    try {
      let { limit = 50, offset = 0, orderBy, orderDir = 'ASC' } = options;

      // Validate table name against actual database tables
      const validTables = await this.getTables();
      if (!validTables.find(t => t.table_name === tableName)) {
        throw new Error('Invalid table name');
      }

      // Validate orderDir — must be strictly ASC or DESC
      const safeOrderDir = orderDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Get table schema to find valid columns and a default ordering column
      const schema = await this.getTableSchema(tableName);
      const validColumns = schema.columns ? schema.columns.map(c => c.column_name) : [];

      if (!orderBy) {
        if (schema.columns && schema.columns.length > 0) {
          const primaryKey = schema.primaryKeys && schema.primaryKeys.length > 0 
            ? schema.primaryKeys[0] 
            : schema.columns[0].column_name;
          orderBy = primaryKey;
        } else {
          orderBy = '1'; // Fallback to first column by position
        }
      } else if (orderBy !== '1' && !validColumns.includes(orderBy)) {
        // Validate orderBy against actual column names to prevent injection
        throw new Error(`Invalid order column: ${orderBy}`);
      }

      // Get total count
      const [{ count }] = await this.sequelize.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`,
        { type: QueryTypes.SELECT }
      );

      // Get data with safe ordering
      let query;
      if (orderBy === '1') {
        query = `SELECT * FROM "${tableName}" LIMIT :limit OFFSET :offset`;
      } else {
        query = `SELECT * FROM "${tableName}" ORDER BY "${orderBy}" ${safeOrderDir} LIMIT :limit OFFSET :offset`;
      }

      const data = await this.sequelize.query(query, {
        replacements: { limit, offset },
        type: QueryTypes.SELECT
      });

      return {
        data,
        total: parseInt(count),
        limit,
        offset,
        hasMore: parseInt(count) > (offset + limit)
      };
    } catch (error) {
      logger.error('Error getting table data:', { detail: error });
      throw error;
    }
  }

  /**
   * Execute SQL query with safety checks
   */
  async executeQuery(query, options = {}) {
    try {
      const { readOnly = false, maxRows = 1000 } = options;

      // Trim and uppercase for checking
      const upperQuery = query.trim().toUpperCase();

      // Dangerous operations to block
      const dangerousKeywords = [
        'DROP DATABASE',
        'DROP SCHEMA',
        'DROP TABLE',
        'DROP INDEX',
        'DROP VIEW',
        'DROP FUNCTION',
        'TRUNCATE',
        'DELETE FROM',
        'DELETE\t',
        'DELETE\n',
        'UPDATE ',
        'UPDATE\t',
        'UPDATE\n',
        'INSERT INTO',
        'ALTER TABLE',
        'ALTER INDEX',
        'CREATE TABLE',
        'CREATE INDEX',
        'GRANT ',
        'REVOKE ',
        'COPY ',
        'EXPLAIN ',
        'EXEC ',
        'EXECUTE ',
        'RENAME ',
        'VACUUM',
        'REINDEX'
      ];

      // Check for dangerous operations
      if (readOnly) {
        for (const keyword of dangerousKeywords) {
          if (upperQuery.includes(keyword)) {
            throw new Error(`Operation not allowed in read-only mode: ${keyword}`);
          }
        }
      }

      // Execute query
      const startTime = Date.now();
      const results = await this.sequelize.query(query, {
        type: QueryTypes.SELECT,
        raw: true
      });
      const executionTime = Date.now() - startTime;

      // Limit results if too many
      const limitedResults = results.slice(0, maxRows);
      const truncated = results.length > maxRows;

      return {
        success: true,
        results: limitedResults,
        rowCount: results.length,
        executionTime,
        truncated,
        maxRows
      };
    } catch (error) {
      logger.error('Error executing query:', { detail: error });
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      // Total database size
      const [dbSize] = await this.sequelize.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size;
      `, { type: QueryTypes.SELECT });

      // Table count
      const [tableCount] = await this.sequelize.query(`
        SELECT count(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
      `, { type: QueryTypes.SELECT });

      // Total row count across all tables
      const tables = await this.getTables();
      let totalRows = 0;
      
      for (const table of tables) {
        const [{ count }] = await this.sequelize.query(
          `SELECT COUNT(*) as count FROM "${table.table_name}"`,
          { type: QueryTypes.SELECT }
        );
        totalRows += parseInt(count);
      }

      // Get table sizes
      const tableSizes = await this.sequelize.query(`
        SELECT 
          table_name,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size,
          pg_total_relation_size(quote_ident(table_name)::regclass) as size_bytes
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY size_bytes DESC
        LIMIT 10;
      `, { type: QueryTypes.SELECT });

      return {
        databaseSize: dbSize.size,
        tableCount: parseInt(tableCount.count),
        totalRows,
        largestTables: tableSizes
      };
    } catch (error) {
      logger.error('Error getting database stats:', { detail: error });
      throw error;
    }
  }

  /**
   * Create backup of a table
   */
  async backupTable(tableName) {
    try {
      // Validate table name against actual database tables
      const validTables = await this.getTables();
      if (!validTables.find(t => t.table_name === tableName)) {
        throw new Error('Invalid table name');
      }

      const backupTableName = `${tableName}_backup_${Date.now()}`;
      
      await this.sequelize.query(`
        CREATE TABLE "${backupTableName}" AS 
        SELECT * FROM "${tableName}";
      `);

      return {
        success: true,
        backupTable: backupTableName,
        message: `Table backed up to ${backupTableName}`
      };
    } catch (error) {
      logger.error('Error backing up table:', { detail: error });
      throw error;
    }
  }

  /**
   * Get query execution plan
   */
  async explainQuery(query) {
    try {
      // Only allow SELECT statements in EXPLAIN ANALYZE
      const trimmed = query.trim().toUpperCase();
      if (!trimmed.startsWith('SELECT')) {
        throw new Error('EXPLAIN only supports SELECT queries');
      }

      const plan = await this.sequelize.query(`EXPLAIN ANALYZE ${query}`, {
        type: QueryTypes.SELECT
      });

      return {
        success: true,
        plan
      };
    } catch (error) {
      logger.error('Error explaining query:', { detail: error });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get active connections
   */
  async getActiveConnections() {
    try {
      const connections = await this.sequelize.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          query,
          state_change
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        ORDER BY state_change DESC;
      `, { type: QueryTypes.SELECT });

      return connections;
    } catch (error) {
      logger.error('Error getting active connections:', { detail: error });
      throw error;
    }
  }
}

module.exports = new DatabaseService();
