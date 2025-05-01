/**
 * Migration Runner for AstroWhiteboard
 * 
 * This script runs database migrations for the AstroWhiteboard application.
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
const { Pool } = require('pg');
const pgUtils = require('../pg-utils');
const pgConfig = require('../../config/postgresql-config');

// Configuration
const config = {
  migrationsDir: path.join(__dirname, 'scripts'),
  testMode: process.argv.includes('--test')
};

// Get command line arguments
const command = process.argv[2] || 'status';
const targetVersion = process.argv[3] || null;

/**
 * Connect to PostgreSQL
 * @returns {Promise<Object>} PostgreSQL client
 */
async function connectToPostgreSQL() {
  try {
    const pool = new Pool(pgConfig);
    const client = await pool.connect();
    
    // Test connection
    await client.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully');
    
    return { pool, client };
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
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
 * @param {Object} client - PostgreSQL client
 * @returns {Promise<Array<string>>} Array of applied migration names
 */
async function getAppliedMigrations(client) {
  try {
    // Check if migrations table exists
    const tableExists = await pgUtils.tableExists('migrations');
    if (!tableExists) {
      // Create migrations table
      await client.query(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      return [];
    }
    
    // Get applied migrations
    const result = await client.query('SELECT name FROM migrations ORDER BY applied_at');
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

/**
 * Update applied migrations in database
 * @param {Object} client - PostgreSQL client
 * @param {string} migrationName - Migration name
 * @param {boolean} applied - Whether migration was applied or reverted
 * @returns {Promise<void>}
 */
async function updateAppliedMigrations(client, migrationName, applied) {
  try {
    if (applied) {
      // Add migration to applied list
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );
    } else {
      // Remove migration from applied list
      await client.query(
        'DELETE FROM migrations WHERE name = $1',
        [migrationName]
      );
    }
  } catch (error) {
    console.error('Error updating applied migrations:', error);
    throw error;
  }
}

/**
 * Run a migration
 * @param {Object} client - PostgreSQL client
 * @param {Object} migration - Migration object
 * @param {string} direction - 'up' or 'down'
 * @returns {Promise<boolean>} Success status
 */
async function runMigration(client, migration, direction) {
  console.log(`${direction === 'up' ? 'Applying' : 'Reverting'} migration: ${migration.name}`);
  
  if (config.testMode) {
    console.log(`[TEST MODE] Would ${direction === 'up' ? 'apply' : 'revert'} migration: ${migration.name}`);
    return true;
  }
  
  const startTime = Date.now();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Run migration
    const migrationModule = require(migration.path);
    await migrationModule[direction](client);
    
    // Update applied migrations
    await updateAppliedMigrations(client, migration.name, direction === 'up');
    
    // Commit transaction
    await client.query('COMMIT');
    
    const duration = Date.now() - startTime;
    console.log(`Migration ${direction === 'up' ? 'applied' : 'reverted'} successfully in ${duration}ms`);
    
    return true;
  } catch (error) {
    // Rollback transaction
    await client.query('ROLLBACK');
    
    const duration = Date.now() - startTime;
    console.error(`Migration failed after ${duration}ms:`, error);
    return false;
  }
}

/**
 * Apply pending migrations
 * @param {Object} client - PostgreSQL client
 * @param {string} targetVersion - Target version to migrate to (optional)
 * @returns {Promise<void>}
 */
async function applyMigrations(client, targetVersion = null) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(client);
  
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
    const success = await runMigration(client, migration, 'up');
    
    if (!success) {
      console.error(`Migration ${migration.name} failed, stopping`);
      break;
    }
  }
}

/**
 * Revert applied migrations
 * @param {Object} client - PostgreSQL client
 * @param {string} targetVersion - Target version to revert to (optional)
 * @returns {Promise<void>}
 */
async function revertMigrations(client, targetVersion = null) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(client);
  
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
    const success = await runMigration(client, migration, 'down');
    
    if (!success) {
      console.error(`Reverting migration ${migration.name} failed, stopping`);
      break;
    }
  }
}

/**
 * Show migration status
 * @param {Object} client - PostgreSQL client
 * @returns {Promise<void>}
 */
async function showMigrationStatus(client) {
  const migrationFiles = getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations(client);
  
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
  const { pool, client } = await connectToPostgreSQL();
  
  try {
    if (config.testMode) {
      console.log('Running in TEST MODE - no changes will be applied');
    }
    
    switch (command) {
      case 'up':
        await applyMigrations(client, targetVersion);
        break;
      case 'down':
        await revertMigrations(client, targetVersion);
        break;
      case 'status':
        await showMigrationStatus(client);
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
    client.release();
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);