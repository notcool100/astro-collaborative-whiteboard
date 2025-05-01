/**
 * PostgreSQL Utilities for PCS Draw
 * 
 * This file provides utility functions for working with PostgreSQL in the PCS Draw application.
 * It includes functions for common database operations and transaction management.
 */

const { connectToPostgreSQL } = require('./db-connection');

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params = []) {
  const pool = connectToPostgreSQL();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute a single-row query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null if not found
 */
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute a query and return all rows
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Array of rows
 */
async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Execute a query that returns a count
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Count result
 */
async function queryCount(text, params = []) {
  const result = await query(text, params);
  return parseInt(result.rows[0].count);
}

/**
 * Execute a query within a transaction
 * @param {Function} callback - Function that receives a client and executes queries
 * @returns {Promise<any>} Result of the callback function
 */
async function withTransaction(callback) {
  const pool = connectToPostgreSQL();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Insert a record into a table
 * @param {string} table - Table name
 * @param {Object} data - Object with column:value pairs
 * @param {string} returning - Column to return (default: 'id')
 * @returns {Promise<Object>} Inserted record
 */
async function insert(table, data, returning = 'id') {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const columnList = columns.join(', ');
  
  const text = `
    INSERT INTO ${table} (${columnList})
    VALUES (${placeholders})
    RETURNING ${returning === '*' ? '*' : returning}
  `;
  
  const result = await query(text, values);
  return returning === '*' ? result.rows[0] : result.rows[0][returning];
}

/**
 * Update a record in a table
 * @param {string} table - Table name
 * @param {Object} data - Object with column:value pairs to update
 * @param {Object} where - Object with column:value pairs for WHERE clause
 * @param {string} returning - Column to return (default: 'id')
 * @returns {Promise<Object>} Updated record
 */
async function update(table, data, where, returning = 'id') {
  const updateColumns = Object.keys(data);
  const updateValues = Object.values(data);
  
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  const updateList = updateColumns
    .map((col, i) => `${col} = $${i + 1}`)
    .join(', ');
  
  const whereList = whereColumns
    .map((col, i) => `${col} = $${updateColumns.length + i + 1}`)
    .join(' AND ');
  
  const text = `
    UPDATE ${table}
    SET ${updateList}
    WHERE ${whereList}
    RETURNING ${returning === '*' ? '*' : returning}
  `;
  
  const values = [...updateValues, ...whereValues];
  const result = await query(text, values);
  
  return returning === '*' ? result.rows[0] : result.rows[0][returning];
}

/**
 * Delete records from a table
 * @param {string} table - Table name
 * @param {Object} where - Object with column:value pairs for WHERE clause
 * @param {string} returning - Column to return (default: 'id')
 * @returns {Promise<Array>} Deleted records
 */
async function remove(table, where, returning = 'id') {
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  const whereList = whereColumns
    .map((col, i) => `${col} = $${i + 1}`)
    .join(' AND ');
  
  const text = `
    DELETE FROM ${table}
    WHERE ${whereList}
    RETURNING ${returning === '*' ? '*' : returning}
  `;
  
  const result = await query(text, whereValues);
  return returning === '*' ? result.rows : result.rows.map(row => row[returning]);
}

/**
 * Find records in a table
 * @param {string} table - Table name
 * @param {Object} where - Object with column:value pairs for WHERE clause
 * @param {Object} options - Additional options (limit, offset, orderBy)
 * @returns {Promise<Array>} Found records
 */
async function find(table, where = {}, options = {}) {
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  let whereClause = '';
  if (whereColumns.length > 0) {
    const whereList = whereColumns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(' AND ');
    whereClause = `WHERE ${whereList}`;
  }
  
  let limitClause = '';
  if (options.limit) {
    limitClause = `LIMIT ${options.limit}`;
  }
  
  let offsetClause = '';
  if (options.offset) {
    offsetClause = `OFFSET ${options.offset}`;
  }
  
  let orderByClause = '';
  if (options.orderBy) {
    const direction = options.orderDirection === 'DESC' ? 'DESC' : 'ASC';
    orderByClause = `ORDER BY ${options.orderBy} ${direction}`;
  }
  
  const text = `
    SELECT ${options.columns || '*'}
    FROM ${table}
    ${whereClause}
    ${orderByClause}
    ${limitClause}
    ${offsetClause}
  `;
  
  const result = await query(text, whereValues);
  return result.rows;
}

/**
 * Find a single record in a table
 * @param {string} table - Table name
 * @param {Object} where - Object with column:value pairs for WHERE clause
 * @param {Object} options - Additional options (columns)
 * @returns {Promise<Object|null>} Found record or null
 */
async function findOne(table, where, options = {}) {
  const results = await find(table, where, { ...options, limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Count records in a table
 * @param {string} table - Table name
 * @param {Object} where - Object with column:value pairs for WHERE clause
 * @returns {Promise<number>} Count of records
 */
async function count(table, where = {}) {
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  let whereClause = '';
  if (whereColumns.length > 0) {
    const whereList = whereColumns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(' AND ');
    whereClause = `WHERE ${whereList}`;
  }
  
  const text = `
    SELECT COUNT(*) as count
    FROM ${table}
    ${whereClause}
  `;
  
  const result = await query(text, whereValues);
  return parseInt(result.rows[0].count);
}

/**
 * Execute a raw SQL file
 * @param {string} filePath - Path to SQL file
 * @returns {Promise<void>}
 */
async function executeSqlFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  
  const fullPath = path.resolve(filePath);
  const sql = fs.readFileSync(fullPath, 'utf8');
  
  const pool = connectToPostgreSQL();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`SQL file executed successfully: ${filePath}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing SQL file:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if a table exists
 * @param {string} tableName - Table name to check
 * @returns {Promise<boolean>} True if table exists
 */
async function tableExists(tableName) {
  const text = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    ) as exists
  `;
  
  const result = await query(text, [tableName]);
  return result.rows[0].exists;
}

/**
 * Get database schema version
 * @returns {Promise<string|null>} Schema version or null if not set
 */
async function getSchemaVersion() {
  try {
    // Check if system table exists
    const systemTableExists = await tableExists('system');
    if (!systemTableExists) {
      return null;
    }
    
    // Get schema version
    const result = await queryOne(
      'SELECT version FROM system WHERE key = $1',
      ['schema_version']
    );
    
    return result ? result.version : null;
  } catch (error) {
    console.error('Error getting schema version:', error);
    return null;
  }
}

/**
 * Set database schema version
 * @param {string} version - Schema version
 * @returns {Promise<void>}
 */
async function setSchemaVersion(version) {
  try {
    // Check if system table exists
    const systemTableExists = await tableExists('system');
    
    if (!systemTableExists) {
      // Create system table
      await query(`
        CREATE TABLE system (
          key VARCHAR(50) PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    }
    
    // Upsert schema version
    await query(`
      INSERT INTO system (key, version, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET version = $2, updated_at = NOW()
    `, ['schema_version', version]);
    
    console.log(`Schema version set to ${version}`);
  } catch (error) {
    console.error('Error setting schema version:', error);
    throw error;
  }
}

module.exports = {
  query,
  queryOne,
  queryAll,
  queryCount,
  withTransaction,
  insert,
  update,
  remove,
  find,
  findOne,
  count,
  executeSqlFile,
  tableExists,
  getSchemaVersion,
  setSchemaVersion
};