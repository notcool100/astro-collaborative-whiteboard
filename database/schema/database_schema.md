# Database Schema Design for PCS Draw

## Overview

This document outlines the database schema design for the PCS Draw collaborative whiteboard application. Based on the project requirements, we need a database solution that supports:

1. Real-time collaboration with multiple users
2. User authentication with role-based access
3. Workspace organization for whiteboards
4. Version history for whiteboards
5. End-to-end encryption of whiteboard data
6. Efficient querying for real-time operations

## Database Selection Recommendation

After evaluating the requirements, I recommend using **MongoDB** as the primary database with **Redis** for caching and real-time presence information. Here's why:

### MongoDB Benefits
- Document-oriented structure matches our data models (users, workspaces, whiteboards)
- Flexible schema allows for easy evolution of data models
- Strong support for JSON data which aligns with whiteboard elements
- Good performance for read-heavy operations
- Built-in support for sharding and replication for scalability
- Robust indexing capabilities
- Change streams for real-time updates

### Redis Benefits
- Ultra-fast in-memory data store for caching frequently accessed data
- Pub/Sub capabilities for real-time user presence
- Session storage for active users
- Rate limiting implementation
- Temporary storage for collaborative editing sessions

## Core Data Models

### 1. Users Collection

```json
{
  "_id": "ObjectId",
  "email": "String (unique, indexed)",
  "password": "String (hashed)",
  "name": "String",
  "avatar": "String (optional)",
  "lastActive": "Date",
  "preferences": {
    "theme": "String",
    "language": "String",
    "notifications": "Boolean"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 2. Workspaces Collection

```json
{
  "_id": "ObjectId",
  "name": "String",
  "description": "String",
  "ownerId": "ObjectId (ref: Users, indexed)",
  "members": [
    {
      "userId": "ObjectId (ref: Users)",
      "role": "String (enum: viewer, editor, admin)",
      "joinedAt": "Date"
    }
  ],
  "settings": {
    "isPublic": "Boolean",
    "defaultPermission": "String (enum: view, edit)"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 3. Whiteboards Collection

```json
{
  "_id": "ObjectId",
  "name": "String",
  "workspaceId": "ObjectId (ref: Workspaces, indexed)",
  "thumbnail": "String (optional)",
  "currentVersionId": "ObjectId (ref: WhiteboardVersions)",
  "currentVersion": "Number",
  "encryptionMetadata": {
    "algorithm": "String",
    "keyEncrypted": "Boolean",
    "iv": "String (initialization vector)"
  },
  "tags": ["String"],
  "createdBy": "ObjectId (ref: Users)",
  "lastEditedBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4. WhiteboardVersions Collection

```json
{
  "_id": "ObjectId",
  "whiteboardId": "ObjectId (ref: Whiteboards, indexed)",
  "version": "Number (indexed)",
  "data": "Object (encrypted)",
  "delta": "Object (changes from previous version, optional)",
  "thumbnail": "String (optional)",
  "createdBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "metadata": {
    "clientInfo": "String",
    "description": "String (optional)"
  }
}
```

### 5. WhiteboardElements Collection

```json
{
  "_id": "ObjectId",
  "whiteboardId": "ObjectId (ref: Whiteboards, indexed)",
  "versionId": "ObjectId (ref: WhiteboardVersions, indexed)",
  "elementId": "String (unique identifier within whiteboard)",
  "type": "String (enum: rectangle, circle, text, arrow, etc.)",
  "properties": {
    "position": { "x": "Number", "y": "Number" },
    "size": { "width": "Number", "height": "Number" },
    "rotation": "Number",
    "strokeColor": "String",
    "fillColor": "String",
    "strokeWidth": "Number",
    "opacity": "Number",
    "text": "String (for text elements)",
    "fontSize": "Number (for text elements)",
    "fontFamily": "String (for text elements)"
  },
  "zIndex": "Number",
  "isDeleted": "Boolean",
  "createdBy": "ObjectId (ref: Users)",
  "updatedBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 6. CollaborationSessions Collection

```json
{
  "_id": "ObjectId",
  "whiteboardId": "ObjectId (ref: Whiteboards, indexed)",
  "activeUsers": [
    {
      "userId": "ObjectId (ref: Users)",
      "connectionId": "String",
      "cursorPosition": { "x": "Number", "y": "Number" },
      "selection": ["String (elementIds)"],
      "lastActivity": "Date"
    }
  ],
  "startedAt": "Date",
  "lastActivity": "Date"
}
```

### 7. ActivityLogs Collection

```json
{
  "_id": "ObjectId",
  "entityType": "String (enum: user, workspace, whiteboard)",
  "entityId": "ObjectId (indexed)",
  "action": "String (enum: create, update, delete, share, etc.)",
  "userId": "ObjectId (ref: Users, indexed)",
  "metadata": "Object",
  "timestamp": "Date (indexed)"
}
```

## Redis Data Structures

### 1. User Sessions
```
Key: "session:{sessionId}"
Value: { userId, workspaceId, whiteboardId, lastActivity }
Expiry: 24 hours
```

### 2. Active Whiteboard Users
```
Key: "whiteboard:{whiteboardId}:users"
Value: Set of userIds
Expiry: None (managed by application)
```

### 3. User Cursor Positions
```
Key: "whiteboard:{whiteboardId}:cursors"
Value: Hash of userId -> { x, y, timestamp }
Expiry: 30 seconds (auto-refresh while active)
```

### 4. Rate Limiting
```
Key: "ratelimit:{userId}:{endpoint}"
Value: Count of requests
Expiry: Varies by endpoint (e.g., 1 minute)
```

### 5. Cached Whiteboard Data
```
Key: "whiteboard:{whiteboardId}:data"
Value: Serialized whiteboard data
Expiry: 10 minutes (invalidated on updates)
```

## Entity Relationship Diagram

```
Users 1 --- * Workspaces (ownership)
Users * --- * Workspaces (membership)
Workspaces 1 --- * Whiteboards
Whiteboards 1 --- * WhiteboardVersions
Whiteboards 1 --- * WhiteboardElements
Whiteboards 1 --- 0..1 CollaborationSessions
Users * --- * CollaborationSessions
Users 1 --- * ActivityLogs
```

## Data Access Patterns

1. **User Authentication**
   - Lookup user by email (indexed)
   - Verify password hash
   - Create session in Redis

2. **Workspace Listing**
   - Find workspaces where user is owner or member
   - Sort by recent activity
   - Paginate results

3. **Whiteboard Access**
   - Verify user has access to workspace
   - Load whiteboard metadata
   - Load current version of whiteboard
   - Cache whiteboard data in Redis

4. **Real-time Collaboration**
   - Update user cursor in Redis
   - Publish element changes via WebSocket
   - Update CollaborationSessions collection
   - Periodically save changes to WhiteboardVersions

5. **Version History**
   - Query WhiteboardVersions by whiteboardId
   - Sort by version number
   - Paginate results

6. **Element Manipulation**
   - Find elements by whiteboardId and elementId
   - Update element properties
   - Broadcast changes to all connected users