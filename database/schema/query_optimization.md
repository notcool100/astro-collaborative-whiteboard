# Query Optimization Strategies for PCS Draw

## Overview

This document outlines query optimization strategies for the PCS Draw collaborative whiteboard application. Efficient queries are essential for maintaining application performance, especially for real-time collaborative features that require low latency.

## General Query Optimization Principles

1. **Use Proper Indexes**: Ensure all frequent queries use appropriate indexes
2. **Project Only Needed Fields**: Retrieve only the fields needed for each operation
3. **Limit Result Sets**: Use pagination for large result sets
4. **Avoid Regex Queries**: Use text indexes instead of regex for text search when possible
5. **Denormalize When Appropriate**: Store frequently accessed related data together
6. **Use Aggregation Pipeline**: Leverage MongoDB's aggregation framework for complex data processing
7. **Implement Caching**: Cache frequently accessed and relatively static data
8. **Monitor and Analyze**: Regularly review slow queries and optimize them

## Optimized Query Patterns by Feature

### 1. User Authentication and Profile

#### Efficient User Lookup
```javascript
// GOOD: Uses indexed email field
db.users.findOne(
  { email: userEmail },
  { _id: 1, email: 1, password: 1, name: 1 }
);

// BAD: Full document retrieval without projection
db.users.findOne({ email: userEmail });
```

#### User Profile Data
```javascript
// GOOD: Only fetch needed profile data
db.users.findOne(
  { _id: userId },
  { password: 0, createdAt: 0, updatedAt: 0 }
);

// Cache user profile data in Redis
// SET "user:profile:{userId}" JSON.stringify(userData)
// With expiration
// EXPIRE "user:profile:{userId}" 300  // 5 minutes
```

### 2. Workspace Management

#### List User's Workspaces
```javascript
// GOOD: Uses compound index, pagination, and projection
db.workspaces.find(
  { $or: [{ ownerId: userId }, { "members.userId": userId }] },
  { name: 1, description: 1, ownerId: 1, "members.$": 1, updatedAt: 1 }
)
.sort({ updatedAt: -1 })
.skip(page * limit)
.limit(limit);

// Implement caching for workspace lists
// Key: "user:{userId}:workspaces:{page}:{limit}"
// Invalidate on workspace updates
```

#### Workspace Details with Member Count
```javascript
// GOOD: Uses aggregation for efficient counting
db.workspaces.aggregate([
  { $match: { _id: workspaceId } },
  { $project: {
      name: 1,
      description: 1,
      ownerId: 1,
      memberCount: { $size: "$members" },
      settings: 1,
      updatedAt: 1
    }
  }
]);
```

### 3. Whiteboard Listing and Access

#### List Whiteboards in Workspace
```javascript
// GOOD: Uses compound index with sorting and pagination
db.whiteboards.find(
  { workspaceId: workspaceId },
  { name: 1, thumbnail: 1, updatedAt: 1, lastEditedBy: 1 }
)
.sort({ updatedAt: -1 })
.skip(page * limit)
.limit(limit);

// Cache frequently accessed workspace whiteboard lists
// Key: "workspace:{workspaceId}:whiteboards:{page}:{limit}"
```

#### Check User Access to Whiteboard
```javascript
// GOOD: Efficient permission check using indexes
const checkAccess = async (userId, whiteboardId) => {
  // First get the whiteboard to find its workspace
  const whiteboard = await db.whiteboards.findOne(
    { _id: whiteboardId },
    { workspaceId: 1 }
  );
  
  if (!whiteboard) return false;
  
  // Then check workspace permissions
  const workspace = await db.workspaces.findOne({
    _id: whiteboard.workspaceId,
    $or: [
      { ownerId: userId },
      { members: { $elemMatch: { userId: userId } } }
    ]
  }, { _id: 1 });
  
  return !!workspace;
};

// Cache access permissions
// Key: "user:{userId}:access:{whiteboardId}"
// Short expiration to balance security and performance
// EXPIRE "user:{userId}:access:{whiteboardId}" 60  // 1 minute
```

