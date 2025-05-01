/**
 * Migration: [MIGRATION_NAME]
 * 
 * Description: [MIGRATION_DESCRIPTION]
 * 
 * Changes:
 * - [CHANGE_1]
 * - [CHANGE_2]
 */

const mongoose = require('mongoose');

module.exports = {
  /**
   * Apply the migration
   * @param {Object} db - MongoDB database connection
   * @param {Object} client - MongoDB client
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Implementation for applying the migration
    // Example: Add a new field to all documents in a collection
    // await db.collection('users').updateMany(
    //   {},
    //   { $set: { newField: 'defaultValue' } }
    // );
    
    // Example: Create a new index
    // await db.collection('whiteboards').createIndex(
    //   { newField: 1 },
    //   { background: true }
    // );
    
    console.log('[MIGRATION_NAME] migration applied successfully');
  },

  /**
   * Revert the migration
   * @param {Object} db - MongoDB database connection
   * @param {Object} client - MongoDB client
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Implementation for reverting the migration
    // Example: Remove the field added in the up migration
    // await db.collection('users').updateMany(
    //   {},
    //   { $unset: { newField: '' } }
    // );
    
    // Example: Drop the index created in the up migration
    // await db.collection('whiteboards').dropIndex('newField_1');
    
    console.log('[MIGRATION_NAME] migration reverted successfully');
  }
};