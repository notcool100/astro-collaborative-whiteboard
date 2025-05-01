/**
 * WhiteboardElement model
 * 
 * This file defines the Mongoose schema for whiteboard elements.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const positionSchema = new Schema({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  }
}, { _id: false });

const sizeSchema = new Schema({
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  }
}, { _id: false });

const whiteboardElementSchema = new Schema({
  whiteboardId: {
    type: Schema.Types.ObjectId,
    ref: 'Whiteboard',
    required: true
  },
  versionId: {
    type: Schema.Types.ObjectId,
    ref: 'WhiteboardVersion',
    required: true
  },
  elementId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['rectangle', 'circle', 'text', 'arrow', 'line', 'image', 'freehand'],
    required: true
  },
  properties: {
    position: {
      type: positionSchema,
      required: true
    },
    size: {
      type: sizeSchema,
      required: true
    },
    rotation: {
      type: Number,
      default: 0
    },
    strokeColor: {
      type: String,
      default: '#000000'
    },
    fillColor: {
      type: String,
      default: 'transparent'
    },
    strokeWidth: {
      type: Number,
      default: 1
    },
    opacity: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    },
    text: {
      type: String,
      default: null
    },
    fontSize: {
      type: Number,
      default: 16
    },
    fontFamily: {
      type: String,
      default: 'Arial'
    },
    points: [{
      type: positionSchema
    }]
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
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
whiteboardElementSchema.index({ whiteboardId: 1, elementId: 1 }, { unique: true });
whiteboardElementSchema.index({ whiteboardId: 1, versionId: 1 });
whiteboardElementSchema.index({ whiteboardId: 1, isDeleted: 1 });

// Static method to create or update an element
whiteboardElementSchema.statics.createOrUpdate = async function(elementData) {
  const { whiteboardId, elementId } = elementData;
  
  // Check if element exists
  const existingElement = await this.findOne({ 
    whiteboardId, 
    elementId,
    isDeleted: false
  });
  
  if (existingElement) {
    // Update existing element
    Object.assign(existingElement, elementData);
    existingElement.updatedBy = elementData.updatedBy || elementData.createdBy;
    return existingElement.save();
  } else {
    // Create new element
    return this.create(elementData);
  }
};

// Static method to delete an element
whiteboardElementSchema.statics.deleteElement = function(whiteboardId, elementId, userId) {
  return this.findOneAndUpdate(
    { whiteboardId, elementId },
    { 
      isDeleted: true,
      updatedBy: userId
    },
    { new: true }
  );
};

// Static method to get all elements for a whiteboard
whiteboardElementSchema.statics.getWhiteboardElements = function(whiteboardId, includeDeleted = false) {
  const query = { whiteboardId };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.find(query).sort({ zIndex: 1 });
};

const WhiteboardElement = mongoose.model('WhiteboardElement', whiteboardElementSchema);

module.exports = WhiteboardElement;