### 4. Whiteboard Data Loading

#### Load Current Whiteboard Version
```javascript
// GOOD: Two-step approach with projection
const loadWhiteboard = async (whiteboardId) => {
  // Step 1: Get whiteboard metadata and current version
  const whiteboard = await db.whiteboards.findOne(
    { _id: whiteboardId },
    { name: 1, currentVersionId: 1, encryptionMetadata: 1 }
  );
  
  if (!whiteboard) return null;
  
  // Step 2: Get the current version data
  const version = await db.whiteboardVersions.findOne(
    { _id: whiteboard.currentVersionId },
    { data: 1, version: 1, createdAt: 1 }
  );
  
  return { ...whiteboard, currentVersion: version };
};

// Cache entire whiteboard data for active boards
// Key: "whiteboard:{whiteboardId}:data"
// Invalidate on any updates
```

#### Load Whiteboard Elements Efficiently
```javascript
// GOOD: Indexed query with sorting by z-index for rendering order
db.whiteboardElements.find(
  { 
    whiteboardId: whiteboardId,
    isDeleted: false
  },
  {
    elementId: 1,
    type: 1,
    properties: 1,
    zIndex: 1
  }
)
.sort({ zIndex: 1 })
.hint({ whiteboardId: 1, isDeleted: 1, zIndex: 1 });

// For large whiteboards, implement pagination or viewport-based loading
const loadVisibleElements = async (whiteboardId, viewport) => {
  return db.whiteboardElements.find({
    whiteboardId: whiteboardId,
    isDeleted: false,
    "properties.position.x": { $gte: viewport.left, $lte: viewport.right },
    "properties.position.y": { $gte: viewport.top, $lte: viewport.bottom }
  }).sort({ zIndex: 1 });
};
```

### 5. Real-time Collaboration

#### Track Active Users
```javascript
// GOOD: Upsert for atomic update of session data
db.collaborationSessions.updateOne(
  { whiteboardId: whiteboardId },
  { 
    $set: { 
      lastActivity: new Date(),
      "activeUsers.$[user].cursorPosition": cursorPosition,
      "activeUsers.$[user].lastActivity": new Date()
    }
  },
  { 
    arrayFilters: [{ "user.userId": userId }],
    upsert: true
  }
);

// Use Redis for real-time cursor tracking
// HSET "whiteboard:{whiteboardId}:cursors" "{userId}" "{x}:{y}:{timestamp}"
```

#### Element Updates
```javascript
// GOOD: Targeted update of specific element
db.whiteboardElements.updateOne(
  { 
    whiteboardId: whiteboardId,
    elementId: elementId
  },
  { 
    $set: {
      "properties": newProperties,
      "updatedBy": userId,
      "updatedAt": new Date()
    }
  }
);

// Batch element updates for efficiency
db.whiteboardElements.bulkWrite(
  elements.map(element => ({
    updateOne: {
      filter: { whiteboardId: whiteboardId, elementId: element.elementId },
      update: { 
        $set: {
          "properties": element.properties,
          "updatedBy": userId,
          "updatedAt": new Date()
        }
      }
    }
  }))
);
```

### 6. Version History

#### List Versions Efficiently
```javascript
// GOOD: Uses compound index with projection and pagination
db.whiteboardVersions.find(
  { whiteboardId: whiteboardId },
  { 
    version: 1,
    createdBy: 1,
    createdAt: 1,
    thumbnail: 1,
    metadata: 1
  }
)
.sort({ version: -1 })
.skip(page * limit)
.limit(limit);
```

#### Efficient Version Comparison
```javascript
// GOOD: Only fetch the specific versions needed
const compareVersions = async (whiteboardId, version1, version2) => {
  const versions = await db.whiteboardVersions.find(
    { 
      whiteboardId: whiteboardId,
      version: { $in: [version1, version2] }
    },
    { version: 1, data: 1 }
  ).toArray();
  
  // Process the difference between versions
  return calculateDiff(versions[0], versions[1]);
};
```

