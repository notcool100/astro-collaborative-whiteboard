# AstroWhiteboard Database Architecture

## Overview

This directory contains the database architecture, schema design, and related documentation for the AstroWhiteboard collaborative whiteboard application. The database layer is designed to support real-time collaboration, efficient data storage and retrieval, and scalability as the application grows.

## Database Selection

After careful analysis of the application requirements, we have selected **PostgreSQL as the primary database with Redis for caching and real-time features**. This combination provides:

- Robust relational data model with JSONB support for flexible data structures
- Strong transactional guarantees and data integrity
- Excellent support for complex queries and reporting
- Robust scalability options for growing user base
- Strong performance characteristics for both read and write operations

## Directory Structure

```
/database
├── README.md                       # This file
├── schema/                         # Database schema definitions
│   ├── schema.sql                  # Core SQL schema definition
│   ├── database_schema.md          # Core data models and relationships
│   ├── indexing_strategy.md        # Indexing approach for performance
│   └── query_optimization.md       # Query patterns and optimization
├── migrations/                     # Database migration scripts
│   ├── scripts/                    # Migration script files
│   ├── templates/                  # Templates for new migrations
│   └── migration_strategy.md       # Migration approach and best practices
├── backup_recovery_strategy.md     # Backup and disaster recovery plan
├── security_encryption_strategy.md # Security measures and encryption
├── performance_optimization.md     # Performance tuning guidelines
├── pg-utils.js                     # PostgreSQL utility functions
└── redis-utils.js                  # Redis utility functions
```

## Core Data Models

The database schema is built around these primary entities:

1. **Users**: User accounts, authentication, and profile information
2. **Workspaces**: Organizational units containing multiple whiteboards
3. **Workspace Members**: Users with access to workspaces and their roles
4. **Whiteboards**: Individual drawing canvases with metadata
5. **Whiteboard Versions**: Version history for whiteboards
6. **Whiteboard Elements**: Individual elements within whiteboards
7. **Collaboration Sessions**: Real-time collaboration tracking
8. **Activity Logs**: Audit trail of user actions

For detailed schema definitions, see the [schema.sql](./schema/schema.sql) file.

## Key Technical Decisions

### 1. Data Storage Strategy

Whiteboards are stored using a hybrid approach:
- Metadata in the main whiteboards table
- Elements stored in a separate table for efficient access
- Version history maintained in a dedicated table
- JSONB data type for flexible properties and metadata

This approach balances performance with flexibility, allowing efficient loading of large whiteboards and supporting version history.

### 2. Real-time Data Synchronization

Real-time collaboration is implemented using:
- PostgreSQL LISTEN/NOTIFY for data change notifications
- Redis pub/sub for real-time messaging
- WebSockets for client-server communication

This multi-layered approach ensures responsive collaboration while maintaining data consistency.

### 3. Indexing Strategy

A comprehensive indexing strategy has been designed to optimize common query patterns:
- B-tree indexes for primary and foreign keys
- GIN indexes for JSONB fields and arrays
- Partial indexes for filtered queries
- Expression indexes for computed values

### 4. Security Approach

Data security is implemented through:
- End-to-end encryption for whiteboard content
- Column-level encryption for sensitive user data
- Role-based access control for workspaces and whiteboards
- Secure key management with rotation policies

For the complete security strategy, see [security_encryption_strategy.md](./security_encryption_strategy.md).

## Getting Started for Developers

### Setting Up Local Development Environment

1. **Install PostgreSQL**:
   ```bash
   # For Ubuntu
   sudo apt-get install postgresql postgresql-contrib
   
   # For macOS with Homebrew
   brew install postgresql
   ```

2. **Install Redis**:
   ```bash
   # For Ubuntu
   sudo apt-get install redis-server
   
   # For macOS with Homebrew
   brew install redis
   ```

3. **Start Services**:
   ```bash
   # Start PostgreSQL
   sudo systemctl start postgresql
   
   # Start Redis
   sudo systemctl start redis
   
   # For macOS
   brew services start postgresql
   brew services start redis
   ```

