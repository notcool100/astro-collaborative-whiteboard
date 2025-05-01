# Database Indexing Strategy for PCS Draw

## Overview

This document outlines the indexing strategy for the PCS Draw collaborative whiteboard application. Proper indexing is crucial for maintaining performance as the application scales, especially for real-time collaborative features.

## Indexing Principles

1. **Index for Query Patterns**: Create indexes based on common query patterns, not just on all fields
2. **Compound Indexes**: Use compound indexes for queries that filter on multiple fields
3. **Covered Queries**: Design indexes to cover queries where possible (include all fields needed in the query)
4. **Sparse Indexes**: Use sparse indexes for fields that are not present in all documents
5. **Text Indexes**: Implement text indexes for search functionality
6. **TTL Indexes**: Use TTL indexes for data that should expire automatically
7. **Background Creation**: Create indexes in the background to avoid blocking operations
8. **Index Size Monitoring**: Regularly monitor index sizes and usage patterns

## MongoDB Indexes by Collection

### 1. Users Collection

```javascript
// Primary email lookup (for authentication)
db.users.createIndex({ "email": 1 }, { unique: true });

// Name search (for user discovery)
db.users.createIndex({ "name": 1 });

// Last active time (for sorting active users)
db.users.createIndex({ "lastActive": -1 });

// Compound index for name search with sorting by activity
db.users.createIndex({ "name": 1, "lastActive": -1 });
```

### 2. Workspaces Collection

```javascript
// Owner lookup (for listing user's owned workspaces)
db.workspaces.createIndex({ "ownerId": 1 });

// Member lookup (for listing workspaces user belongs to)
db.workspaces.createIndex({ "members.userId": 1 });

// Compound index for member role queries
db.workspaces.createIndex({ "members.userId": 1, "members.role": 1 });

// Name search (for workspace discovery)
db.workspaces.createIndex({ "name": "text", "description": "text" });

// Updated time (for sorting by recent activity)
db.workspaces.createIndex({ "updatedAt": -1 });

// Compound index for public workspaces with sorting
db.workspaces.createIndex({ "settings.isPublic": 1, "updatedAt": -1 });
```

### 3. Whiteboards Collection

```javascript
// Workspace lookup (for listing whiteboards in workspace)
db.whiteboards.createIndex({ "workspaceId": 1 });

// Compound index for workspace with sorting by update time
db.whiteboards.createIndex({ "workspaceId": 1, "updatedAt": -1 });

// Creator lookup (for listing whiteboards created by user)
db.whiteboards.createIndex({ "createdBy": 1 });

// Last editor lookup (for activity tracking)
db.whiteboards.createIndex({ "lastEditedBy": 1 });

// Name and tag search
db.whiteboards.createIndex({ "name": "text", "tags": "text" });

// Compound index for tags with sorting
db.whiteboards.createIndex({ "tags": 1, "updatedAt": -1 });
```

### 4. WhiteboardVersions Collection

```javascript
// Whiteboard lookup with version sorting
db.whiteboardVersions.createIndex({ "whiteboardId": 1, "version": -1 });

// Creator lookup (for filtering versions by creator)
db.whiteboardVersions.createIndex({ "createdBy": 1 });

// Creation time (for time-based queries)
db.whiteboardVersions.createIndex({ "createdAt": -1 });

// Compound index for whiteboard lookup with time sorting
db.whiteboardVersions.createIndex({ "whiteboardId": 1, "createdAt": -1 });
```

### 5. WhiteboardElements Collection

```javascript
// Whiteboard lookup (for loading all elements)
db.whiteboardElements.createIndex({ "whiteboardId": 1 });

// Version lookup (for loading elements at specific version)
db.whiteboardElements.createIndex({ "versionId": 1 });

// Compound index for whiteboard with element type
db.whiteboardElements.createIndex({ "whiteboardId": 1, "type": 1 });

// Compound index for whiteboard with z-index (for rendering order)
db.whiteboardElements.createIndex({ "whiteboardId": 1, "zIndex": 1 });

// Element ID lookup within whiteboard (for quick element access)
db.whiteboardElements.createIndex({ "whiteboardId": 1, "elementId": 1 }, { unique: true });

// Deleted elements filter
db.whiteboardElements.createIndex({ "whiteboardId": 1, "isDeleted": 1 });

// Creator lookup (for filtering by creator)
db.whiteboardElements.createIndex({ "createdBy": 1 });
```

