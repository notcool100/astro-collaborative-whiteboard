# Database Performance Optimization for PCS Draw

## Overview

This document outlines performance optimization strategies for the PCS Draw collaborative whiteboard application's database layer. Optimizing database performance is crucial for:

1. Ensuring responsive user experience, especially during real-time collaboration
2. Supporting concurrent users on the same whiteboard
3. Efficiently handling large whiteboards with many elements
4. Scaling the application as user base grows
5. Minimizing infrastructure costs while maintaining performance

## Performance Benchmarks and Goals

| Operation | Target Response Time | Load Condition |
|-----------|----------------------|----------------|
| User Authentication | < 100ms | Peak load |
| Whiteboard Initial Load | < 500ms | 100 elements |
| Whiteboard Initial Load | < 2s | 1000+ elements |
| Element Creation/Update | < 50ms | 10+ concurrent users |
| Workspace Listing | < 200ms | 50+ workspaces |
| Search Operations | < 500ms | Complex queries |
| Real-time Updates | < 100ms | 20+ concurrent users |

## MongoDB Performance Optimization

### Schema Design Optimization

#### 1. Denormalization Strategies

Strategically denormalize data to reduce joins:

```javascript
// BEFORE: Normalized schema requiring joins
// Whiteboard document
{
  _id: ObjectId("5f8a7b2d9d3e2a1b3c4d5e6f"),
  name: "Project Roadmap",
  workspaceId: ObjectId("5f8a7b2d9d3e2a1b3c4d5e7f"),
  createdBy: ObjectId("5f8a7b2d9d3e2a1b3c4d5e8f"),
  // No workspace or user information
}

// AFTER: Denormalized schema with embedded information
// Whiteboard document with denormalized data
{
  _id: ObjectId("5f8a7b2d9d3e2a1b3c4d5e6f"),
  name: "Project Roadmap",
  workspaceId: ObjectId("5f8a7b2d9d3e2a1b3c4d5e7f"),
  workspaceName: "Product Team", // Denormalized from workspace
  createdBy: ObjectId("5f8a7b2d9d3e2a1b3c4d5e8f"),
  createdByName: "John Doe", // Denormalized from user
  createdByAvatar: "https://example.com/avatar.jpg", // Denormalized from user
  // Other fields...
}
```

Implement a denormalization strategy that balances performance with data consistency:

```javascript
// Update denormalized data when source changes
const updateUserReferences = async (userId, updates) => {
  // Update user name in whiteboards
  if (updates.name) {
    await db.whiteboards.updateMany(
      { createdBy: userId },
      { $set: { createdByName: updates.name } }
    );
    
    await db.whiteboardElements.updateMany(
      { createdBy: userId },
      { $set: { createdByName: updates.name } }
    );
  }
  
  // Update user avatar in whiteboards
  if (updates.avatar) {
    await db.whiteboards.updateMany(
      { createdBy: userId },
      { $set: { createdByAvatar: updates.avatar } }
    );
  }
};
```

#### 2. Document Structure Optimization

Optimize document structure for common access patterns:

```javascript
// BEFORE: Inefficient structure for access pattern
{
  _id: ObjectId("5f8a7b2d9d3e2a1b3c4d5e6f"),
  name: "Design Whiteboard",
  elements: [
    { id: "elem1", type: "rectangle", properties: { /* large object */ } },
    { id: "elem2", type: "circle", properties: { /* large object */ } },
    // Potentially hundreds or thousands of elements
  ]
}

// AFTER: Optimized structure for element-level access
// Whiteboard document (parent)
{
  _id: ObjectId("5f8a7b2d9d3e2a1b3c4d5e6f"),
  name: "Design Whiteboard",
  elementCount: 1250,
  lastModified: ISODate("2023-06-01T10:30:45Z")
}

// Separate collection for elements
// Each element as a separate document
{
  _id: ObjectId("5f8a7b2d9d3e2a1b3c4d5e70"),
  whiteboardId: ObjectId("5f8a7b2d9d3e2a1b3c4d5e6f"),
  elementId: "elem1",
  type: "rectangle",
  properties: { /* large object */ },
  position: { x: 100, y: 200 },
  zIndex: 1
}
```

