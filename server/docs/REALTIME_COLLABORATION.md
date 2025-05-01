# Real-time Collaboration Architecture

This document explains the real-time collaboration architecture used in PCS Draw. The application uses a combination of WebSockets, Redis Pub/Sub, and optimistic updates to provide a smooth collaborative experience.

## Table of Contents

1. [Overview](#overview)
2. [Technologies](#technologies)
3. [Architecture](#architecture)
4. [Data Flow](#data-flow)
5. [Conflict Resolution](#conflict-resolution)
6. [Presence and Awareness](#presence-and-awareness)
7. [Performance Considerations](#performance-considerations)
8. [Scaling](#scaling)

## Overview

PCS Draw enables multiple users to collaborate on the same whiteboard in real-time. Users can see each other's cursors, view changes as they happen, and work simultaneously without conflicts.

## Technologies

- **Socket.IO**: For WebSocket communication
- **Redis Pub/Sub**: For scaling WebSocket connections across multiple server instances
- **JSON Patch**: For efficient transmission of changes
- **Operational Transformation**: For conflict resolution

## Architecture

The real-time collaboration architecture follows a client-server model with the server acting as the source of truth.

### Components

1. **Client**: The frontend application running in the user's browser
2. **WebSocket Server**: Handles real-time communication between clients
3. **Redis Pub/Sub**: Enables scaling across multiple server instances
4. **Database**: Stores the persistent state of whiteboards

### Server-Side Architecture

```
+----------------+       +----------------+       +----------------+
|   Client 1     |       |   Client 2     |       |   Client 3     |
+----------------+       +----------------+       +----------------+
        |                       |                       |
        v                       v                       v
+-------------------------------------------------------+
|                     Load Balancer                     |
+-------------------------------------------------------+
        |                       |                       |
        v                       v                       v
+----------------+       +----------------+       +----------------+
|   Server 1     |       |   Server 2     |       |   Server 3     |
| (Socket.IO)    |       | (Socket.IO)    |       | (Socket.IO)    |
+----------------+       +----------------+       +----------------+
        |                       |                       |
        v                       v                       v
+-------------------------------------------------------+
|                 Redis Pub/Sub Channel                 |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|                     Database                          |
+-------------------------------------------------------+
```

## Data Flow

### Joining a Whiteboard

1. Client connects to the WebSocket server
2. Client sends a `join-whiteboard` event with the whiteboard ID
3. Server authenticates the user and checks permissions
4. Server adds the user to the whiteboard room
5. Server sends the current whiteboard state to the client
6. Server broadcasts a `user-joined` event to all clients in the room

### Making Changes

1. Client makes a change locally (optimistic update)
2. Client sends the change to the server via WebSocket
3. Server validates the change
4. Server applies the change to the whiteboard
5. Server broadcasts the change to all other clients
6. Server persists the change to the database

### Sequence Diagram

```
+--------+                  +--------+                  +--------+
| Client |                  | Server |                  | Redis  |
+--------+                  +--------+                  +--------+
    |                           |                           |
    | join-whiteboard           |                           |
    |-------------------------->|                           |
    |                           |                           |
    |                           | SUBSCRIBE whiteboard:123  |
    |                           |-------------------------->|
    |                           |                           |
    | joined-whiteboard         |                           |
    |<--------------------------|                           |
    |                           |                           |
    | element-update            |                           |
    |-------------------------->|                           |
    |                           |                           |
    |                           | PUBLISH whiteboard:123    |
    |                           |-------------------------->|
    |                           |                           |
    |                           | MESSAGE whiteboard:123    |
    |                           |<--------------------------|
    |                           |                           |
    | element-updated           |                           |
    |<--------------------------|                           |
    |                           |                           |
```

## Conflict Resolution

When multiple users edit the same element simultaneously, conflicts can occur. PCS Draw uses a combination of techniques to resolve these conflicts:

### Last-Write-Wins

For simple properties like color or size, the last change received by the server wins.

### Operational Transformation

For more complex operations like text editing or shape manipulation, operational transformation is used to ensure that all clients converge to the same state.

### Locking

For certain operations, a temporary lock can be applied to prevent conflicts. For example, when a user is resizing a shape, other users are temporarily prevented from resizing the same shape.

## Presence and Awareness

PCS Draw provides real-time awareness of other users' actions:

### User Cursors

Each user's cursor position is broadcast to all other users in the whiteboard. This allows users to see where others are working.

```javascript
// Send cursor position
socket.emit('cursor-position', {
  whiteboardId: '123',
  position: { x: 100, y: 200 }
});

// Receive cursor positions
socket.on('cursor-position', (data) => {
  updateCursorPosition(data.userId, data.position);
});
```

### User List

A list of active users is maintained and updated whenever a user joins or leaves.

```javascript
// Receive user list updates
socket.on('user-joined', (data) => {
  addUserToList(data.user);
  showNotification(`${data.user.name} joined`);
});

socket.on('user-left', (data) => {
  removeUserFromList(data.userId);
  showNotification(`${data.user.name} left`);
});
```

### Selection Indicators

When a user selects an element, other users can see what is being selected.

```javascript
// Send selection
socket.emit('element-select', {
  whiteboardId: '123',
  elementId: 'elem-1'
});

// Receive selections
socket.on('element-selected', (data) => {
  showSelectionIndicator(data.elementId, data.userId);
});
```

## Performance Considerations

### Throttling and Debouncing

To prevent overwhelming the server with updates, client-side throttling and debouncing are applied:

- Cursor movements are throttled to 50ms
- Element updates are debounced to 100ms
- Large batch operations are chunked

### Selective Broadcasting

The server only broadcasts changes to clients that need them:

- Changes are only sent to clients in the same whiteboard room
- Differential updates are used to minimize data transfer

### Compression

WebSocket messages are compressed to reduce bandwidth usage:

- JSON data is compressed using Socket.IO's built-in compression
- Binary data (like images) is compressed before transmission

## Scaling

The real-time collaboration architecture is designed to scale horizontally:

### Redis Pub/Sub

Redis Pub/Sub is used to synchronize WebSocket events across multiple server instances:

1. Each server instance subscribes to Redis channels for the whiteboards it's handling
2. When a server receives an update, it publishes the update to the corresponding Redis channel
3. All servers subscribed to that channel receive the update and broadcast it to their connected clients

### Room Sharding

For very active whiteboards with many users, room sharding can be implemented:

1. Users are assigned to different shards based on their user ID
2. Each shard is handled by a different server instance
3. Updates are synchronized across shards using Redis Pub/Sub

### Connection Pooling

Database and Redis connections are pooled to handle many concurrent operations efficiently.

## Implementation Details

### Socket.IO Namespace and Room Structure

```javascript
// Server-side setup
const io = require('socket.io')(server);
const whiteboardNamespace = io.of('/whiteboard');

whiteboardNamespace.on('connection', (socket) => {
  // Authenticate user
  const user = authenticateUser(socket.handshake.auth.token);
  
  // Join whiteboard room
  socket.on('join-whiteboard', async (data) => {
    const { whiteboardId } = data;
    
    // Check permissions
    const canAccess = await checkWhiteboardAccess(user.id, whiteboardId);
    if (!canAccess) {
      return socket.emit('error', { message: 'Access denied' });
    }
    
    // Join room
    socket.join(`whiteboard:${whiteboardId}`);
    
    // Get active users
    const activeUsers = getActiveUsers(whiteboardId);
    
    // Add user to active users
    addActiveUser(whiteboardId, user);
    
    // Notify client
    socket.emit('joined-whiteboard', { 
      whiteboardId, 
      activeUsers 
    });
    
    // Notify other users
    socket.to(`whiteboard:${whiteboardId}`).emit('user-joined', {
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      },
      activeUsers
    });
  });
  
  // Handle element updates
  socket.on('element-update', async (data) => {
    const { whiteboardId, element } = data;
    
    // Validate update
    const isValid = validateElementUpdate(element);
    if (!isValid) {
      return socket.emit('error', { message: 'Invalid element update' });
    }
    
    // Save to database
    await saveElement(whiteboardId, element, user.id);
    
    // Broadcast to other users
    socket.to(`whiteboard:${whiteboardId}`).emit('element-updated', {
      element,
      userId: user.id,
      userName: user.name
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Get user's active whiteboards
    const whiteboards = getUserWhiteboards(user.id);
    
    // Remove user from active users for each whiteboard
    whiteboards.forEach(whiteboardId => {
      removeActiveUser(whiteboardId, user.id);
      
      // Notify other users
      socket.to(`whiteboard:${whiteboardId}`).emit('user-left', {
        userId: user.id,
        userName: user.name,
        activeUsers: getActiveUsers(whiteboardId)
      });
    });
  });
});
```

### Redis Pub/Sub Implementation

```javascript
const Redis = require('ioredis');
const redisClient = new Redis();
const redisSub = new Redis();

// Subscribe to whiteboard channels
function subscribeToWhiteboard(whiteboardId) {
  redisSub.subscribe(`whiteboard:${whiteboardId}`);
}

// Publish updates to Redis
function publishWhiteboardUpdate(whiteboardId, data) {
  redisClient.publish(`whiteboard:${whiteboardId}`, JSON.stringify(data));
}

// Handle messages from Redis
redisSub.on('message', (channel, message) => {
  const whiteboardId = channel.split(':')[1];
  const data = JSON.parse(message);
  
  // Broadcast to all clients in the room
  io.of('/whiteboard').to(`whiteboard:${whiteboardId}`).emit(data.event, data.payload);
});
```

## Conclusion

The real-time collaboration architecture in PCS Draw provides a seamless experience for users working together on whiteboards. By combining WebSockets, Redis Pub/Sub, and optimistic updates, the application can handle many concurrent users while maintaining performance and consistency.