### 6. CollaborationSessions Collection

```javascript
// Whiteboard lookup (for finding active sessions)
db.collaborationSessions.createIndex({ "whiteboardId": 1 });

// Active users lookup (for finding user sessions)
db.collaborationSessions.createIndex({ "activeUsers.userId": 1 });

// Last activity (for cleanup of stale sessions)
db.collaborationSessions.createIndex({ "lastActivity": 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL
```

### 7. ActivityLogs Collection

```javascript
// Entity lookup (for activity history of specific entity)
db.activityLogs.createIndex({ "entityType": 1, "entityId": 1 });

// User lookup (for user activity history)
db.activityLogs.createIndex({ "userId": 1 });

// Timestamp (for chronological sorting)
db.activityLogs.createIndex({ "timestamp": -1 });

// Compound index for entity with time sorting
db.activityLogs.createIndex({ "entityType": 1, "entityId": 1, "timestamp": -1 });

// TTL index for automatic cleanup of old logs
db.activityLogs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
```

## Redis Key Patterns and Indexing

Redis uses key-based access patterns rather than traditional indexes. However, we can optimize our key design:

1. **Consistent Key Naming**: Use consistent prefixes for related keys
   ```
   session:{id}
   whiteboard:{id}:users
   whiteboard:{id}:cursors
   ```

2. **Key Expiry**: Set appropriate TTL for temporary data
   ```
   EXPIRE "session:{id}" 86400  // 24 hours
   EXPIRE "whiteboard:{id}:cursors" 30  // 30 seconds
   ```

3. **Sorted Sets**: Use for time-ordered data
   ```
   ZADD "active_whiteboards" {timestamp} "{whiteboardId}"
   ```

4. **Hash Structures**: Use for grouped related data
   ```
   HSET "whiteboard:{id}:cursors" "{userId}" "{x}:{y}:{timestamp}"
   ```

## Index Maintenance Strategy

1. **Regular Analysis**:
   ```javascript
   // Run periodically to identify inefficient queries
   db.currentOp({ "op": "query", "microsecs_running": { $gt: 100000 } })
   
   // Analyze index usage
   db.users.aggregate([{ $indexStats: {} }])
   ```

2. **Index Rebuilding**:
   ```javascript
   // Rebuild indexes periodically during low-traffic periods
   db.whiteboards.reIndex()
   ```

3. **Unused Index Removal**:
   ```javascript
   // Remove indexes that show low usage after evaluation
   db.users.dropIndex("unused_index_name")
   ```

## Performance Monitoring

1. **Query Performance**:
   ```javascript
   // Enable profiling for slow queries
   db.setProfilingLevel(1, { slowms: 100 })
   
   // Review slow queries
   db.system.profile.find({ "millis": { $gt: 100 } }).sort({ "ts": -1 })
   ```

2. **Index Size Monitoring**:
   ```javascript
   // Monitor index sizes
   db.users.stats().indexSizes
   ```

3. **Cache Hit Ratio** (Redis):
   ```
   redis-cli INFO stats | grep hit_rate
   ```

## Scaling Considerations

1. **Sharding Keys**:
   - Users: `_id` or hash of `email`
   - Workspaces: `_id`
   - Whiteboards: `workspaceId` (to keep related data together)

2. **Read Replicas**:
   - Configure read replicas for read-heavy operations
   - Direct reporting and analytics queries to secondary nodes

3. **Index Distribution**:
   - Ensure indexes are properly distributed across shards
   - Monitor index coverage across sharded collections