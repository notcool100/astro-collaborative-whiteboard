/**
 * Database Initialization Script for AstroWhiteboard
 * 
 * This script initializes the PostgreSQL database for the AstroWhiteboard application.
 * It creates the database if it doesn't exist, runs migrations, and sets up initial data.
 * 
 * Usage:
 *   node init-db.js [--force] [--seed]
 *   
 *   Options:
 *     --force: Drop and recreate the database
 *     --seed: Seed the database with sample data
 */

require('dotenv').config();
const { Pool } = require('pg');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const pgUtils = require('./pg-utils');
const pgConfig = require('../config/postgresql-config');

// Command line arguments
const args = process.argv.slice(2);
const forceRecreate = args.includes('--force');
const seedData = args.includes('--seed');

// Configuration
const dbName = pgConfig.database;
const adminConfig = {
  ...pgConfig,
  database: 'postgres' // Connect to default postgres database for admin operations
};

/**
 * Execute a shell command
 * @param {string} command - Command to execute
 * @returns {Promise<string>} - Command output
 */
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Check if database exists
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} dbName - Database name
 * @returns {Promise<boolean>} - True if database exists
 */
async function databaseExists(pool, dbName) {
  const result = await pool.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );
  return result.rows.length > 0;
}

/**
 * Create database
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} dbName - Database name
 * @returns {Promise<void>}
 */
async function createDatabase(pool, dbName) {
  console.log(`Creating database: ${dbName}`);
  await pool.query(`CREATE DATABASE ${dbName}`);
  console.log(`Database ${dbName} created successfully`);
}

/**
 * Drop database
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} dbName - Database name
 * @returns {Promise<void>}
 */
async function dropDatabase(pool, dbName) {
  console.log(`Dropping database: ${dbName}`);
  
  // Terminate all connections to the database
  await pool.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${dbName}'
    AND pid <> pg_backend_pid()
  `);
  
  await pool.query(`DROP DATABASE IF EXISTS ${dbName}`);
  console.log(`Database ${dbName} dropped successfully`);
}

/**
 * Run database migrations
 * @returns {Promise<void>}
 */
async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    const migrationRunner = path.join(__dirname, 'migrations', 'migration-runner.js');
    const output = await execCommand(`node ${migrationRunner} up`);
    console.log(output);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

/**
 * Seed database with sample data
 * @returns {Promise<void>}
 */
async function seedDatabase() {
  console.log('Seeding database with sample data...');
  
  try {
    // Connect to the database
    const pool = new Pool(pgConfig);
    
    // Create admin user
    const adminUser = await pgUtils.insert('users', {
      email: 'admin@example.com',
      password: '$2a$10$JdJO7S7.ZUbCDLJL1MFl3.AEEwBUXYp7guV1pYQPAYzM/X9EwvV86', // 'password123'
      name: 'Admin User',
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff',
      preferences: JSON.stringify({
        theme: 'dark',
        language: 'en',
        notifications: true
      })
    }, '*');
    
    console.log('Created admin user:', adminUser.email);
    
    // Create demo user
    const demoUser = await pgUtils.insert('users', {
      email: 'demo@example.com',
      password: '$2a$10$JdJO7S7.ZUbCDLJL1MFl3.AEEwBUXYp7guV1pYQPAYzM/X9EwvV86', // 'password123'
      name: 'Demo User',
      avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'en',
        notifications: true
      })
    }, '*');
    
    console.log('Created demo user:', demoUser.email);
    
    // Create workspace
    const workspace = await pgUtils.insert('workspaces', {
      name: 'Demo Workspace',
      description: 'A workspace for demonstration purposes',
      owner_id: adminUser.id,
      settings: JSON.stringify({
        isPublic: true,
        defaultPermission: 'view'
      })
    }, '*');
    
    console.log('Created workspace:', workspace.name);
    
    // Add demo user to workspace
    await pgUtils.insert('workspace_members', {
      workspace_id: workspace.id,
      user_id: demoUser.id,
      role: 'editor'
    });
    
    console.log('Added demo user to workspace');
    
    // Create whiteboard
    const whiteboard = await pgUtils.insert('whiteboards', {
      name: 'Welcome Whiteboard',
      workspace_id: workspace.id,
      created_by: adminUser.id,
      created_by_name: adminUser.name,
      tags: ['welcome', 'demo', 'getting-started']
    }, '*');
    
    console.log('Created whiteboard:', whiteboard.name);
    
    // Create whiteboard version
    const version = await pgUtils.insert('whiteboard_versions', {
      whiteboard_id: whiteboard.id,
      version: 1,
      data: JSON.stringify({
        width: 1920,
        height: 1080,
        background: '#ffffff'
      }),
      created_by: adminUser.id
    }, '*');
    
    console.log('Created whiteboard version');
    
    // Create whiteboard elements
    const elements = [
      {
        whiteboard_id: whiteboard.id,
        element_id: 'elem-1',
        type: 'rectangle',
        properties: JSON.stringify({
          position: { x: 100, y: 100 },
          size: { width: 200, height: 100 },
          strokeColor: '#000000',
          fillColor: '#f5f5f5',
          strokeWidth: 2,
          opacity: 1
        }),
        z_index: 1,
        created_by: adminUser.id
      },
      {
        whiteboard_id: whiteboard.id,
        element_id: 'elem-2',
        type: 'text',
        properties: JSON.stringify({
          position: { x: 120, y: 140 },
          size: { width: 160, height: 40 },
          text: 'Welcome to AstroWhiteboard!',
          fontSize: 16,
          fontFamily: 'Arial',
          textAlign: 'center',
          fillColor: '#000000',
          opacity: 1
        }),
        z_index: 2,
        created_by: adminUser.id
      },
      {
        whiteboard_id: whiteboard.id,
        element_id: 'elem-3',
        type: 'circle',
        properties: JSON.stringify({
          position: { x: 400, y: 150 },
          size: { width: 100, height: 100 },
          strokeColor: '#ff0000',
          fillColor: '#ffdddd',
          strokeWidth: 2,
          opacity: 1
        }),
        z_index: 1,
        created_by: adminUser.id
      }
    ];
    
    for (const element of elements) {
      await pgUtils.insert('whiteboard_elements', element);
    }
    
    console.log(`Created ${elements.length} whiteboard elements`);
    
    // Log activity
    await pgUtils.insert('activity_logs', {
      entity_type: 'whiteboard',
      entity_id: whiteboard.id,
      action: 'create',
      user_id: adminUser.id,
      metadata: JSON.stringify({
        workspaceId: workspace.id,
        workspaceName: workspace.name
      })
    });
    
    console.log('Logged activity');
    
    // Close pool
    await pool.end();
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Initializing AstroWhiteboard database...');
  
  // Connect to postgres database for admin operations
  const adminPool = new Pool(adminConfig);
  
  try {
    // Check if database exists
    const exists = await databaseExists(adminPool, dbName);
    
    if (exists) {
      if (forceRecreate) {
        await dropDatabase(adminPool, dbName);
        await createDatabase(adminPool, dbName);
      } else {
        console.log(`Database ${dbName} already exists`);
      }
    } else {
      await createDatabase(adminPool, dbName);
    }
    
    // Close admin pool
    await adminPool.end();
    
    // Run migrations
    await runMigrations();
    
    // Seed database if requested
    if (seedData) {
      await seedDatabase();
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);