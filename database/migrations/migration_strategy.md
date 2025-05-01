# Database Migration Strategy for PCS Draw

## Overview

This document outlines the database migration strategy for the PCS Draw collaborative whiteboard application. A well-defined migration strategy is essential for:

1. Evolving the database schema as application requirements change
2. Ensuring data integrity during schema changes
3. Minimizing downtime during migrations
4. Supporting rollback capabilities in case of issues
5. Maintaining version control of database schema

## Migration Framework

We recommend using [Mongoose Migrations](https://github.com/mongoose-migrations/mongoose-migrations) for MongoDB migrations, which provides:

- Version tracking of migrations
- Up and down migration methods
- Command-line interface for running migrations
- Integration with Mongoose ODM

For Redis data migrations, we'll use custom scripts with appropriate locking mechanisms.

## Migration Directory Structure

```
/database
  /migrations
    /scripts                  # Migration script files
      20240601000000-initial-schema.js
      20240615000000-add-user-preferences.js
      ...
    /templates                # Templates for generating new migrations
      migration-template.js
    migration_strategy.md     # This document
    migration-runner.js       # Script to run migrations
    migration-status.js       # Script to check migration status
  /seeds                      # Seed data for development
  /schema                     # Schema definitions
```

## Migration Naming Convention

Migration files should follow this naming convention:
```
YYYYMMDDHHMMSS-descriptive-name.js
```

Where:
- `YYYYMMDDHHMMSS` is a timestamp ensuring unique ordering
- `descriptive-name` is a kebab-case description of the migration

## Migration Script Template

```javascript
// migrations/scripts/YYYYMMDDHHMMSS-descriptive-name.js

/**
 * Migration: [Descriptive Name]
 * 
 * Description: [Detailed description of what this migration does]
 * 
 * Changes:
 * - [Change 1]
 * - [Change 2]
 */

const mongoose = require('mongoose');

module.exports = {
  /**
   * Apply the migration
   */
  async up(db, client) {
    // Implementation for applying the migration
    // Example: Add a new field to all documents in a collection
    await db.collection('users').updateMany(
      {},
      { $set: { newField: 'defaultValue' } }
    );
    
    // Example: Create a new index
    await db.collection('whiteboards').createIndex(
      { newField: 1 },
      { background: true }
    );
  },

  /**
   * Revert the migration
   */
  async down(db, client) {
    // Implementation for reverting the migration
    // Example: Remove the field added in the up migration
    await db.collection('users').updateMany(
      {},
      { $unset: { newField: '' } }
    );
    
    // Example: Drop the index created in the up migration
    await db.collection('whiteboards').dropIndex('newField_1');
  }
};
```

## Migration Workflow

### 1. Creating a New Migration

```bash
# Generate a new migration file
node database/migrations/generate.js "add user preferences"
```

This will create a new file with the current timestamp:
```
database/migrations/scripts/20240601123456-add-user-preferences.js
```

### 2. Implementing the Migration

Edit the generated file to implement the `up` and `down` methods according to the required schema changes.

### 3. Testing the Migration

```bash
# Test the migration in development environment
NODE_ENV=development node database/migrations/migration-runner.js --test
```

### 4. Running the Migration

```bash
# Apply pending migrations
NODE_ENV=production node database/migrations/migration-runner.js up

# Apply migrations up to a specific version
NODE_ENV=production node database/migrations/migration-runner.js up 20240601123456

# Revert the most recent migration
NODE_ENV=production node database/migrations/migration-runner.js down

# Revert all migrations
NODE_ENV=production node database/migrations/migration-runner.js down 0
```

### 5. Checking Migration Status

```bash
# Check which migrations have been applied
node database/migrations/migration-status.js
```

## Migration Strategies for Different Types of Changes

### 1. Adding New Fields

```javascript
// Simple field addition
async up(db, client) {
  await db.collection('users').updateMany(
    {},
    { $set: { preferences: { theme: 'light', notifications: true } } }
  );
}

async down(db, client) {
  await db.collection('users').updateMany(
    {},
    { $unset: { preferences: '' } }
  );
}
```

### 2. Renaming Fields

```javascript
// Field renaming
async up(db, client) {
  await db.collection('whiteboards').updateMany(
    {},
    { $rename: { 'oldFieldName': 'newFieldName' } }
  );
}

async down(db, client) {
  await db.collection('whiteboards').updateMany(
    {},
    { $rename: { 'newFieldName': 'oldFieldName' } }
  );
}
```

### 3. Changing Field Type

```javascript
// Converting string IDs to ObjectIds
async up(db, client) {
  const whiteboards = await db.collection('whiteboards').find({}).toArray();
  
  for (const whiteboard of whiteboards) {
    if (typeof whiteboard.workspaceId === 'string') {
      await db.collection('whiteboards').updateOne(
        { _id: whiteboard._id },
        { $set: { workspaceId: mongoose.Types.ObjectId(whiteboard.workspaceId) } }
      );
    }
  }
}
```

### 4. Data Transformations

```javascript
// Complex data transformation
async up(db, client) {
  const whiteboards = await db.collection('whiteboards').find({}).toArray();
  
  for (const whiteboard of whiteboards) {
    // Extract data from old structure
    const elements = whiteboard.elements || [];
    
    // Create new documents in the elements collection
    if (elements.length > 0) {
      await db.collection('whiteboardElements').insertMany(
        elements.map(element => ({
          whiteboardId: whiteboard._id,
          elementId: element.id,
          type: element.type,
          properties: element.properties,
          zIndex: element.zIndex || 0,
          createdBy: whiteboard.createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
    }
    
    // Remove elements from the whiteboard document
    await db.collection('whiteboards').updateOne(
      { _id: whiteboard._id },
      { $unset: { elements: '' } }
    );
  }
}
```

### 5. Index Changes

```javascript
// Adding and removing indexes
async up(db, client) {
  await db.collection('whiteboards').createIndex(
    { workspaceId: 1, updatedAt: -1 },
    { background: true }
  );
  
  // Drop an old index if it exists
  const indexes = await db.collection('whiteboards').indexes();
  const oldIndex = indexes.find(idx => idx.name === 'oldIndexName');
  
  if (oldIndex) {
    await db.collection('whiteboards').dropIndex('oldIndexName');
  }
}

async down(db, client) {
  // Recreate the old index
  await db.collection('whiteboards').createIndex(
    { oldField1: 1, oldField2: -1 },
    { name: 'oldIndexName', background: true }
  );
  
  // Drop the new index
  await db.collection('whiteboards').dropIndex('workspaceId_1_updatedAt_-1');
}
```

## Handling Large Collections

For collections with a large number of documents, migrations can be resource-intensive and time-consuming. Here are strategies for handling large collections:

### 1. Batched Updates

```javascript
async up(db, client) {
  const batchSize = 1000;
  let processed = 0;
  let hasMore = true;
  
  while (hasMore) {
    const whiteboards = await db.collection('whiteboards')
      .find({})
      .skip(processed)
      .limit(batchSize)
      .toArray();
    
    if (whiteboards.length === 0) {
      hasMore = false;
      break;
    }
    
    const operations = whiteboards.map(whiteboard => ({
      updateOne: {
        filter: { _id: whiteboard._id },
        update: { $set: { newField: 'value' } }
      }
    }));
    
    await db.collection('whiteboards').bulkWrite(operations);
    
    processed += whiteboards.length;
    console.log(`Processed ${processed} whiteboards`);
  }
}
```

### 2. Background Processing

For very large collections, consider implementing a background job:

```javascript
async up(db, client) {
  // Create a migration tracking collection if it doesn't exist
  if (!(await db.listCollections({ name: 'migrationTasks' }).hasNext())) {
    await db.createCollection('migrationTasks');
  }
  
  // Create a task for background processing
  await db.collection('migrationTasks').insertOne({
    name: '20240601123456-large-collection-update',
    status: 'pending',
    progress: 0,
    total: await db.collection('whiteboards').countDocuments({}),
    createdAt: new Date()
  });
  
  // The actual migration will be handled by a background process
  console.log('Migration task created for background processing');
}
```

Then implement a background worker that:
1. Checks for pending migration tasks
2. Processes them in batches
3. Updates the progress in the migrationTasks collection
4. Marks the task as complete when finished

### 3. Temporary Collections

For complex transformations, use temporary collections:

```javascript
async up(db, client) {
  // Create a new collection with the desired schema
  await db.createCollection('whiteboards_new');
  
  // Create indexes on the new collection
  await db.collection('whiteboards_new').createIndex(
    { workspaceId: 1, updatedAt: -1 },
    { background: true }
  );
  
  // Process documents in batches
  const batchSize = 1000;
  let processed = 0;
  let hasMore = true;
  
  while (hasMore) {
    const whiteboards = await db.collection('whiteboards')
      .find({})
      .skip(processed)
      .limit(batchSize)
      .toArray();
    
    if (whiteboards.length === 0) {
      hasMore = false;
      break;
    }
    
    // Transform documents
    const transformedWhiteboards = whiteboards.map(whiteboard => ({
      _id: whiteboard._id,
      name: whiteboard.name,
      workspaceId: whiteboard.workspaceId,
      // Add new fields and transform existing ones
      newStructure: transformOldToNew(whiteboard.oldStructure),
      createdAt: whiteboard.createdAt,
      updatedAt: whiteboard.updatedAt
    }));
    
    // Insert into new collection
    await db.collection('whiteboards_new').insertMany(transformedWhiteboards);
    
    processed += whiteboards.length;
    console.log(`Processed ${processed} whiteboards`);
  }
  
  // Rename collections to swap old with new
  await db.collection('whiteboards').rename('whiteboards_old');
  await db.collection('whiteboards_new').rename('whiteboards');
  
  // Optionally drop the old collection if everything is verified
  // await db.collection('whiteboards_old').drop();
}
```

## Deployment Strategy

### 1. Development Environment

- Run migrations automatically during application startup
- Use seed data to populate the database after migrations

### 2. Testing Environment

- Run migrations as a separate step before deploying new application code
- Verify migration success before proceeding with deployment
- Run automated tests against the migrated database

### 3. Production Environment

- Schedule migrations during low-traffic periods
- Implement a maintenance mode if necessary
- Use a blue-green deployment strategy:
  1. Set up a new database instance
  2. Run migrations on the new instance
  3. Switch application to the new database
  4. Keep the old database as a backup

## Rollback Plan

For each migration, ensure a solid rollback plan:

1. **Backup**: Take a database backup before running migrations
2. **Dry Run**: Test migrations in a staging environment first
3. **Monitoring**: Monitor application performance after migration
4. **Rollback Procedure**:
   - Run the `down` migration to revert schema changes
   - If necessary, restore from backup
   - Switch back to the previous application version

## Monitoring and Logging

Implement comprehensive logging for migrations:

```javascript
// Enhanced migration runner with logging
const runMigration = async (migration) => {
  console.log(`Starting migration: ${migration.name}`);
  const startTime = Date.now();
  
  try {
    await migration.up(db, client);
    
    const duration = Date.now() - startTime;
    console.log(`Migration completed successfully in ${duration}ms`);
    
    // Record successful migration
    await db.collection('migrations').insertOne({
      name: migration.name,
      appliedAt: new Date(),
      duration,
      status: 'success'
    });
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Migration failed after ${duration}ms:`, error);
    
    // Record failed migration
    await db.collection('migrations').insertOne({
      name: migration.name,
      appliedAt: new Date(),
      duration,
      status: 'failed',
      error: error.toString(),
      stack: error.stack
    });
    
    return false;
  }
};
```

## Redis Migration Strategy

For Redis data migrations:

```javascript
// Example Redis migration script
const redis = require('redis');
const { promisify } = require('util');

