/**
 * Migration: [MIGRATION_NAME]
 * 
 * Description: [MIGRATION_DESCRIPTION]
 * 
 * Changes:
 * - [CHANGE_1]
 * - [CHANGE_2]
 */

module.exports = {
  /**
   * Apply the migration
   * @param {Object} client - PostgreSQL client
   * @returns {Promise<void>}
   */
  async up(client) {
    // Implementation for applying the migration
    // Example: Add a new column to a table
    // await client.query(`
    //   ALTER TABLE users
    //   ADD COLUMN new_field VARCHAR(255) DEFAULT 'defaultValue'
    // `);
    
    // Example: Create a new index
    // await client.query(`
    //   CREATE INDEX idx_users_new_field ON users(new_field)
    // `);
    
    console.log('[MIGRATION_NAME] migration applied successfully');
  },

  /**
   * Revert the migration
   * @param {Object} client - PostgreSQL client
   * @returns {Promise<void>}
   */
  async down(client) {
    // Implementation for reverting the migration
    // Example: Remove the column added in the up migration
    // await client.query(`
    //   ALTER TABLE users
    //   DROP COLUMN new_field
    // `);
    
    // Example: Drop the index created in the up migration
    // await client.query(`
    //   DROP INDEX IF EXISTS idx_users_new_field
    // `);
    
    console.log('[MIGRATION_NAME] migration reverted successfully');
  }
};