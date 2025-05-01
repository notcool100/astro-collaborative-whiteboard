# PCS Draw API Documentation

This document provides comprehensive documentation for the PCS Draw backend API. It's designed to help frontend developers understand the available endpoints, request/response formats, and authentication requirements.

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Workspaces](#workspaces)
4. [Whiteboards](#whiteboards)
5. [Real-time Collaboration](#real-time-collaboration)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

PCS Draw uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header for protected routes.

### Authentication Endpoints

#### Register a New User

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg" // Optional
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "preferences": {
      "theme": "light",
      "language": "en"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout

```
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### Get Current User

```
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "preferences": {
      "theme": "light",
      "language": "en"
    },
    "lastActive": "2023-06-15T10:30:00Z"
  }
}
```

#### Update User Profile

```
PUT /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "fr"
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Smith",
    "avatar": "https://example.com/new-avatar.jpg",
    "preferences": {
      "theme": "dark",
      "language": "fr"
    }
  }
}
```

#### Change Password

```
PUT /api/auth/password
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "securepassword",
  "newPassword": "newsecurepassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

## Workspaces

Workspaces are containers for whiteboards. Users can create workspaces and invite other users to collaborate.

### Workspace Endpoints

#### Get User Workspaces

```
GET /api/workspaces
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "workspaces": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Project A",
      "description": "Workspace for Project A",
      "owner_id": 1,
      "owner_name": "John Doe",
      "settings": {
        "isPublic": false,
        "defaultPermission": "view"
      },
      "created_at": "2023-06-15T10:30:00Z",
      "updated_at": "2023-06-15T10:30:00Z",
      "user_role": "owner"
    },
    {
      "id": 2,
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Team Collaboration",
      "description": "Workspace for team collaboration",
      "owner_id": 2,
      "owner_name": "Jane Smith",
      "settings": {
        "isPublic": false,
        "defaultPermission": "edit"
      },
      "created_at": "2023-06-16T10:30:00Z",
      "updated_at": "2023-06-16T10:30:00Z",
      "user_role": "editor"
    }
  ]
}
```

#### Create Workspace

```
POST /api/workspaces
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Workspace",
  "description": "Description of the workspace",
  "isPublic": false,
  "defaultPermission": "view"
}
```

**Response (201 Created):**
```json
{
  "message": "Workspace created successfully",
  "workspace": {
    "id": 3,
    "uuid": "550e8400-e29b-41d4-a716-446655440002",
    "name": "New Workspace",
    "description": "Description of the workspace",
    "owner_id": 1,
    "settings": {
      "isPublic": false,
      "defaultPermission": "view"
    },
    "created_at": "2023-06-17T10:30:00Z",
    "updated_at": "2023-06-17T10:30:00Z"
  }
}
```

#### Get Workspace by ID

```
GET /api/workspaces/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "workspace": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Project A",
    "description": "Workspace for Project A",
    "owner_id": 1,
    "owner_name": "John Doe",
    "settings": {
      "isPublic": false,
      "defaultPermission": "view"
    },
    "created_at": "2023-06-15T10:30:00Z",
    "updated_at": "2023-06-15T10:30:00Z",
    "members": [
      {
        "id": 1,
        "user_id": 2,
        "name": "Jane Smith",
        "email": "jane@example.com",
        "avatar": "https://example.com/avatar2.jpg",
        "role": "editor",
        "joined_at": "2023-06-15T11:30:00Z"
      }
    ],
    "userRole": "owner"
  },
  "whiteboards": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Design Mockup",
      "workspace_id": 1,
      "thumbnail": "https://example.com/thumbnail1.jpg",
      "current_version": 3,
      "element_count": 25,
      "tags": ["design", "mockup"],
      "created_by": 1,
      "created_by_name": "John Doe",
      "created_at": "2023-06-15T12:30:00Z",
      "updated_at": "2023-06-16T09:30:00Z"
    }
  ]
}
```

#### Update Workspace

```
PUT /api/workspaces/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Workspace Name",
  "description": "Updated description",
  "isPublic": true,
  "defaultPermission": "edit"
}
```