### 7. Search Functionality

#### Whiteboard Search
```javascript
// GOOD: Uses text index with sorting and pagination
db.whiteboards.find(
  { 
    $text: { $search: searchQuery },
    $or: [
      { ownerId: userId },
      { "members.userId": userId }
    ]
  },
  {
    name: 1,
    thumbnail: 1,
    updatedAt: 1,
    score: { $meta: "textScore" }
  }
)
.sort({ score: { $meta: "textScore" } })
.skip(page * limit)
.limit(limit);
```

#### Combined Workspace and Whiteboard Search
```javascript
// GOOD: Uses aggregation for cross-collection search
const searchUserContent = async (userId, query, page, limit) => {
  // Search workspaces
  const workspaces = await db.workspaces.find(
    { 
      $text: { $search: query },
      $or: [{ ownerId: userId }, { "members.userId": userId }]
    },
    { 
      name: 1, 
      description: 1,
      type: "workspace",
      score: { $meta: "textScore" }
    }
  )
  .sort({ score: { $meta: "textScore" } })
  .limit(50)
  .toArray();
  
  // Search whiteboards
  const whiteboards = await db.whiteboards.find(
    { 
      $text: { $search: query },
      workspaceId: { 
        $in: await db.workspaces.find(
          { $or: [{ ownerId: userId }, { "members.userId": userId }] },
          { _id: 1 }
        ).map(w => w._id).toArray()
      }
    },
    { 
      name: 1,
      thumbnail: 1,
      workspaceId: 1,
      type: "whiteboard",
      score: { $meta: "textScore" }
    }
  )
  .sort({ score: { $meta: "textScore" } })
  .limit(50)
  .toArray();
  
  // Combine and sort results
  const combined = [...workspaces, ...whiteboards]
    .sort((a, b) => b.score - a.score)
    .slice(page * limit, (page + 1) * limit);
    
  return combined;
};
```

## Caching Strategy

### Redis Caching Implementation

```javascript
// Example caching middleware for Express
const cacheMiddleware = (redisClient) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') return next();
    
    const cacheKey = `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        return res.json(data);
      }
      
      // Store original res.json function
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response with appropriate TTL
        const ttl = determineTTL(req.path);
        redisClient.set(cacheKey, JSON.stringify(data), 'EX', ttl);
        
        // Call the original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// Function to determine appropriate TTL based on endpoint
const determineTTL = (path) => {
  if (path.includes('/users/')) return 300; // 5 minutes
  if (path.includes('/workspaces/')) return 60; // 1 minute
  if (path.includes('/whiteboards/list')) return 30; // 30 seconds
  return 10; // Default 10 seconds
};
```

### Cache Invalidation Strategy

```javascript
// Example cache invalidation for whiteboard updates
const invalidateWhiteboardCache = async (redisClient, whiteboardId, workspaceId) => {
  // Create a pattern for all keys related to this whiteboard
  const whiteboardPattern = `*whiteboard:${whiteboardId}*`;
  const workspacePattern = `*workspace:${workspaceId}:whiteboards*`;
  
  // Get all keys matching the patterns
  const whiteboardKeys = await redisClient.keys(whiteboardPattern);
  const workspaceKeys = await redisClient.keys(workspacePattern);
  
  // Delete all matching keys
  if (whiteboardKeys.length > 0) {
    await redisClient.del(whiteboardKeys);
  }
  
  if (workspaceKeys.length > 0) {
    await redisClient.del(workspaceKeys);
  }
};
```

## Query Monitoring and Optimization

### Slow Query Detection

```javascript
// Enable MongoDB profiling
db.setProfilingLevel(1, { slowms: 100 });