#### 3. Field Projection

Always use field projection to retrieve only necessary data:

```javascript
// BAD: Retrieving entire documents
const whiteboards = await db.whiteboards.find({ workspaceId }).toArray();

// GOOD: Using projection to retrieve only needed fields
const whiteboards = await db.whiteboards.find(
  { workspaceId },
  { 
    name: 1, 
    thumbnail: 1, 
    updatedAt: 1, 
    createdByName: 1,
    elementCount: 1
  }
).toArray();
```

### Indexing Optimization

#### 1. Compound Index Design

Design compound indexes based on query patterns:

```javascript
// Query pattern: Find whiteboards in a workspace, sorted by update time
db.whiteboards.find({ workspaceId: ObjectId("...") }).sort({ updatedAt: -1 });

// Optimal compound index for this query
db.whiteboards.createIndex({ workspaceId: 1, updatedAt: -1 });

// Query pattern: Find elements in a whiteboard with specific type
db.whiteboardElements.find({ 
  whiteboardId: ObjectId("..."),
  type: "rectangle"
});

// Optimal compound index for this query
db.whiteboardElements.createIndex({ whiteboardId: 1, type: 1 });
```

#### 2. Covered Queries

Design indexes to support covered queries:

```javascript
// Create an index that includes all fields needed in the query
db.whiteboards.createIndex(
  { workspaceId: 1, updatedAt: -1 },
  { name: 1, thumbnail: 1, elementCount: 1 }
);

// Query that can be satisfied entirely from the index (covered query)
db.whiteboards.find(
  { workspaceId: ObjectId("...") },
  { name: 1, thumbnail: 1, elementCount: 1, _id: 0 }
).sort({ updatedAt: -1 });
```

#### 3. Index Intersection

Leverage index intersection for complex queries:

```javascript
// Create separate indexes that can be intersected
db.whiteboardElements.createIndex({ whiteboardId: 1 });
db.whiteboardElements.createIndex({ type: 1 });
db.whiteboardElements.createIndex({ "properties.color": 1 });

// Query that can use index intersection
db.whiteboardElements.find({
  whiteboardId: ObjectId("..."),
  type: "text",
  "properties.color": "red"
});
```

#### 4. Partial Indexes

Use partial indexes for queries on subsets of data:

```javascript
// Partial index for active whiteboards only
db.whiteboards.createIndex(
  { updatedAt: -1 },
  { partialFilterExpression: { isArchived: { $ne: true } } }
);

// Query that uses the partial index
db.whiteboards.find(
  { isArchived: { $ne: true } }
).sort({ updatedAt: -1 });
```

### Query Optimization

#### 1. Aggregation Pipeline Optimization

Optimize aggregation pipelines:

```javascript
// BEFORE: Inefficient aggregation
db.whiteboards.aggregate([
  { $match: { workspaceId: ObjectId("...") } },
  { $lookup: {
      from: "users",
      localField: "createdBy",
      foreignField: "_id",
      as: "creator"
    }
  },
  { $unwind: "$creator" },
  { $lookup: {
      from: "whiteboardElements",
      localField: "_id",
      foreignField: "whiteboardId",
      as: "elements"
    }
  },
  { $project: {
      name: 1,
      createdBy: "$creator.name",
      elementCount: { $size: "$elements" },
      updatedAt: 1
    }
  },
  { $sort: { updatedAt: -1 } }
]);

// AFTER: Optimized aggregation
db.whiteboards.aggregate([
  // Start with the most selective stage
  { $match: { workspaceId: ObjectId("...") } },
  // Use denormalized data instead of lookups where possible
  { $project: {
      name: 1,
      createdByName: 1, // Already denormalized
      elementCount: 1,  // Already stored
      updatedAt: 1
    }
  },
  // Sort at the end
  { $sort: { updatedAt: -1 } }
]);
```

#### 2. Batch Operations

Use batch operations for better performance:

```javascript
// BEFORE: Individual updates
for (const element of elements) {
  await db.whiteboardElements.updateOne(
    { _id: element._id },
    { $set: { properties: element.properties } }
  );
}

// AFTER: Batch update
await db.whiteboardElements.bulkWrite(
  elements.map(element => ({
    updateOne: {
      filter: { _id: element._id },
      update: { $set: { properties: element.properties } }
    }
  }))
);
```