const migrateRedisData = async () => {
  const client = redis.createClient(process.env.REDIS_URL);
  
  // Promisify Redis commands
  const keys = promisify(client.keys).bind(client);
  const get = promisify(client.get).bind(client);
  const set = promisify(client.set).bind(client);
  const del = promisify(client.del).bind(client);
  
  try {
    // Find all keys matching a pattern
    const oldKeys = await keys('old-prefix:*');
    
    for (const oldKey of oldKeys) {
      // Get data from old key
      const data = await get(oldKey);
      
      // Transform key name
      const newKey = oldKey.replace('old-prefix:', 'new-prefix:');
      
      // Transform data if needed
      const transformedData = transformRedisData(data);
      
      // Set data with new key
      await set(newKey, transformedData);
      
      // Optionally delete old key
      // await del(oldKey);
    }
    
    console.log(`Migrated ${oldKeys.length} Redis keys`);
  } catch (error) {
    console.error('Redis migration failed:', error);
  } finally {
    client.quit();
  }
};

const transformRedisData = (data) => {
  // Implement data transformation logic
  try {
    const parsed = JSON.parse(data);
    // Transform the data structure
    parsed.newField = 'value';
    return JSON.stringify(parsed);
  } catch (e) {
    // Handle non-JSON data
    return data;
  }
};
```

## Schema Version Tracking

Maintain a schema version document to track the current database schema version:

```javascript
// Initialize schema version tracking
const initSchemaVersion = async (db) => {
  const schemaVersion = await db.collection('system').findOne({ _id: 'schemaVersion' });
  
  if (!schemaVersion) {
    await db.collection('system').insertOne({
      _id: 'schemaVersion',
      version: '1.0.0',
      lastUpdated: new Date(),
      migrations: []
    });
  }
};

// Update schema version after migrations
const updateSchemaVersion = async (db, version, migrations) => {
  await db.collection('system').updateOne(
    { _id: 'schemaVersion' },
    {
      $set: {
        version,
        lastUpdated: new Date()
      },
      $push: {
        migrations: {
          $each: migrations.map(m => ({
            name: m.name,
            appliedAt: new Date()
          }))
        }
      }
    }
  );
};
```

## Conclusion

This migration strategy provides a robust framework for evolving the PCS Draw database schema over time. By following these practices, we can ensure:

1. **Data Integrity**: Migrations maintain data consistency
2. **Minimal Downtime**: Efficient migration strategies reduce impact on users
3. **Rollback Capability**: Every change can be reverted if needed
4. **Scalability**: Approaches for handling large datasets
5. **Traceability**: Clear tracking of all schema changes

The database team should review and update this strategy as the application evolves and new requirements emerge.