**Response (200 OK):**
```json
{
  "message": "Workspace updated successfully",
  "workspace": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Workspace Name",
    "description": "Updated description",
    "owner_id": 1,
    "settings": {
      "isPublic": true,
      "defaultPermission": "edit"
    },
    "created_at": "2023-06-15T10:30:00Z",
    "updated_at": "2023-06-17T14:30:00Z"
  }
}
```

#### Delete Workspace

```
DELETE /api/workspaces/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Workspace and all associated whiteboards deleted successfully"
}
```

#### Add Workspace Member

```
POST /api/workspaces/:id/members
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "editor"
}
```

**Response (200 OK):**
```json
{
  "message": "Member added successfully",
  "member": {
    "id": 2,
    "userId": 3,
    "name": "New Member",
    "email": "newmember@example.com",
    "role": "editor"
  }
}
```

#### Update Member Role

```
PUT /api/workspaces/:id/members/:memberId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200 OK):**
```json
{
  "message": "Member role updated successfully",
  "member": {
    "id": 2,
    "workspace_id": 1,
    "user_id": 3,
    "role": "admin",
    "joined_at": "2023-06-17T14:30:00Z"
  }
}
```

#### Remove Workspace Member

```
DELETE /api/workspaces/:id/members/:memberId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Member removed successfully"
}
```

## Whiteboards

Whiteboards are the core feature of PCS Draw, allowing users to create and collaborate on drawings.

### Whiteboard Endpoints

#### Get Workspace Whiteboards

```
GET /api/workspaces/:workspaceId/whiteboards
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "whiteboards": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Design Mockup",
      "workspace_id": 1,
      "thumbnail": "https://example.com/thumbnail1.jpg",
      "current_version": 3,
      "element_count": 25,
      "tags": ["design", "mockup"],
      "is_archived": false,
      "created_by": 1,
      "created_by_name": "John Doe",
      "created_at": "2023-06-15T12:30:00Z",
      "updated_at": "2023-06-16T09:30:00Z"
    },
    {
      "id": 2,
      "uuid": "550e8400-e29b-41d4-a716-446655440004",
      "name": "User Flow",
      "workspace_id": 1,
      "thumbnail": "https://example.com/thumbnail2.jpg",
      "current_version": 2,
      "element_count": 15,
      "tags": ["flow", "user-journey"],
      "is_archived": false,
      "created_by": 1,
      "created_by_name": "John Doe",
      "created_at": "2023-06-16T12:30:00Z",
      "updated_at": "2023-06-17T09:30:00Z"
    }
  ]
}
```

#### Create Whiteboard

```
POST /api/workspaces/:workspaceId/whiteboards
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Whiteboard",
  "tags": ["brainstorm", "ideas"]
}
```

**Response (201 Created):**
```json
{
  "message": "Whiteboard created successfully",
  "whiteboard": {
    "id": 3,
    "uuid": "550e8400-e29b-41d4-a716-446655440005",
    "name": "New Whiteboard",
    "workspace_id": 1,
    "thumbnail": null,
    "current_version": 1,
    "element_count": 0,
    "tags": ["brainstorm", "ideas"],
    "created_by": 1,
    "created_by_name": "John Doe",
    "created_at": "2023-06-18T12:30:00Z",
    "updated_at": "2023-06-18T12:30:00Z"
  }
}
```

#### Get Whiteboard by ID

```
GET /api/whiteboards/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "whiteboard": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Design Mockup",
    "workspace_id": 1,
    "workspace_name": "Project A",
    "thumbnail": "https://example.com/thumbnail1.jpg",
    "current_version": 3,
    "element_count": 25,
    "tags": ["design", "mockup"],
    "is_archived": false,
    "created_by": 1,
    "created_by_name": "John Doe",
    "created_by_avatar": "https://example.com/avatar.jpg",
    "last_edited_by": 2,
    "last_edited_by_name": "Jane Smith",
    "created_at": "2023-06-15T12:30:00Z",
    "updated_at": "2023-06-16T09:30:00Z"
  },
  "version": {
    "id": 3,
    "whiteboard_id": 1,
    "version": 3,
    "data": {
      "elements": [
        // Array of elements
      ]
    },
    "thumbnail": "https://example.com/thumbnail1.jpg",
    "created_by": 2,
    "created_by_name": "Jane Smith",
    "created_at": "2023-06-16T09:30:00Z",
    "metadata": {
      "changes": "Added new elements"
    }
  },
  "elements": [
    {
      "id": 1,
      "whiteboard_id": 1,
      "element_id": "elem-1",
      "type": "rectangle",
      "properties": {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "fill": "#ff0000",
        "stroke": "#000000",
        "strokeWidth": 2
      },
      "z_index": 1,
      "is_deleted": false,
      "created_by": 1,
      "updated_by": 2,
      "created_at": "2023-06-15T12:35:00Z",
      "updated_at": "2023-06-16T09:25:00Z"
    }
    // More elements...
  ]
}
```

#### Update Whiteboard

```
PUT /api/whiteboards/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Whiteboard Name",
  "tags": ["design", "mockup", "updated"],
  "isArchived": false
}
```

**Response (200 OK):**
```json
{
  "message": "Whiteboard updated successfully",
  "whiteboard": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Updated Whiteboard Name",
    "workspace_id": 1,
    "thumbnail": "https://example.com/thumbnail1.jpg",
    "current_version": 3,
    "element_count": 25,
    "tags": ["design", "mockup", "updated"],
    "is_archived": false,
    "created_by": 1,
    "created_by_name": "John Doe",
    "created_at": "2023-06-15T12:30:00Z",
    "updated_at": "2023-06-18T15:30:00Z"
  }
}
```

#### Delete Whiteboard

```
DELETE /api/whiteboards/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Whiteboard deleted successfully"
}
```

#### Create Whiteboard Version

```
POST /api/whiteboards/:id/versions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "data": {
    "elements": [
      // Array of elements
    ]
  },
  "thumbnail": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "metadata": {
    "changes": "Updated layout"
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Whiteboard version created successfully",
  "version": {
    "id": 4,
    "whiteboard_id": 1,
    "version": 4,
    "thumbnail": "https://example.com/thumbnail1-v4.jpg",
    "created_by": 1,
    "created_at": "2023-06-18T15:45:00Z"
  }
}
```

#### Get Whiteboard Versions

```
GET /api/whiteboards/:id/versions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "versions": [
    {
      "id": 4,
      "whiteboard_id": 1,
      "version": 4,
      "thumbnail": "https://example.com/thumbnail1-v4.jpg",
      "created_by": 1,
      "created_by_name": "John Doe",
      "created_at": "2023-06-18T15:45:00Z",
      "metadata": {
        "changes": "Updated layout"
      }
    },
    {
      "id": 3,
      "whiteboard_id": 1,
      "version": 3,
      "thumbnail": "https://example.com/thumbnail1-v3.jpg",
      "created_by": 2,
      "created_by_name": "Jane Smith",
      "created_at": "2023-06-16T09:30:00Z",
      "metadata": {
        "changes": "Added new elements"
      }
    }
    // More versions...
  ]
}
```

#### Get Specific Whiteboard Version

```
GET /api/whiteboards/:id/versions/:versionId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "version": {
    "id": 3,
    "whiteboard_id": 1,
    "version": 3,
    "data": {
      "elements": [
        // Array of elements
      ]
    },
    "delta": {
      // Changes from previous version
    },
    "thumbnail": "https://example.com/thumbnail1-v3.jpg",
    "created_by": 2,
    "created_by_name": "Jane Smith",
    "created_at": "2023-06-16T09:30:00Z",
    "metadata": {
      "changes": "Added new elements"
    }
  }
}
```

#### Create or Update Whiteboard Element

```
POST /api/whiteboards/:id/elements
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "elementId": "elem-5",
  "type": "circle",
  "properties": {
    "x": 300,
    "y": 200,
    "radius": 50,
    "fill": "#00ff00",
    "stroke": "#000000",
    "strokeWidth": 2
  },
  "zIndex": 3
}
```

**Response (200 OK):**
```json
{
  "element": {
    "id": 5,
    "whiteboard_id": 1,
    "element_id": "elem-5",
    "type": "circle",
    "properties": {
      "x": 300,
      "y": 200,
      "radius": 50,
      "fill": "#00ff00",
      "stroke": "#000000",
      "strokeWidth": 2
    },
    "z_index": 3,
    "is_deleted": false,
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2023-06-18T16:00:00Z",
    "updated_at": "2023-06-18T16:00:00Z"
  }
}
```

#### Delete Whiteboard Element

```
DELETE /api/whiteboards/:id/elements/:elementId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Element deleted successfully",
  "element": {
    "id": 5,
    "whiteboard_id": 1,
    "element_id": "elem-5",
    "type": "circle",
    "properties": {
      "x": 300,
      "y": 200,
      "radius": 50,
      "fill": "#00ff00",
      "stroke": "#000000",
      "strokeWidth": 2
    },
    "z_index": 3,
    "is_deleted": true,
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2023-06-18T16:00:00Z",
    "updated_at": "2023-06-18T16:15:00Z"
  }
}
```

#### Get Whiteboard Elements

```
GET /api/whiteboards/:id/elements
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "elements": [
    {
      "id": 1,
      "whiteboard_id": 1,
      "element_id": "elem-1",
      "type": "rectangle",
      "properties": {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "fill": "#ff0000",
        "stroke": "#000000",
        "strokeWidth": 2
      },
      "z_index": 1,
      "is_deleted": false,
      "created_by": 1,
      "updated_by": 2,
      "created_at": "2023-06-15T12:35:00Z",
      "updated_at": "2023-06-16T09:25:00Z"
    }
    // More elements...
  ]
}
```

#### Export Whiteboard

```
GET /api/whiteboards/:id/export?format=json
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "whiteboard": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Design Mockup",
    "version": 3
  },
  "elements": [
    {
      "id": "elem-1",
      "type": "rectangle",
      "properties": {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "fill": "#ff0000",
        "stroke": "#000000",
        "strokeWidth": 2
      },
      "zIndex": 1
    }
    // More elements...
  ]
}
```

## Real-time Collaboration

PCS Draw uses WebSockets for real-time collaboration. The server uses Socket.IO to handle WebSocket connections.

### WebSocket Events

#### Connection

```javascript
// Connect to WebSocket server
const socket = io('/whiteboard', {
  auth: {
    token: 'JWT_TOKEN'
  }
});
```

#### Join Whiteboard Room

```javascript
// Join a whiteboard room
socket.emit('join-whiteboard', {
  whiteboardId: '1',
  userName: 'John Doe',
  userAvatar: 'https://example.com/avatar.jpg'
});