#### 3. Read Concern and Write Concern Optimization

Adjust read and write concerns based on requirements:

```javascript
// For non-critical reads where eventual consistency is acceptable
db.whiteboards.find({}, { readConcern: { level: "local" } });

// For critical reads requiring strong consistency
db.users.findOne({ _id: userId }, { readConcern: { level: "majority" } });

// For non-critical writes where acknowledgment isn't needed
db.activityLogs.insertOne(logEntry, { writeConcern: { w: 0 } });

// For critical writes requiring durability
db.whiteboards.updateOne(
  { _id: whiteboardId },
  { $set: { data: newData } },
  { writeConcern: { w: "majority", j: true } }
);
```

### Connection Pooling

Optimize MongoDB connection pooling:

```javascript
// Configure connection pool size based on workload
const mongoClient = new MongoClient(uri, {
  poolSize: 50,                // Adjust based on expected concurrent operations
  maxIdleTimeMS: 30000,        // Close idle connections after 30 seconds
  connectTimeoutMS: 5000,      // Connection timeout
  socketTimeoutMS: 45000,      // Socket timeout
  serverSelectionTimeoutMS: 5000 // Server selection timeout
});
```

## Redis Performance Optimization

### Data Structure Selection

Choose optimal Redis data structures:

```javascript
// BEFORE: Using generic key-value for user sessions
// SET "session:123" "{complex JSON with all session data}"

// AFTER: Using Hash for more efficient field-level access
// HMSET "session:123" "userId" "456" "lastActive" "1623456789" "data" "{remaining data}"

// BEFORE: Using Sets for tracking active users
// SADD "active_users" "user1" "user2" "user3"

// AFTER: Using Sorted Sets with timestamp as score for activity tracking
// ZADD "active_users" 1623456789 "user1" 1623456790 "user2" 1623456791 "user3"
// This allows querying users active in the last N seconds:
// ZRANGEBYSCORE "active_users" (current_timestamp-300) +inf
```

### Caching Strategies

Implement effective caching strategies:

```javascript
// Function to get whiteboard with caching
const getWhiteboardWithCache = async (whiteboardId) => {
  const cacheKey = `whiteboard:${whiteboardId}`;
  
  // Try to get from cache
  let whiteboard = await redisClient.get(cacheKey);
  
  if (whiteboard) {
    // Cache hit
    return JSON.parse(whiteboard);
  }
  
  // Cache miss - get from database
  whiteboard = await db.whiteboards.findOne({ _id: ObjectId(whiteboardId) });
  
  if (whiteboard) {
    // Store in cache with expiration
    await redisClient.set(
      cacheKey, 
      JSON.stringify(whiteboard),
      'EX', 
      300 // 5 minutes expiration
    );
  }
  
  return whiteboard;
};

// Function to invalidate cache when data changes
const invalidateWhiteboardCache = async (whiteboardId) => {
  const cacheKey = `whiteboard:${whiteboardId}`;
  await redisClient.del(cacheKey);
};
```

### Pipeline and Multi Commands

Use pipelining for multiple operations:

```javascript
// BEFORE: Multiple individual Redis commands
await redisClient.set('key1', 'value1');
await redisClient.set('key2', 'value2');
await redisClient.set('key3', 'value3');

// AFTER: Using pipeline for better performance
const pipeline = redisClient.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.set('key3', 'value3');
await pipeline.exec();

// Using MULTI for transactions
const multi = redisClient.multi();
multi.set('key1', 'value1');
multi.incr('counter');
multi.expire('key1', 300);
await multi.exec();
```

### Memory Optimization

Optimize Redis memory usage:

```javascript
// Configure Redis to use appropriate memory policies
// In redis.conf:
maxmemory 2gb
maxmemory-policy allkeys-lru

// Use shorter key names to reduce memory overhead
// BEFORE: "user_session_for_user_id_12345"
// AFTER: "sess:u12345"

// Use integer IDs instead of string UUIDs when possible
// BEFORE: "whiteboard:f47ac10b-58cc-4372-a567-0e02b2c3d479"
// AFTER: "wb:12345"

// Compress large values before storing
const compressAndStore = async (key, value) => {
  const compressed = await gzipPromise(JSON.stringify(value));
  await redisClient.set(key, compressed);
};

const retrieveAndDecompress = async (key) => {
  const compressed = await redisClient.get(key);
  if (!compressed) return null;
  
  const decompressed = await gunzipPromise(compressed);
  return JSON.parse(decompressed);
};
```

