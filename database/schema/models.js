/**
 * MongoDB Schema Models for PCS Draw
 * 
 * This file defines the Mongoose schema models for the PCS Draw application.
 * These models represent the core data structures and relationships in the database.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Schema
 * Represents user accounts and profile information
 */
const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for User schema
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ name: 1 });
UserSchema.index({ lastActive: -1 });

/**
 * Workspace Schema
 * Represents organizational units containing multiple whiteboards
 */
const WorkspaceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    defaultPermission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for Workspace schema
WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ 'members.userId': 1, 'members.role': 1 });
WorkspaceSchema.index({ name: 'text', description: 'text' });
WorkspaceSchema.index({ updatedAt: -1 });
WorkspaceSchema.index({ 'settings.isPublic': 1, updatedAt: -1 });

/**
 * Whiteboard Schema
 * Represents individual drawing canvases with metadata
 */
const WhiteboardSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  currentVersionId: {
    type: Schema.Types.ObjectId,
    ref: 'WhiteboardVersion'
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  elementCount: {
    type: Number,
    default: 0
  },
  encryptionMetadata: {
    algorithm: {
      type: String,
      default: 'AES-GCM'
    },
    keyEncrypted: {
      type: Boolean,
      default: true
    },
    iv: String,
    rotatedAt: Date
  },
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String, // Denormalized for performance
  createdByAvatar: String, // Denormalized for performance
  lastEditedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for Whiteboard schema
WhiteboardSchema.index({ workspaceId: 1 });
WhiteboardSchema.index({ workspaceId: 1, updatedAt: -1 });
WhiteboardSchema.index({ createdBy: 1 });
WhiteboardSchema.index({ lastEditedBy: 1 });
WhiteboardSchema.index({ name: 'text', tags: 'text' });
WhiteboardSchema.index({ tags: 1, updatedAt: -1 });
WhiteboardSchema.index({ isArchived: 1 });

/**
 * WhiteboardVersion Schema
 * Represents version history for whiteboards
 */
const WhiteboardVersionSchema = new Schema({
  whiteboardId: {
    type: Schema.Types.ObjectId,
    ref: 'Whiteboard',
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  delta: {
    type: Object,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    clientInfo: String,
    description: String
  }
});

// Create indexes for WhiteboardVersion schema
WhiteboardVersionSchema.index({ whiteboardId: 1, version: -1 });
WhiteboardVersionSchema.index({ createdBy: 1 });
WhiteboardVersionSchema.index({ createdAt: -1 });
WhiteboardVersionSchema.index({ whiteboardId: 1, createdAt: -1 });

/**
 * WhiteboardElement Schema
 * Represents individual elements within whiteboards
 */
const WhiteboardElementSchema = new Schema({
  whiteboardId: {
    type: Schema.Types.ObjectId,
    ref: 'Whiteboard',
    required: true
  },
  versionId: {
    type: Schema.Types.ObjectId,
    ref: 'WhiteboardVersion'
  },
  elementId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['rectangle', 'circle', 'text', 'arrow', 'line', 'freehand', 'image'],
    required: true
  },
  properties: {
    position: {
      x: Number,
      y: Number
    },
    size: {
      width: Number,
      height: Number
    },
    rotation: {
      type: Number,
      default: 0
    },
    strokeColor: String,
    fillColor: String,
    strokeWidth: Number,
    opacity: {
      type: Number,
      default: 1
    },
    text: String, // For text elements
    fontSize: Number, // For text elements
    fontFamily: String, // For text elements
    points: [{ x: Number, y: Number }], // For freehand elements
    src: String // For image elements
  },
  zIndex: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for WhiteboardElement schema
WhiteboardElementSchema.index({ whiteboardId: 1 });
WhiteboardElementSchema.index({ versionId: 1 });
WhiteboardElementSchema.index({ whiteboardId: 1, type: 1 });
WhiteboardElementSchema.index({ whiteboardId: 1, zIndex: 1 });
WhiteboardElementSchema.index({ whiteboardId: 1, elementId: 1 }, { unique: true });
WhiteboardElementSchema.index({ whiteboardId: 1, isDeleted: 1 });
WhiteboardElementSchema.index({ createdBy: 1 });

/**
 * CollaborationSession Schema
 * Represents active collaboration sessions on whiteboards
 */
const CollaborationSessionSchema = new Schema({
  whiteboardId: {
    type: Schema.Types.ObjectId,
    ref: 'Whiteboard',
    required: true
  },
  activeUsers: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    connectionId: String,
    cursorPosition: {
      x: Number,
      y: Number
    },
    selection: [String], // Array of elementIds
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for CollaborationSession schema
CollaborationSessionSchema.index({ whiteboardId: 1 });
CollaborationSessionSchema.index({ 'activeUsers.userId': 1 });
CollaborationSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL

/**
 * ActivityLog Schema
 * Represents user activity for auditing and analytics
 */
const ActivityLogSchema = new Schema({
  entityType: {
    type: String,
    enum: ['user', 'workspace', 'whiteboard'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'share', 'view', 'export'],
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for ActivityLog schema
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Create and export models
const User = mongoose.model('User', UserSchema);
const Workspace = mongoose.model('Workspace', WorkspaceSchema);
const Whiteboard = mongoose.model('Whiteboard', WhiteboardSchema);
const WhiteboardVersion = mongoose.model('WhiteboardVersion', WhiteboardVersionSchema);
const WhiteboardElement = mongoose.model('WhiteboardElement', WhiteboardElementSchema);
const CollaborationSession = mongoose.model('CollaborationSession', CollaborationSessionSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

module.exports = {
  User,
  Workspace,
  Whiteboard,
  WhiteboardVersion,
  WhiteboardElement,
  CollaborationSession,
  ActivityLog
};