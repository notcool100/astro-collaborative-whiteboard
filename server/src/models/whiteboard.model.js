/**
 * Whiteboard model
 * 
 * This file defines the Mongoose schema for whiteboards.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const whiteboardSchema = new Schema({
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
    ref: 'WhiteboardVersion',
    default: null
  },
  currentVersion: {
    type: Number,
    default: 0
  },
  encryptionMetadata: {
    algorithm: {
      type: String,
      default: 'aes-256-gcm'
    },
    keyEncrypted: {
      type: Boolean,
      default: true
    },
    iv: {
      type: String,
      default: null
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastEditedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
whiteboardSchema.index({ workspaceId: 1 });
whiteboardSchema.index({ createdBy: 1 });
whiteboardSchema.index({ tags: 1 });

// Method to update the current version
whiteboardSchema.methods.updateCurrentVersion = function(versionId, versionNumber, userId) {
  this.currentVersionId = versionId;
  this.currentVersion = versionNumber;
  this.lastEditedBy = userId;
  return this.save();
};

// Method to update thumbnail
whiteboardSchema.methods.updateThumbnail = function(thumbnailUrl) {
  this.thumbnail = thumbnailUrl;
  return this.save();
};

const Whiteboard = mongoose.model('Whiteboard', whiteboardSchema);

module.exports = Whiteboard;