## Real-time Collaboration Optimization

### Efficient Data Synchronization

Optimize real-time data synchronization:

```javascript
// BEFORE: Sending full elements on every change
socket.emit('element-updated', {
  elementId: 'elem1',
  type: 'rectangle',
  properties: {
    position: { x: 100, y: 200 },
    size: { width: 150, height: 100 },
    fillColor: '#ff0000',
    strokeColor: '#000000',
    strokeWidth: 2,
    rotation: 0,
    opacity: 1
  }
});

// AFTER: Sending only changed properties
socket.emit('element-updated', {
  elementId: 'elem1',
  changes: {
    'properties.position.x': 120,
    'properties.position.y': 220
  }
});
```

### Throttling and Debouncing

Implement throttling and debouncing for real-time updates:

```javascript
// Client-side throttling for cursor position updates
const throttledEmitCursorPosition = _.throttle((x, y) => {
  socket.emit('cursor-position', { x, y });
}, 50); // Send at most every 50ms

// Client-side debouncing for element updates
const debouncedEmitElementUpdate = _.debounce((elementId, properties) => {
  socket.emit('element-updated', { elementId, properties });
}, 100); // Wait 100ms after last change before sending

// Server-side batching of updates
let pendingUpdates = {};

const queueUpdate = (whiteboardId, elementId, changes) => {
  if (!pendingUpdates[whiteboardId]) {
    pendingUpdates[whiteboardId] = {};
    
    // Schedule broadcast
    setTimeout(() => broadcastUpdates(whiteboardId), 50);
  }
  
  if (!pendingUpdates[whiteboardId][elementId]) {
    pendingUpdates[whiteboardId][elementId] = changes;
  } else {
    // Merge changes
    Object.assign(pendingUpdates[whiteboardId][elementId], changes);
  }
};

const broadcastUpdates = (whiteboardId) => {
  const updates = pendingUpdates[whiteboardId];
  delete pendingUpdates[whiteboardId];
  
  // Convert to array format for broadcasting
  const updateArray = Object.entries(updates).map(([elementId, changes]) => ({
    elementId,
    changes
  }));
  
  // Broadcast to all clients in the whiteboard
  io.to(`whiteboard:${whiteboardId}`).emit('batch-updates', updateArray);
};
```

### Selective Data Loading

Implement viewport-based loading for large whiteboards:

```javascript
// Client requests elements in current viewport
socket.emit('load-viewport', {
  whiteboardId: 'wb123',
  viewport: {
    left: 0,
    top: 0,
    right: 1000,
    bottom: 800
  }
});

// Server handles viewport-based loading
io.on('connection', (socket) => {
  socket.on('load-viewport', async (data) => {
    const { whiteboardId, viewport } = data;
    
    // Add padding to viewport to preload elements just outside view
    const padding = 200;
    const expandedViewport = {
      left: viewport.left - padding,
      top: viewport.top - padding,
      right: viewport.right + padding,
      bottom: viewport.bottom + padding
    };
    
    // Query elements in the viewport
    const elements = await db.whiteboardElements.find({
      whiteboardId,
      'properties.position.x': { $lt: expandedViewport.right },
      'properties.position.y': { $lt: expandedViewport.bottom },
      $expr: {
        $and: [
          { $gte: [{ $add: ['$properties.position.x', '$properties.size.width'] }, expandedViewport.left] },
          { $gte: [{ $add: ['$properties.position.y', '$properties.size.height'] }, expandedViewport.top] }
        ]
      }
    }).toArray();
    
    // Send elements to client
    socket.emit('viewport-elements', elements);
  });
});
```

## Scaling Strategies

### Horizontal Scaling

Implement strategies for horizontal scaling:

