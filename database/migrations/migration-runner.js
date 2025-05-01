/**
 * Migration Runner for PCS Draw
 * 
 * This script runs database migrations for the PCS Draw application.
 * It supports applying and reverting migrations.
 * 
 * Usage:
 *   node migration-runner.js up                 # Apply all pending migrations
 *   node migration-runner.js up [version]       # Apply migrations up to specified version
 *   node migration-runner.js down               # Revert the most recent migration
 *   node migration-runner.js down [version]     # Revert migrations down to specified version
 *   node migration-runner.js status             # Show migration status
 *   node migration-runner.js --test             # Test migrations without applying them
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Configuration
const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pcsdraw',
  migrationsDir: path.join(__dirname, 'scripts'),
  testMode: process.argv.includes('--test')
};

// Get command line arguments
const command = process.argv[2] || 'status';
const targetVersion = process.argv[3] || null;

/**
 * Connect to MongoDB
 * @returns {Promise<Object>} MongoDB client and database
 */
async function connectToMongoDB() {
  try {
    const client = await MongoClient.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const dbName = config.mongoUri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Get all migration files
 * @returns {Array<Object>} Array of migration objects with name and path
 */
function getMigrationFiles() {
  const files = fs.readdirSync(config.migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();
  
  return files.map(file => ({
    name: file.replace('.js', ''),
    path: path.join(config.migrationsDir, file)
  }));
}

/**
 * Get applied migrations from database
 * @param {Object} db - MongoDB database
 * @returns {Promise<Array<string>>} Array of applied migration names
 */
async function getAppliedMigrations(db) {
  // Check if system collection exists
  const collections = await db.listCollections({ name: 'system' }).toArray();
  if (collections.length === 0) {
    return [];
  }
  
  // Get schema version document
  const schemaVersion = await db.collection('system').findOne({ _id: 'schemaVersion' });
  if (!schemaVersion || !schemaVersion.migrations) {
    return [];
  }
  
  return schemaVersion.migrations.map(m => m.name);
}

/**
 * Update applied migrations in database
 * @param {Object} db - MongoDB database
 * @param {string} migrationName - Migration name
 * @param {boolean} applied - Whether migration was applied or reverted
 * @returns {Promise<void>}
 */
async function updateAppliedMigrations(db, migrationName, applied) {
  // Check if system collection exists
  const collections = await db.listCollections({ name: 'system' }).toArray();
  if (collections.length === 0) {
    await db.createCollection('system');
  }
  
  if (applied) {
    // Add migration to applied list
    await db.collection('system').updateOne(
      { _id: 'schemaVersion' },
      {
        $push: {
          migrations: {
            name: migrationName,
            appliedAt: new Date()
          }
        },
        $set: {
          lastUpdated: new Date()
        },
        $setOnInsert: {
          version: '1.0.0'
        }
      },
      { upsert: true }
    );
  } else {
    // Remove migration from applied list
    await db.collection('system').updateOne(
      { _id: 'schemaVersion' },
      {
        $pull: {
          migrations: { name: migrationName }
        },
        $set: {
          lastUpdated: new Date()
        }
      }
    );
  }
}

/**
 * Run a migration
 * @param {Object} db - MongoDB database
 * @param {Object} client - MongoDB client
 * @param {Object} migration - Migration object
 * @param {string} direction - 'up' or 'down'
 * @returns {Promise<boolean>} Success status
 */
async function runMigration(db, client, migration, direction) {
  console.log(`${direction === 'up' ? 'Applying' : 'Reverting'} migration: ${migration.name}`);
  
  if (config.testMode) {
    console.log(`[TEST MODE] Would ${direction === 'up' ? 'apply' : 'revert'} migration: ${migration.name}`);
    return true;
  }
  
  const startTime = Date.now();
  
  try {
    const migrationModule = require(migration.path);
    await migrationModule[direction](db, client);
    
    const duration = Date.now() - startTime;
    console.log(`Migration ${direction === 'up' ? 'applied' : 'reverted'} successfully in ${duration}ms`);
    
    // Update applied migrations
    await updateAppliedMigrations(db, migration.name, direction === 'up');
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Migration failed after ${duration}ms:`, error);
    return false;
  }
}

/**
 * Apply pending migrations
 * @param {Object} db - MongoDB database
 * @param {Object} client - MongoDB client
 * @param {string} targetVersion - Target version to migrate to (optional)
 * @returns {Promise<void>}
 */
async function applyMigrations(db, client, targetVersion = null) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(db);
  
  // Filter out already applied migrations
  const pendingMigrations = migrationFiles.filter(
    migration => !appliedMigrations.includes(migration.name)
  );
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations to apply');
    return;
  }
  
  console.log(`Found ${pendingMigrations.length} pending migrations`);
  
  // If target version specified, only apply migrations up to that version
  const migrationsToApply = targetVersion
    ? pendingMigrations.filter(migration => migration.name <= targetVersion)
    : pendingMigrations;
  
  if (migrationsToApply.length === 0) {
    console.log('No migrations to apply based on target version');
    return;
  }
  
  console.log(`Will apply ${migrationsToApply.length} migrations`);
  
  // Apply migrations in sequence
  for (const migration of migrationsToApply) {
    const success = await runMigration(db, client, migration, 'up');
    
    if (!success) {
      console.error(`Migration ${migration.name} failed, stopping`);
      break;
    }
  }
}

/**
 * Revert applied migrations
 * @param {Object} db - MongoDB database
 * @param {Object} client - MongoDB client
 * @param {string} targetVersion - Target version to revert to (optional)
 * @returns {Promise<void>}
 */
async function revertMigrations(db, client, targetVersion = null) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(db);
  
  if (appliedMigrations.length === 0) {
    console.log('No applied migrations to revert');
    return;
  }
  
  // Map applied migrations to full migration objects
  const appliedMigrationObjects = migrationFiles
    .filter(migration => appliedMigrations.includes(migration.name))
    .sort((a, b) => b.name.localeCompare(a.name)); // Sort in reverse order
  
  if (appliedMigrationObjects.length === 0) {
    console.log('No applied migrations found in migration files');
    return;
  }
  
  // If target version specified, revert migrations down to that version
  // If targetVersion is '0', revert all migrations
  const migrationsToRevert = targetVersion === '0'
    ? appliedMigrationObjects
    : targetVersion
      ? appliedMigrationObjects.filter(migration => migration.name > targetVersion)
      : [appliedMigrationObjects[0]]; // Just revert the most recent migration
  
  if (migrationsToRevert.length === 0) {
    console.log('No migrations to revert based on target version');
    return;
  }
  
  console.log(`Will revert ${migrationsToRevert.length} migrations`);
  
  // Revert migrations in reverse order
  for (const migration of migrationsToRevert) {
    const success = await runMigration(db, client, migration, 'down');
    
    if (!success) {
      console.error(`Reverting migration ${migration.name} failed, stopping`);
      break;
    }
  }
}

/**
 * Show migration status
 * @param {Object} db - MongoDB database
 * @returns {Promise<void>}
 */
async function showMigrationStatus(db) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(db);
  
  console.log('Migration Status:');
  console.log('=================');
  
  for (const migration of migrationFiles) {
    const status = appliedMigrations.includes(migration.name) ? 'Applied' : 'Pending';
    console.log(`[${status}] ${migration.name}`);
  }
  
  console.log('=================');
  console.log(`Total: ${migrationFiles.length} migrations, ${appliedMigrations.length} applied, ${migrationFiles.length - appliedMigrations.length} pending`);
}

/**
 * Main function
 */
async function main() {
  const { client, db } = await connectToMongoDB();
  
  try {
    if (config.testMode) {
      console.log('Running in TEST MODE - no changes will be applied');
    }
    
    switch (command) {
      case 'up':
        await applyMigrations(db, client, targetVersion);
        break;
      case 'down':
        await revertMigrations(db, client, targetVersion);
        break;
      case 'status':
        await showMigrationStatus(db);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: node migration-runner.js [up|down|status] [version]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the main function
main().catch(console.error);