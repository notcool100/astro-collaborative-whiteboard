# PCS Draw Database Architecture

## Overview

This directory contains the database architecture, schema design, and related documentation for the PCS Draw collaborative whiteboard application. The database layer is designed to support real-time collaboration, efficient data storage and retrieval, and scalability as the application grows.

## Database Selection

After careful analysis of the application requirements, we have selected **MongoDB as the primary database with Redis for caching and real-time features**. This combination provides:

- Document-oriented storage that aligns with whiteboard data structures
- Excellent support for real-time collaboration features
- Robust scalability options for growing user base
- Strong performance characteristics for both read and write operations
- Flexible schema that can evolve with the application

For a detailed analysis of database options and justification for this selection, see [database_selection.md](./database_selection.md).

## Directory Structure

```
/database
├── README.md                       # This file
├── schema/                         # Database schema definitions
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
└── database_selection.md           # Database technology selection analysis
```

## Core Data Models

The database schema is built around these primary entities:

1. **Users**: User accounts, authentication, and profile information
2. **Workspaces**: Organizational units containing multiple whiteboards
3. **Whiteboards**: Individual drawing canvases with metadata
4. **WhiteboardVersions**: Version history for whiteboards
5. **WhiteboardElements**: Individual elements within whiteboards
6. **CollaborationSessions**: Real-time collaboration tracking

For detailed schema definitions, see [database_schema.md](./schema/database_schema.md).

## Key Technical Decisions

### 1. Document Storage Strategy

Whiteboards are stored using a hybrid approach:
- Metadata in the main whiteboard document
- Elements stored in a separate collection for efficient access
- Version history maintained in a dedicated collection

This approach balances performance with flexibility, allowing efficient loading of large whiteboards and supporting version history.

### 2. Real-time Data Synchronization

Real-time collaboration is implemented using:
- MongoDB change streams for data synchronization
- Redis pub/sub for real-time messaging
- WebSockets for client-server communication

This multi-layered approach ensures responsive collaboration while maintaining data consistency.

### 3. Indexing Strategy

A comprehensive indexing strategy has been designed to optimize common query patterns:
- Compound indexes for workspace and whiteboard queries
- Text indexes for search functionality
- Geospatial indexes for future location-based features

For details, see [indexing_strategy.md](./schema/indexing_strategy.md).

### 4. Security Approach

Data security is implemented through:
- End-to-end encryption for whiteboard content
- Field-level encryption for sensitive user data
- Role-based access control for workspaces and whiteboards
- Secure key management with rotation policies

For the complete security strategy, see [security_encryption_strategy.md](./security_encryption_strategy.md).

## Getting Started for Developers

### Setting Up Local Development Environment

1. **Install MongoDB Community Edition**:
   ```bash
   # For Ubuntu
   sudo apt-get install mongodb-org
   
   # For macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
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
   # Start MongoDB
   sudo systemctl start mongod
   
   # Start Redis
   sudo systemctl start redis
   
   # For macOS
   brew services start mongodb-community
   brew services start redis
   ```

4. **Initialize Database**:
   ```bash
   # Create database and collections
   mongo pcsdraw --eval "db.createCollection('users'); db.createCollection('workspaces'); db.createCollection('whiteboards'); db.createCollection('whiteboardElements'); db.createCollection('whiteboardVersions');"
   ```

### Database Connection in Application

```javascript
// MongoDB connection
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcsdraw', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});

// Redis connection
const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient(process.env.REDIS_URL || 'redis://localhost:6379');

// Promisify Redis commands
redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
redisClient.setAsync = promisify(redisClient.set).bind(redisClient);
redisClient.delAsync = promisify(redisClient.del).bind(redisClient);
```

### Running Migrations

```bash
# Create a new migration
node database/migrations/generate.js "add user preferences"

# Run pending migrations
node database/migrations/migration-runner.js up

# Revert last migration
node database/migrations/migration-runner.js down
```

## Performance Considerations

For optimal database performance:

1. **Use proper indexes** for all common query patterns
2. **Implement caching** for frequently accessed data
3. **Batch operations** when making multiple updates
4. **Use projection** to retrieve only needed fields
5. **Implement pagination** for large result sets

For detailed performance optimization guidelines, see [performance_optimization.md](./performance_optimization.md).

## Backup and Recovery

The backup strategy includes:

1. **Daily full backups** of MongoDB data
2. **Hourly incremental backups** for recent changes
3. **Continuous oplog backup** for point-in-time recovery
4. **Regular Redis RDB snapshots** for caching data

For the complete backup and recovery plan, see [backup_recovery_strategy.md](./backup_recovery_strategy.md).

## Scaling Considerations

As the application grows, consider:

1. **Horizontal scaling** through MongoDB sharding
2. **Read replicas** for read-heavy workloads
3. **Redis clustering** for distributed caching
4. **Connection pooling** for efficient resource usage
5. **Geographically distributed deployments** for global user base

## Contributing

When making changes to the database layer:

1. Document any schema changes in the appropriate files
2. Create migration scripts for schema modifications
3. Update indexes as needed and document in indexing_strategy.md
4. Test performance impact of changes
5. Follow security guidelines for any new data elements

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Mongoose ODM Documentation](https://mongoosejs.com/docs/)
- [Node Redis Client Documentation](https://github.com/NodeRedis/node-redis)