```javascript
// Shard key selection for MongoDB collections
// For users collection: shard by user ID
sh.shardCollection("pcsdraw.users", { _id: 1 });

// For whiteboards collection: shard by workspace ID to keep related data together
sh.shardCollection("pcsdraw.whiteboards", { workspaceId: 1 });

// For whiteboard elements: shard by whiteboard ID
sh.shardCollection("pcsdraw.whiteboardElements", { whiteboardId: 1 });
```

### Read/Write Splitting

Implement read/write splitting for high-load scenarios:

```javascript
// Configure MongoDB connection for read/write splitting
const writeClient = new MongoClient(primaryUri);
const readClient = new MongoClient(secondaryUri, {
  readPreference: 'secondaryPreferred'
});

// Use appropriate client based on operation
const getWhiteboard = async (whiteboardId) => {
  // Read operation - use read client
  const db = readClient.db('pcsdraw');
  return await db.whiteboards.findOne({ _id: ObjectId(whiteboardId) });
};

const updateWhiteboard = async (whiteboardId, updates) => {
  // Write operation - use write client
  const db = writeClient.db('pcsdraw');
  return await db.whiteboards.updateOne(
    { _id: ObjectId(whiteboardId) },
    { $set: updates }
  );
};
```

### Caching Tiers

Implement multi-level caching:

```javascript
// Multi-level cache implementation
const getWhiteboardMultiCache = async (whiteboardId) => {
  // Try L1 cache (local memory)
  const localCache = getFromLocalCache(`whiteboard:${whiteboardId}`);
  if (localCache) return localCache;
  
  // Try L2 cache (Redis)
  const redisCache = await redisClient.get(`whiteboard:${whiteboardId}`);
  if (redisCache) {
    // Update local cache
    setInLocalCache(`whiteboard:${whiteboardId}`, JSON.parse(redisCache), 60); // 60 seconds
    return JSON.parse(redisCache);
  }
  
  // Cache miss - get from database
  const whiteboard = await db.whiteboards.findOne({ _id: ObjectId(whiteboardId) });
  
  if (whiteboard) {
    // Update both caches
    setInLocalCache(`whiteboard:${whiteboardId}`, whiteboard, 60); // 60 seconds
    await redisClient.set(
      `whiteboard:${whiteboardId}`, 
      JSON.stringify(whiteboard),
      'EX', 
      300 // 5 minutes
    );
  }
  
  return whiteboard;
};
```

## Monitoring and Optimization

### Performance Monitoring

Implement comprehensive performance monitoring:

```javascript
// MongoDB query performance monitoring
const monitorQueryPerformance = async () => {
  // Get current profiling level
  const profilingStatus = await db.command({ profile: -1 });
  console.log('Current profiling level:', profilingStatus.was);
  
  // Enable profiling for slow queries
  await db.command({ profile: 1, slowms: 100 });
  
  // Get slow queries
  const slowQueries = await db.collection('system.profile')
    .find({})
    .sort({ ts: -1 })
    .limit(20)
    .toArray();
  
  console.log('Slow queries:', slowQueries.map(q => ({
    op: q.op,
    ns: q.ns,
    millis: q.millis,
    query: q.query || q.command
  })));
  
  // Check index usage
  const indexStats = await Promise.all(
    ['users', 'workspaces', 'whiteboards', 'whiteboardElements'].map(async coll => {
      const stats = await db.collection(coll).aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      return { collection: coll, indexStats: stats };
    })
  );
  
  console.log('Index usage stats:', indexStats);
};

// Redis monitoring
const monitorRedisPerformance = async () => {
  // Get Redis info
  const info = await redisClient.info();
  const infoLines = info.split('\n');
  
  // Extract key metrics
  const metrics = {};
  infoLines.forEach(line => {
    const parts = line.split(':');
    if (parts.length === 2) {
      metrics[parts[0]] = parts[1];
    }
  });
  
  console.log('Redis metrics:', {
    usedMemory: metrics.used_memory_human,
    peakMemory: metrics.used_memory_peak_human,
    clients: metrics.connected_clients,
    commandsPerSecond: metrics.instantaneous_ops_per_sec,
    hitRate: metrics.keyspace_hits && metrics.keyspace_misses 
      ? parseInt(metrics.keyspace_hits) / (parseInt(metrics.keyspace_hits) + parseInt(metrics.keyspace_misses))
      : 0
  });
  
  // Monitor slow commands
  const slowlog = await redisClient.slowlog('get', 10);
  console.log('Redis slow commands:', slowlog);
};
```

