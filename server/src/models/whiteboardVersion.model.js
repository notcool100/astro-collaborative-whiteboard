/**
 * WhiteboardVersion model
 * 
 * This file defines the Mongoose schema for whiteboard versions.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const whiteboardVersionSchema = new Schema({
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
  metadata: {
    clientInfo: {
      type: String,
      default: null
    },
    description: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
whiteboardVersionSchema.index({ whiteboardId: 1, version: 1 }, { unique: true });
whiteboardVersionSchema.index({ whiteboardId: 1, createdAt: -1 });

// Static method to create a new version
whiteboardVersionSchema.statics.createNewVersion = async function(whiteboardId, data, userId, metadata = {}) {
  // Find the latest version number
  const latestVersion = await this.findOne({ whiteboardId })
    .sort({ version: -1 })
    .select('version')
    .lean();
  
  const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
  
  // Create the new version
  const newVersion = await this.create({
    whiteboardId,
    version: newVersionNumber,
    data,
    createdBy: userId,
    metadata
  });
  
  // Update the whiteboard's current version
  const Whiteboard = mongoose.model('Whiteboard');
  await Whiteboard.findByIdAndUpdate(whiteboardId, {
    currentVersionId: newVersion._id,
    currentVersion: newVersionNumber,
    lastEditedBy: userId
  });
  
  return newVersion;
};

// Static method to get version history
whiteboardVersionSchema.statics.getVersionHistory = function(whiteboardId, limit = 10, skip = 0) {
  return this.find({ whiteboardId })
    .sort({ version: -1 })
    .skip(skip)
    .limit(limit)
    .select('-data') // Exclude the full data to reduce payload size
    .populate('createdBy', 'name email');
};

const WhiteboardVersion = mongoose.model('WhiteboardVersion', whiteboardVersionSchema);

module.exports = WhiteboardVersion;