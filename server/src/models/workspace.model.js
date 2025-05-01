/**
 * Workspace model
 * 
 * This file defines the Mongoose schema for workspaces.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workspaceMemberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
});

const workspaceSchema = new Schema({
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
  members: [workspaceMemberSchema],
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
  }
}, {
  timestamps: true
});

// Index for faster queries
workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ 'members.userId': 1 });

// Virtual for getting all users (owner + members)
workspaceSchema.virtual('allUsers').get(function() {
  const users = this.members.map(member => member.userId);
  users.push(this.ownerId);
  return [...new Set(users)]; // Remove duplicates
});

// Method to check if a user is a member
workspaceSchema.methods.isMember = function(userId) {
  if (this.ownerId.toString() === userId.toString()) {
    return true;
  }
  
  return this.members.some(member => member.userId.toString() === userId.toString());
};

// Method to get a user's role
workspaceSchema.methods.getUserRole = function(userId) {
  if (this.ownerId.toString() === userId.toString()) {
    return 'owner';
  }
  
  const member = this.members.find(member => member.userId.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add a member
workspaceSchema.methods.addMember = function(userId, role = 'viewer') {
  // Check if user is already a member
  const existingMember = this.members.find(member => member.userId.toString() === userId.toString());
  
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({ userId, role });
  }
  
  return this.save();
};

// Method to remove a member
workspaceSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.userId.toString() !== userId.toString());
  return this.save();
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;