### Automated Optimization

Implement automated optimization routines:

```javascript
// Automated index optimization
const optimizeIndexes = async () => {
  // Get collection statistics
  const collections = ['users', 'workspaces', 'whiteboards', 'whiteboardElements'];
  
  for (const collection of collections) {
    // Get current indexes
    const indexes = await db.collection(collection).indexes();
    
    // Get index usage statistics
    const indexStats = await db.collection(collection)
      .aggregate([{ $indexStats: {} }])
      .toArray();
    
    // Identify unused indexes
    const unusedIndexes = indexes.filter(index => {
      // Skip _id index
      if (index.name === '_id_') return false;
      
      // Check if index is used
      const stats = indexStats.find(stat => stat.name === index.name);
      return !stats || stats.accesses.ops === 0;
    });
    
    console.log(`Collection ${collection} has ${unusedIndexes.length} unused indexes`);
    
    // Log unused indexes for review
    unusedIndexes.forEach(index => {
      console.log(`  Unused index: ${index.name} - ${JSON.stringify(index.key)}`);
    });
  }
};

// Automated data archiving
const archiveOldData = async () => {
  const archiveDate = new Date();
  archiveDate.setMonth(archiveDate.getMonth() - 6); // 6 months old
  
  // Archive old whiteboards
  const oldWhiteboards = await db.whiteboards.find({
    updatedAt: { $lt: archiveDate },
    archived: { $ne: true }
  }).toArray();
  
  console.log(`Found ${oldWhiteboards.length} whiteboards to archive`);
  
  for (const whiteboard of oldWhiteboards) {
    // Archive whiteboard
    await db.archivedWhiteboards.insertOne({
      ...whiteboard,
      archivedAt: new Date()
    });
    
    // Mark as archived
    await db.whiteboards.updateOne(
      { _id: whiteboard._id },
      { $set: { archived: true, archivedAt: new Date() } }
    );
    
    console.log(`Archived whiteboard: ${whiteboard._id}`);
  }
};
```

## Performance Testing

### Load Testing Scripts

Implement load testing scripts:

```javascript
// Load testing script for whiteboard operations
const loadTestWhiteboard = async (whiteboardId, concurrentUsers, operations) => {
  console.log(`Starting load test for whiteboard ${whiteboardId}`);
  console.log(`Simulating ${concurrentUsers} concurrent users`);
  console.log(`Performing ${operations} operations per user`);
  
  const startTime = Date.now();
  
  // Create simulated users
  const users = Array.from({ length: concurrentUsers }, (_, i) => ({
    id: `test-user-${i}`,
    sessionId: `test-session-${i}`
  }));
  
  // Run operations in parallel
  await Promise.all(users.map(async user => {
    const userStartTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < operations; i++) {
      try {
        // Randomly select operation type
        const opType = Math.floor(Math.random() * 4);
        
        switch (opType) {
          case 0: // Read whiteboard
            await db.whiteboards.findOne({ _id: ObjectId(whiteboardId) });
            break;
          case 1: // Read elements
            await db.whiteboardElements.find({ 
              whiteboardId: ObjectId(whiteboardId) 
            }).limit(50).toArray();
            break;
          case 2: // Create element
            await db.whiteboardElements.insertOne({
              whiteboardId: ObjectId(whiteboardId),
              elementId: `test-element-${user.id}-${i}`,
              type: 'rectangle',
              properties: {
                position: { x: Math.random() * 1000, y: Math.random() * 1000 },
                size: { width: 100, height: 100 },
                fillColor: '#ff0000'
              },
              createdBy: user.id,
              createdAt: new Date()
            });
            break;
          case 3: // Update element
            // First get a random element
            const elements = await db.whiteboardElements.find({ 
              whiteboardId: ObjectId(whiteboardId) 
            }).limit(10).toArray();
            
            if (elements.length > 0) {
              const element = elements[Math.floor(Math.random() * elements.length)];
              
              await db.whiteboardElements.updateOne(
                { _id: element._id },
                { 
                  $set: { 
                    'properties.position.x': Math.random() * 1000,
                    'properties.position.y': Math.random() * 1000
                  } 
                }
              );
            }
            break;
        }
        
        successCount++;
      } catch (error) {
        failureCount++;
        console.error(`User ${user.id} operation failed:`, error);
      }
    }
    
    const userEndTime = Date.now();
    const userDuration = userEndTime - userStartTime;
    
    return {
      userId: user.id,
      duration: userDuration,
      successCount,
      failureCount,
      opsPerSecond: successCount / (userDuration / 1000)
    };
  }));
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  console.log(`Load test completed in ${totalDuration}ms`);
  console.log(`Average operations per second: ${(concurrentUsers * operations) / (totalDuration / 1000)}`);
};
```