// Listen for join confirmation
socket.on('joined-whiteboard', (data) => {
  console.log('Joined whiteboard:', data.whiteboardId);
  console.log('Active users:', data.activeUsers);
});
```

#### Element Updates

```javascript
// Send element update
socket.emit('element-update', {
  whiteboardId: '1',
  element: {
    id: 'elem-1',
    type: 'rectangle',
    properties: {
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2
    },
    zIndex: 1
  }
});

// Listen for element updates from other users
socket.on('element-updated', (data) => {
  console.log('Element updated:', data.element);
  console.log('Updated by:', data.userName);
});
```

#### Element Deletion

```javascript
// Send element deletion
socket.emit('element-delete', {
  whiteboardId: '1',
  elementId: 'elem-1'
});

// Listen for element deletions from other users
socket.on('element-deleted', (data) => {
  console.log('Element deleted:', data.elementId);
  console.log('Deleted by:', data.userName);
});
```

#### User Presence

```javascript
// Listen for user joined
socket.on('user-joined', (data) => {
  console.log('User joined:', data.userName);
  console.log('Active users:', data.activeUsers);
});

// Listen for user left
socket.on('user-left', (data) => {
  console.log('User left:', data.userName);
  console.log('Active users:', data.activeUsers);
});

// Listen for user cursor position
socket.on('cursor-position', (data) => {
  console.log('User cursor:', data.userName, data.position);
});