4. **Create Database**:
   ```bash
   # Create database
   sudo -u postgres createdb astrowhiteboard
   
   # Create user (if needed)
   sudo -u postgres psql -c "CREATE USER yourusername WITH PASSWORD 'yourdad';"
   
   # Grant privileges
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE astrowhiteboard TO yourusername;"
   ```

5. **Initialize Database Schema**:
   ```bash
   # Run initial migration
   node database/migrations/migration-runner.js up
   ```

### Database Connection in Application

```javascript
// PostgreSQL connection
const { Pool } = require('pg');
const pgConfig = require('./config/postgresql-config');

const pool = new Pool(pgConfig);

// Example query
async function getUserById(userId) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

// Redis connection
const redis = require('redis');
const { promisify } = require('util');
const redisConfig = require('./config/redis-config');

const redisClient = redis.createClient({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password
});

// Promisify Redis commands
redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
redisClient.setAsync = promisify(redisClient.set).bind(redisClient);
redisClient.delAsync = promisify(redisClient.del).bind(redisClient);
```

### Using Database Utilities

```javascript
// Import PostgreSQL utilities
const pgUtils = require('./database/pg-utils');

// Example: Find a user
const user = await pgUtils.findOne('users', { email: 'user@example.com' });

// Example: Insert a new workspace
const workspaceId = await pgUtils.insert('workspaces', {
  name: 'New Workspace',
  description: 'A collaborative workspace',
  owner_id: userId,
  created_at: new Date(),
  updated_at: new Date()
});

// Example: Update a whiteboard with transaction
await pgUtils.withTransaction(async (client) => {
  // Update whiteboard
  await client.query(
    'UPDATE whiteboards SET name = $1, updated_at = NOW() WHERE id = $2',
    ['Updated Name', whiteboardId]
  );
  
  // Log activity
  await client.query(
    'INSERT INTO activity_logs (entity_type, entity_id, action, user_id) VALUES ($1, $2, $3, $4)',
    ['whiteboard', whiteboardId, 'update', userId]
  );
});
```

### Running Migrations

```bash
# Create a new migration
node database/migrations/generate.js "add user preferences"

# Run pending migrations
node database/migrations/migration-runner.js up

# Revert last migration
node database/migrations/migration-runner.js down

# Check migration status
node database/migrations/migration-runner.js status
```

## Performance Considerations

For optimal database performance:

1. **Use proper indexes** for all common query patterns
2. **Implement caching** for frequently accessed data
3. **Use prepared statements** for all queries
4. **Implement connection pooling** for efficient resource usage
5. **Use transactions** for operations that modify multiple tables
6. **Implement pagination** for large result sets
7. **Use EXPLAIN ANALYZE** to identify query bottlenecks

For detailed performance optimization guidelines, see [performance_optimization.md](./performance_optimization.md).

## Backup and Recovery

The backup strategy includes:

1. **Daily full backups** of PostgreSQL data
2. **Continuous WAL archiving** for point-in-time recovery
3. **Regular Redis RDB snapshots** for caching data
4. **Offsite backup storage** for disaster recovery

For the complete backup and recovery plan, see [backup_recovery_strategy.md](./backup_recovery_strategy.md).

## Scaling Considerations

As the application grows, consider:

1. **Vertical scaling** for initial growth
2. **Read replicas** for read-heavy workloads
3. **Connection pooling** for efficient resource usage
4. **Table partitioning** for large tables
5. **Redis clustering** for distributed caching
6. **Geographically distributed deployments** for global user base

## Contributing

When making changes to the database layer:

1. Document any schema changes in the appropriate files
2. Create migration scripts for schema modifications
3. Update indexes as needed
4. Test performance impact of changes
5. Follow security guidelines for any new data elements

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [node-postgres Documentation](https://node-postgres.com/)
- [Node Redis Client Documentation](https://github.com/NodeRedis/node-redis)