### Performance Benchmarking

Implement benchmarking for critical operations:

```javascript
// Benchmark different query approaches
const benchmarkQueries = async (iterations = 100) => {
  const results = {};
  
  // Test original query
  console.log('Testing original query...');
  const originalStart = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    await db.whiteboards.find({ 
      workspaceId: ObjectId('60d21b4667d0d8992e610c85') 
    }).toArray();
  }
  
  const originalDuration = Date.now() - originalStart;
  results.original = originalDuration;
  
  // Test optimized query with projection
  console.log('Testing optimized query with projection...');
  const projectionStart = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    await db.whiteboards.find(
      { workspaceId: ObjectId('60d21b4667d0d8992e610c85') },
      { name: 1, thumbnail: 1, updatedAt: 1 }
    ).toArray();
  }
  
  const projectionDuration = Date.now() - projectionStart;
  results.projection = projectionDuration;
  
  // Test with index hint
  console.log('Testing query with index hint...');
  const hintStart = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    await db.whiteboards.find(
      { workspaceId: ObjectId('60d21b4667d0d8992e610c85') },
      { name: 1, thumbnail: 1, updatedAt: 1 }
    ).hint({ workspaceId: 1, updatedAt: -1 }).toArray();
  }
  
  const hintDuration = Date.now() - hintStart;
  results.hint = hintDuration;
  
  // Test with Redis cache
  console.log('Testing query with Redis cache...');
  const cacheStart = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const cacheKey = 'workspace:60d21b4667d0d8992e610c85:whiteboards';
    let data = await redisClient.get(cacheKey);
    
    if (!data) {
      data = await db.whiteboards.find(
        { workspaceId: ObjectId('60d21b4667d0d8992e610c85') },
        { name: 1, thumbnail: 1, updatedAt: 1 }
      ).toArray();
      
      await redisClient.set(cacheKey, JSON.stringify(data), 'EX', 30);
    } else {
      data = JSON.parse(data);
    }
  }
  
  const cacheDuration = Date.now() - cacheStart;
  results.cache = cacheDuration;
  
  // Print results
  console.log('Benchmark results (ms):');
  console.log(`Original query: ${results.original} (${iterations} iterations)`);
  console.log(`With projection: ${results.projection} (${Math.round(results.original / results.projection * 100)}% faster)`);
  console.log(`With index hint: ${results.hint} (${Math.round(results.original / results.hint * 100)}% faster)`);
  console.log(`With Redis cache: ${results.cache} (${Math.round(results.original / results.cache * 100)}% faster)`);
  
  return results;
};
```

## Conclusion

This comprehensive performance optimization strategy ensures that the PCS Draw application's database layer can handle the demands of real-time collaboration while maintaining responsiveness and scalability. Key aspects of this strategy include:

1. **Schema Optimization**: Efficient document structure and strategic denormalization
2. **Indexing Strategy**: Carefully designed indexes for common query patterns
3. **Query Optimization**: Efficient queries with proper projection and aggregation
4. **Caching Implementation**: Multi-level caching for frequently accessed data
5. **Real-time Optimizations**: Efficient data synchronization and selective loading
6. **Scaling Approaches**: Horizontal scaling and read/write splitting
7. **Monitoring and Testing**: Comprehensive performance monitoring and testing

By implementing these optimization techniques, the PCS Draw application can provide a smooth and responsive user experience even under high load conditions with many concurrent users collaborating on complex whiteboards.