// Send cursor position
socket.emit('cursor-position', {
  whiteboardId: '1',
  position: { x: 100, y: 100 }
});
```

#### Disconnect

```javascript
// Leave whiteboard room
socket.emit('leave-whiteboard', {
  whiteboardId: '1'
});

// Disconnect from WebSocket server
socket.disconnect();
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response will include an error message.

### Error Response Format

```json
{
  "error": {
    "status": 404,
    "message": "Whiteboard not found"
  }
}
```

### Common Error Codes

- **400 Bad Request**: The request was malformed or missing required parameters.
- **401 Unauthorized**: Authentication is required or the provided credentials are invalid.
- **403 Forbidden**: The authenticated user does not have permission to access the requested resource.
- **404 Not Found**: The requested resource was not found.
- **409 Conflict**: The request could not be completed due to a conflict with the current state of the resource.
- **500 Internal Server Error**: An unexpected error occurred on the server.

## Data Models

### User

```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "light",
    "language": "en"
  },
  "last_active": "2023-06-15T10:30:00Z",
  "created_at": "2023-06-01T10:30:00Z",
  "updated_at": "2023-06-15T10:30:00Z"
}
```

### Workspace

```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Project A",
  "description": "Workspace for Project A",
  "owner_id": 1,
  "owner_name": "John Doe",
  "settings": {
    "isPublic": false,
    "defaultPermission": "view"
  },
  "created_at": "2023-06-15T10:30:00Z",
  "updated_at": "2023-06-15T10:30:00Z"
}
```

