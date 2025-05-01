/**
 * Migration: Initial Schema
 * 
 * Description: Creates the initial database schema for PCS Draw application
 * 
 * Changes:
 * - Creates users collection
 * - Creates workspaces collection
 * - Creates whiteboards collection
 * - Creates whiteboardVersions collection
 * - Creates whiteboardElements collection
 * - Creates collaborationSessions collection
 * - Creates activityLogs collection
 * - Sets up initial indexes
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
    console.log('Starting initial schema migration...');
    
    // Create collections
    await db.createCollection('users');
    await db.createCollection('workspaces');
    await db.createCollection('whiteboards');
    await db.createCollection('whiteboardVersions');
    await db.createCollection('whiteboardElements');
    await db.createCollection('collaborationSessions');
    await db.createCollection('activityLogs');
    
    console.log('Collections created successfully');
    
    // Create indexes for users collection
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true }
    );
    
    await db.collection('users').createIndex(
      { name: 1 }
    );
    
    await db.collection('users').createIndex(
      { lastActive: -1 }
    );
    
    // Create indexes for workspaces collection
    await db.collection('workspaces').createIndex(
      { ownerId: 1 }
    );
    
    await db.collection('workspaces').createIndex(
      { 'members.userId': 1 }
    );
    
    await db.collection('workspaces').createIndex(
      { 'members.userId': 1, 'members.role': 1 }
    );
    
    await db.collection('workspaces').createIndex(
      { name: 'text', description: 'text' }
    );
    
    await db.collection('workspaces').createIndex(
      { updatedAt: -1 }
    );
    
    // Create indexes for whiteboards collection
    await db.collection('whiteboards').createIndex(
      { workspaceId: 1 }
    );
    
    await db.collection('whiteboards').createIndex(
      { workspaceId: 1, updatedAt: -1 }
    );
    
    await db.collection('whiteboards').createIndex(
      { createdBy: 1 }
    );
    
    await db.collection('whiteboards').createIndex(
      { name: 'text', tags: 'text' }
    );
    
    // Create indexes for whiteboardVersions collection
    await db.collection('whiteboardVersions').createIndex(
      { whiteboardId: 1, version: -1 }
    );
    
    await db.collection('whiteboardVersions').createIndex(
      { createdBy: 1 }
    );
    
    await db.collection('whiteboardVersions').createIndex(
      { whiteboardId: 1, createdAt: -1 }
    );
    
    // Create indexes for whiteboardElements collection
    await db.collection('whiteboardElements').createIndex(
      { whiteboardId: 1 }
    );
    
    await db.collection('whiteboardElements').createIndex(
      { whiteboardId: 1, type: 1 }
    );
    
    await db.collection('whiteboardElements').createIndex(
      { whiteboardId: 1, zIndex: 1 }
    );
    
    await db.collection('whiteboardElements').createIndex(
      { whiteboardId: 1, elementId: 1 },
      { unique: true }
    );
    
    // Create indexes for collaborationSessions collection
    await db.collection('collaborationSessions').createIndex(
      { whiteboardId: 1 }
    );
    
    await db.collection('collaborationSessions').createIndex(
      { 'activeUsers.userId': 1 }
    );
    
    await db.collection('collaborationSessions').createIndex(
      { lastActivity: 1 },
      { expireAfterSeconds: 86400 } // 24 hours TTL
    );
    
    // Create indexes for activityLogs collection
    await db.collection('activityLogs').createIndex(
      { entityType: 1, entityId: 1 }
    );
    
    await db.collection('activityLogs').createIndex(
      { userId: 1 }
    );
    
    await db.collection('activityLogs').createIndex(
      { timestamp: -1 }
    );
    
    await db.collection('activityLogs').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );
    
    // Create system collection for tracking schema version
    await db.createCollection('system');
    await db.collection('system').insertOne({
      _id: 'schemaVersion',
      version: '1.0.0',
      lastUpdated: new Date(),
      migrations: [{
        name: '20240601000000-initial-schema',
        appliedAt: new Date()
      }]
    });
    
    console.log('Initial schema migration completed successfully');
  },

  /**
   * Revert the migration
   * @param {Object} db - MongoDB database connection
   * @param {Object} client - MongoDB client
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Reverting initial schema migration...');
    
    // Drop all collections
    await db.collection('users').drop();
    await db.collection('workspaces').drop();
    await db.collection('whiteboards').drop();
    await db.collection('whiteboardVersions').drop();
    await db.collection('whiteboardElements').drop();
    await db.collection('collaborationSessions').drop();
    await db.collection('activityLogs').drop();
    
    // Remove schema version tracking
    await db.collection('system').deleteOne({ _id: 'schemaVersion' });
    
    console.log('Initial schema migration reverted successfully');
  }
};