/**
 * CollaborationSession model
 * 
 * This file defines the Mongoose schema for real-time collaboration sessions.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cursorPositionSchema = new Schema({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  }
}, { _id: false });

const activeUserSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  cursorPosition: {
    type: cursorPositionSchema,
    default: { x: 0, y: 0 }
  },
  selection: [{
    type: String
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const collaborationSessionSchema = new Schema({
  whiteboardId: {
    type: Schema.Types.ObjectId,
    ref: 'Whiteboard',
    required: true,
    unique: true
  },
  activeUsers: [activeUserSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
collaborationSessionSchema.index({ whiteboardId: 1 }, { unique: true });
collaborationSessionSchema.index({ 'activeUsers.userId': 1 });
collaborationSessionSchema.index({ lastActivity: 1 });

// Method to add a user to the session
collaborationSessionSchema.methods.addUser = function(userId, connectionId) {
  // Check if user is already in the session
  const existingUserIndex = this.activeUsers.findIndex(
    user => user.userId.toString() === userId.toString()
  );
  
  if (existingUserIndex >= 0) {
    // Update existing user
    this.activeUsers[existingUserIndex].connectionId = connectionId;
    this.activeUsers[existingUserIndex].lastActivity = Date.now();
  } else {
    // Add new user
    this.activeUsers.push({
      userId,
      connectionId,
      cursorPosition: { x: 0, y: 0 },
      selection: [],
      lastActivity: Date.now()
    });
  }
  
  this.lastActivity = Date.now();
  return this.save();
};

// Method to remove a user from the session
collaborationSessionSchema.methods.removeUser = function(connectionId) {
  this.activeUsers = this.activeUsers.filter(user => user.connectionId !== connectionId);
  this.lastActivity = Date.now();
  return this.save();
};

// Method to update a user's cursor position
collaborationSessionSchema.methods.updateCursorPosition = function(connectionId, position) {
  const userIndex = this.activeUsers.findIndex(user => user.connectionId === connectionId);
  
  if (userIndex >= 0) {
    this.activeUsers[userIndex].cursorPosition = position;
    this.activeUsers[userIndex].lastActivity = Date.now();
    this.lastActivity = Date.now();
  }
  
  return this.save();
};

// Method to update a user's selection
collaborationSessionSchema.methods.updateSelection = function(connectionId, selection) {
  const userIndex = this.activeUsers.findIndex(user => user.connectionId === connectionId);
  
  if (userIndex >= 0) {
    this.activeUsers[userIndex].selection = selection;
    this.activeUsers[userIndex].lastActivity = Date.now();
    this.lastActivity = Date.now();
  }
  
  return this.save();
};

// Static method to get or create a session
collaborationSessionSchema.statics.getOrCreate = async function(whiteboardId) {
  let session = await this.findOne({ whiteboardId });
  
  if (!session) {
    session = await this.create({
      whiteboardId,
      activeUsers: [],
      startedAt: Date.now(),
      lastActivity: Date.now()
    });
  }
  
  return session;
};

// Static method to clean up inactive sessions
collaborationSessionSchema.statics.cleanupInactiveSessions = async function(maxInactiveTime = 24 * 60 * 60 * 1000) {
  const cutoffTime = new Date(Date.now() - maxInactiveTime);
  
  // Find sessions with no active users or inactive for too long
  const inactiveSessions = await this.find({
    $or: [
      { activeUsers: { $size: 0 } },
      { lastActivity: { $lt: cutoffTime } }
    ]
  });
  
  // Delete inactive sessions
  if (inactiveSessions.length > 0) {
    await this.deleteMany({
      _id: { $in: inactiveSessions.map(session => session._id) }
    });
  }
  
  return inactiveSessions.length;
};

const CollaborationSession = mongoose.model('CollaborationSession', collaborationSessionSchema);

module.exports = CollaborationSession;