### Workspace Member

```json
{
  "id": 1,
  "workspace_id": 1,
  "user_id": 2,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "avatar": "https://example.com/avatar2.jpg",
  "role": "editor",
  "joined_at": "2023-06-15T11:30:00Z"
}
```

### Whiteboard

```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Design Mockup",
  "workspace_id": 1,
  "workspace_name": "Project A",
  "thumbnail": "https://example.com/thumbnail1.jpg",
  "current_version": 3,
  "element_count": 25,
  "tags": ["design", "mockup"],
  "is_archived": false,
  "encryption_metadata": null,
  "created_by": 1,
  "created_by_name": "John Doe",
  "created_by_avatar": "https://example.com/avatar.jpg",
  "last_edited_by": 2,
  "last_edited_by_name": "Jane Smith",
  "created_at": "2023-06-15T12:30:00Z",
  "updated_at": "2023-06-16T09:30:00Z"
}
```

### Whiteboard Version

```json
{
  "id": 3,
  "whiteboard_id": 1,
  "version": 3,
  "data": {
    "elements": [
      // Array of elements
    ]
  },
  "delta": {
    // Changes from previous version
  },
  "thumbnail": "https://example.com/thumbnail1-v3.jpg",
  "created_by": 2,
  "created_by_name": "Jane Smith",
  "created_at": "2023-06-16T09:30:00Z",
  "metadata": {
    "changes": "Added new elements"
  }
}
```

### Whiteboard Element

```json
{
  "id": 1,
  "whiteboard_id": 1,
  "element_id": "elem-1",
  "type": "rectangle",
  "properties": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150,
    "fill": "#ff0000",
    "stroke": "#000000",
    "strokeWidth": 2
  },
  "z_index": 1,
  "is_deleted": false,
  "created_by": 1,
  "updated_by": 2,
  "created_at": "2023-06-15T12:35:00Z",
  "updated_at": "2023-06-16T09:25:00Z"
}
```

### Collaboration Session

```json
{
  "id": 1,
  "whiteboard_id": 1,
  "active_users": [
    {
      "id": 1,
      "name": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "cursor": { "x": 100, "y": 100 }
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "avatar": "https://example.com/avatar2.jpg",
      "cursor": { "x": 200, "y": 150 }
    }
  ],
  "started_at": "2023-06-18T14:30:00Z",
  "last_activity": "2023-06-18T16:30:00Z"
}
```