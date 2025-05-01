/**
 * Migration: Initial Schema
 * 
 * Description: Creates the initial database schema for AstroWhiteboard application
 * 
 * Changes:
 * - Creates initial PostgreSQL schema
 */

const path = require('path');
const pgUtils = require('../../pg-utils');

module.exports = {
  /**
   * Apply the migration
   * @param {Object} client - PostgreSQL client
   * @returns {Promise<void>}
   */
  async up(client) {
    console.log('Starting initial schema migration...');
    
    // Execute the schema.sql file
    const schemaPath = path.join(__dirname, '../../schema/schema.sql');
    await pgUtils.executeSqlFile(schemaPath);
    
    // Set schema version
    await pgUtils.setSchemaVersion('1.0.0');
    
    console.log('Initial schema migration completed successfully');
  },

  /**
   * Revert the migration
   * @param {Object} client - PostgreSQL client
   * @returns {Promise<void>}
   */
  async down(client) {
    console.log('Reverting initial schema migration...');
    
    // Drop all tables in reverse order to avoid foreign key constraints
    const tables = [
      'activity_logs',
      'collaboration_sessions',
      'whiteboard_elements',
      'whiteboard_versions',
      'whiteboards',
      'workspace_members',
      'workspaces',
      'users',
      'system'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.error(`Error dropping table ${table}:`, error);
      }
    }
    
    // Drop functions and triggers
    const functions = [
      'update_updated_at_column',
      'update_whiteboard_element_count',
      'handle_element_soft_delete',
      'update_whiteboard_current_version',
      'update_whiteboard_last_edited',
      'cleanup_old_activity_logs',
      'cleanup_old_collaboration_sessions'
    ];
    
    for (const func of functions) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS ${func} CASCADE`);
        console.log(`Dropped function: ${func}`);
      } catch (error) {
        console.error(`Error dropping function ${func}:`, error);
      }
    }
    
    // Drop views
    const views = [
      'workspace_members_view',
      'whiteboard_summary'
    ];
    
    for (const view of views) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${view} CASCADE`);
        console.log(`Dropped view: ${view}`);
      } catch (error) {
        console.error(`Error dropping view ${view}:`, error);
      }
    }
    
    console.log('Initial schema migration reverted successfully');
  }
};