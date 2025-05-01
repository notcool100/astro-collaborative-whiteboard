/**
 * Whiteboard controller
 * 
 * This file handles whiteboard operations.
 */

const whiteboardService = require('../services/whiteboard.service');
const workspaceService = require('../services/workspace.service');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Get whiteboards for a workspace
const getWorkspaceWhiteboards = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(workspaceId, userId);
    const workspace = await workspaceService.findWorkspaceById(workspaceId);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this workspace');
    }
    
    // Get whiteboards
    const whiteboards = await whiteboardService.getWorkspaceWhiteboards(workspaceId);
    
    res.status(200).json({
      whiteboards
    });
  } catch (error) {
    next(error);
  }
};

// Create a new whiteboard
const createWhiteboard = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, tags } = req.body;
    const userId = req.user.id;
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(workspaceId, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor')) {
      throw new ApiError(403, 'You do not have permission to create whiteboards in this workspace');
    }
    
    // Create whiteboard
    const whiteboard = await whiteboardService.createWhiteboard({
      name,
      workspaceId,
      createdBy: userId,
      createdByName: req.user.name,
      createdByAvatar: req.user.avatar,
      tags
    });
    
    res.status(201).json({
      message: 'Whiteboard created successfully',
      whiteboard
    });
  } catch (error) {
    next(error);
  }
};

// Get whiteboard by ID
const getWhiteboardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this whiteboard');
    }
    
    // Get latest version data
    const latestVersion = await whiteboardService.getLatestWhiteboardVersion(id);
    
    // Get elements
    const elements = await whiteboardService.getWhiteboardElements(id);
    
    res.status(200).json({
      whiteboard,
      version: latestVersion,
      elements
    });
  } catch (error) {
    next(error);
  }
};

// Update whiteboard
const updateWhiteboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tags, isArchived } = req.body;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor')) {
      throw new ApiError(403, 'You do not have permission to update this whiteboard');
    }
    
    // Update whiteboard
    const updatedWhiteboard = await whiteboardService.updateWhiteboard(id, {
      name,
      tags,
      isArchived
    });
    
    res.status(200).json({
      message: 'Whiteboard updated successfully',
      whiteboard: updatedWhiteboard
    });
  } catch (error) {
    next(error);
  }
};

// Delete whiteboard
const deleteWhiteboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new ApiError(403, 'You do not have permission to delete this whiteboard');
    }
    
    // Delete whiteboard
    await whiteboardService.deleteWhiteboard(id);
    
    res.status(200).json({
      message: 'Whiteboard deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Create a new whiteboard version
const createWhiteboardVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, thumbnail, metadata } = req.body;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor')) {
      throw new ApiError(403, 'You do not have permission to update this whiteboard');
    }
    
    // Create new version
    const newVersion = await whiteboardService.createWhiteboardVersion({
      whiteboardId: id,
      version: whiteboard.current_version + 1,
      data,
      thumbnail,
      createdBy: userId,
      metadata
    });
    
    res.status(201).json({
      message: 'Whiteboard version created successfully',
      version: newVersion
    });
  } catch (error) {
    next(error);
  }
};

// Get whiteboard versions
const getWhiteboardVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this whiteboard');
    }
    
    // Get versions
    const versions = await whiteboardService.getWhiteboardVersions(id);
    
    res.status(200).json({
      versions
    });
  } catch (error) {
    next(error);
  }
};

// Get specific whiteboard version
const getWhiteboardVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this whiteboard');
    }
    
    // Get version
    const version = await whiteboardService.getWhiteboardVersion(id, versionId);
    
    if (!version) {
      throw new ApiError(404, 'Version not found');
    }
    
    res.status(200).json({
      version
    });
  } catch (error) {
    next(error);
  }
};

// Create or update whiteboard element
const createOrUpdateElement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { elementId, type, properties, zIndex } = req.body;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor')) {
      throw new ApiError(403, 'You do not have permission to edit this whiteboard');
    }
    
    // Create or update element
    const element = await whiteboardService.createOrUpdateElement({
      whiteboardId: id,
      versionId: whiteboard.current_version_id,
      elementId,
      type,
      properties,
      zIndex,
      createdBy: userId,
      updatedBy: userId
    });
    
    res.status(200).json({
      element
    });
  } catch (error) {
    next(error);
  }
};

// Delete whiteboard element
const deleteElement = async (req, res, next) => {
  try {
    const { id, elementId } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor')) {
      throw new ApiError(403, 'You do not have permission to edit this whiteboard');
    }
    
    // Delete element
    const element = await whiteboardService.deleteElement(id, elementId, userId);
    
    if (!element) {
      throw new ApiError(404, 'Element not found');
    }
    
    res.status(200).json({
      message: 'Element deleted successfully',
      element
    });
  } catch (error) {
    next(error);
  }
};

// Get whiteboard elements
const getWhiteboardElements = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this whiteboard');
    }
    
    // Get elements
    const elements = await whiteboardService.getWhiteboardElements(id);
    
    res.status(200).json({
      elements
    });
  } catch (error) {
    next(error);
  }
};

// Export whiteboard
const exportWhiteboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    const userId = req.user.id;
    
    // Find whiteboard
    const whiteboard = await whiteboardService.findWhiteboardById(id);
    
    if (!whiteboard) {
      throw new ApiError(404, 'Whiteboard not found');
    }
    
    // Check if user has access to workspace
    const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, userId);
    const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
    
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this whiteboard');
    }
    
    // Get latest version data
    const latestVersion = await whiteboardService.getLatestWhiteboardVersion(id);
    
    // Get elements
    const elements = await whiteboardService.getWhiteboardElements(id);
    
    // Prepare export data
    const exportData = {
      whiteboard: {
        id: whiteboard.id,
        uuid: whiteboard.uuid,
        name: whiteboard.name,
        version: whiteboard.current_version
      },
      elements: elements.map(element => ({
        id: element.element_id,
        type: element.type,
        properties: element.properties,
        zIndex: element.z_index
      }))
    };
    
    // Handle different export formats
    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${whiteboard.name}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(exportData);
    } else {
      // Default to JSON if format not specified or not supported
      res.status(200).json(exportData);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkspaceWhiteboards,
  createWhiteboard,
  getWhiteboardById,
  updateWhiteboard,
  deleteWhiteboard,
  createWhiteboardVersion,
  getWhiteboardVersions,
  getWhiteboardVersion,
  createOrUpdateElement,
  deleteElement,
  getWhiteboardElements,
  exportWhiteboard
};