// Create a function to analyze slow queries
const analyzeSlowQueries = async () => {
  const slowQueries = await db.system.profile.find({
    millis: { $gt: 100 },
    ns: { $ne: "admin.system.profile" }
  }).sort({ ts: -1 }).limit(20).toArray();
  
  // Group by collection and query pattern
  const queryGroups = {};
  
  slowQueries.forEach(query => {
    const collection = query.ns.split('.')[1];
    const queryShape = JSON.stringify(query.query || query.command || {});
    
    if (!queryGroups[collection]) {
      queryGroups[collection] = {};
    }
    
    if (!queryGroups[collection][queryShape]) {
      queryGroups[collection][queryShape] = {
        count: 0,
        totalTime: 0,
        examples: []
      };
    }
    
    queryGroups[collection][queryShape].count++;
    queryGroups[collection][queryShape].totalTime += query.millis;
    
    if (queryGroups[collection][queryShape].examples.length < 3) {
      queryGroups[collection][queryShape].examples.push({
        millis: query.millis,
        ts: query.ts,
        planSummary: query.planSummary
      });
    }
  });
  
  return queryGroups;
};
```

### Index Usage Analysis

```javascript
// Check index usage statistics
const analyzeIndexUsage = async () => {
  const collections = ['users', 'workspaces', 'whiteboards', 'whiteboardVersions', 'whiteboardElements'];
  const results = {};
  
  for (const collection of collections) {
    results[collection] = await db[collection].aggregate([
      { $indexStats: {} }
    ]).toArray();
  }
  
  return results;
};
```

## Performance Testing Queries

```javascript
// Test query performance with different approaches
const testQueryPerformance = async (iterations = 100) => {
  console.time('Original Query');
  for (let i = 0; i < iterations; i++) {
    await db.whiteboards.find({ workspaceId: testWorkspaceId }).toArray();
  }
  console.timeEnd('Original Query');
  
  console.time('Optimized Query');
  for (let i = 0; i < iterations; i++) {
    await db.whiteboards.find(
      { workspaceId: testWorkspaceId },
      { name: 1, thumbnail: 1, updatedAt: 1 }
    ).toArray();
  }
  console.timeEnd('Optimized Query');
  
  console.time('Cached Query');
  for (let i = 0; i < iterations; i++) {
    const cacheKey = `test:workspace:${testWorkspaceId}:whiteboards`;
    let data = await redisClient.get(cacheKey);
    
    if (!data) {
      data = await db.whiteboards.find(
        { workspaceId: testWorkspaceId },
        { name: 1, thumbnail: 1, updatedAt: 1 }
      ).toArray();
      
      await redisClient.set(cacheKey, JSON.stringify(data), 'EX', 30);
    } else {
      data = JSON.parse(data);
    }
  }
  console.timeEnd('Cached Query');
};
```

## Recommendations for Specific Use Cases

### Large Whiteboard Optimization

For whiteboards with many elements (1000+):

1. **Viewport-Based Loading**:
   ```javascript
   // Only load elements visible in the current viewport
   const loadVisibleElements = async (whiteboardId, viewport, padding = 200) => {
     // Add padding to viewport to preload elements just outside view
     const expandedViewport = {
       left: viewport.left - padding,
       right: viewport.right + padding,
       top: viewport.top - padding,
       bottom: viewport.bottom + padding
     };
     
     return db.whiteboardElements.find({
       whiteboardId: whiteboardId,
       isDeleted: false,
       $or: [
         // Elements partially or fully in viewport
         {
           "properties.position.x": { 
             $lte: expandedViewport.right 
           },
           "properties.position.y": { 
             $lte: expandedViewport.bottom 
           },
           $expr: {
             $and: [
               { $gte: [{ $add: ["$properties.position.x", "$properties.size.width"] }, expandedViewport.left] },
               { $gte: [{ $add: ["$properties.position.y", "$properties.size.height"] }, expandedViewport.top] }
             ]
           }
         }
       ]
     }).sort({ zIndex: 1 });
   };
   ```

2. **Element Clustering**:
   ```javascript
   // Group nearby elements for batch loading
   const createElementClusters = async (whiteboardId) => {
     return db.whiteboardElements.aggregate([
       { $match: { whiteboardId: whiteboardId, isDeleted: false } },
       { $project: {
           elementId: 1,
           centerX: { $add: ["$properties.position.x", { $divide: ["$properties.size.width", 2] }] },
           centerY: { $add: ["$properties.position.y", { $divide: ["$properties.size.height", 2] }] }
         }
       },
       { $bucketAuto: {
           groupBy: { centerX: 1, centerY: 1 },
           buckets: 16,
           output: {
             elements: { $push: "$elementId" },
             count: { $sum: 1 }
           }
         }
       }
     ]).toArray();
   };
   ```

### Real-time Collaboration Optimization

For whiteboards with many simultaneous users (10+):

1. **Differential Updates**:
   ```javascript
   // Only send changes, not full elements
   const sendElementDiff = (previousState, currentState) => {
     const diff = {};
     
     for (const [key, value] of Object.entries(currentState)) {
       if (JSON.stringify(previousState[key]) !== JSON.stringify(value)) {
         diff[key] = value;
       }
     }
     
     return diff;
   };
   ```

2. **Batched Updates**:
   ```javascript
   // Batch multiple updates into single database operation
   let pendingUpdates = [];
   
   const queueElementUpdate = (whiteboardId, elementId, properties) => {
     pendingUpdates.push({
       whiteboardId,
       elementId,
       properties
     });
     
     // If this is the first update, schedule the batch process
     if (pendingUpdates.length === 1) {
       setTimeout(processBatchUpdates, 100); // 100ms batching window
     }
   };
   
   const processBatchUpdates = async () => {
     const updates = [...pendingUpdates];
     pendingUpdates = [];
     
     // Group by whiteboard
     const whiteboardUpdates = {};
     
     updates.forEach(update => {
       if (!whiteboardUpdates[update.whiteboardId]) {
         whiteboardUpdates[update.whiteboardId] = [];
       }
       whiteboardUpdates[update.whiteboardId].push({
         elementId: update.elementId,
         properties: update.properties
       });
     });
     
     // Process each whiteboard's updates
     for (const [whiteboardId, elements] of Object.entries(whiteboardUpdates)) {
       await db.whiteboardElements.bulkWrite(
         elements.map(element => ({
           updateOne: {
             filter: { whiteboardId, elementId: element.elementId },
             update: { 
               $set: {
                 "properties": element.properties,
                 "updatedAt": new Date()
               }
             }
           }
         }))
       );
     }
   };
   ```

### Search Optimization

For efficient text search across workspaces and whiteboards:

1. **Compound Text Index**:
   ```javascript
   // Create text indexes with weights
   db.workspaces.createIndex(
     { name: "text", description: "text" },
     { weights: { name: 10, description: 5 } }
   );
   
   db.whiteboards.createIndex(
     { name: "text", tags: "text" },
     { weights: { name: 10, tags: 5 } }
   );
   ```

2. **Faceted Search**:
   ```javascript
   // Implement faceted search for better filtering
   const facetedSearch = async (userId, query, filters) => {
     // Base match condition
     const baseMatch = {
       $text: { $search: query },
       $or: [{ ownerId: userId }, { "members.userId": userId }]
     };
     
     // Apply additional filters
     if (filters.createdAfter) {
       baseMatch.createdAt = { $gte: new Date(filters.createdAfter) };
     }
     
     if (filters.tags && filters.tags.length > 0) {
       baseMatch.tags = { $all: filters.tags };
     }
     
     // Perform aggregation with facets
     return db.whiteboards.aggregate([
       { $match: baseMatch },
       { $sort: { score: { $meta: "textScore" } } },
       { $facet: {
           results: [
             { $skip: filters.page * filters.limit },
             { $limit: filters.limit },
             { $project: {
                 name: 1,
                 thumbnail: 1,
                 tags: 1,
                 updatedAt: 1,
                 score: { $meta: "textScore" }
               }
             }
           ],
           totalCount: [
             { $count: "count" }
           ],
           tagFacet: [
             { $unwind: "$tags" },
             { $group: { _id: "$tags", count: { $sum: 1 } } },
             { $sort: { count: -1 } },
             { $limit: 10 }
           ]
         }
       }
     ]).toArray();
   };
   ```