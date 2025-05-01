/**
 * Workspace controller
 * 
 * This file handles workspace operations.
 */

const workspaceService = require('../services/workspace.service');
const whiteboardService = require('../services/whiteboard.service');
const userService = require('../services/user.service');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Get all workspaces for the current user
const getUserWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find workspaces where user is owner or member
    const workspaces = await workspaceService.getUserWorkspaces(userId);
    
    res.status(200).json({
      workspaces
    });
  } catch (error) {
    next(error);
  }
};

// Create a new workspace
const createWorkspace = async (req, res, next) => {
  try {
    const { name, description, isPublic, defaultPermission } = req.body;
    const userId = req.user.id;
    
    // Create workspace
    const workspace = await workspaceService.createWorkspace({
      name,
      description,
      ownerId: userId,
      settings: {
        isPublic: isPublic || false,
        defaultPermission: defaultPermission || 'view'
      }
    });
    
    res.status(201).json({
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    next(error);
  }
};

// Get workspace by ID
const getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user has access
    const membership = await workspaceService.checkWorkspaceMembership(id, userId);
    const isPublic = workspace.settings && workspace.settings.isPublic;
    
    if (!membership && !isPublic) {
      throw new ApiError(403, 'You do not have access to this workspace');
    }
    
    // Get workspace members
    const members = await workspaceService.getWorkspaceMembers(id);
    
    // Get whiteboards in this workspace
    const whiteboards = await whiteboardService.getWorkspaceWhiteboards(id);
    
    res.status(200).json({
      workspace: {
        ...workspace,
        members,
        userRole: membership ? membership.role : 'viewer'
      },
      whiteboards
    });
  } catch (error) {
    next(error);
  }
};

// Update workspace
const updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic, defaultPermission } = req.body;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user is owner or admin
    const membership = await workspaceService.checkWorkspaceMembership(id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new ApiError(403, 'You do not have permission to update this workspace');
    }
    
    // Prepare update data
    const updateData = {};
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    // Only owner can change these settings
    if (membership.role === 'owner' || membership.isOwner) {
      if (isPublic !== undefined || defaultPermission) {
        updateData.settings = {};
        if (isPublic !== undefined) updateData.settings.isPublic = isPublic;
        if (defaultPermission) updateData.settings.defaultPermission = defaultPermission;
      }
    }
    
    // Update workspace
    const updatedWorkspace = await workspaceService.updateWorkspace(id, updateData);
    
    res.status(200).json({
      message: 'Workspace updated successfully',
      workspace: updatedWorkspace
    });
  } catch (error) {
    next(error);
  }
};

// Delete workspace
const deleteWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user is owner
    if (workspace.owner_id !== userId) {
      throw new ApiError(403, 'Only the workspace owner can delete it');
    }
    
    // Delete workspace (this will cascade delete all related data)
    await workspaceService.deleteWorkspace(id);
    
    res.status(200).json({
      message: 'Workspace and all associated whiteboards deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add member to workspace
const addWorkspaceMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user is owner or admin
    const membership = await workspaceService.checkWorkspaceMembership(id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new ApiError(403, 'You do not have permission to add members');
    }
    
    // Find user by email
    const user = await userService.findUserByEmail(email);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if user is already a member
    const existingMembership = await workspaceService.checkWorkspaceMembership(id, user.id);
    
    if (existingMembership) {
      throw new ApiError(409, 'User is already a member of this workspace');
    }
    
    // Validate role (admins can only add viewers or editors)
    if (membership.role === 'admin' && role === 'admin') {
      throw new ApiError(403, 'Only workspace owners can add admin members');
    }
    
    // Add member
    const newMember = await workspaceService.addWorkspaceMember(id, user.id, role || 'viewer');
    
    res.status(200).json({
      message: 'Member added successfully',
      member: {
        id: newMember.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: newMember.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update member role
const updateMemberRole = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user is owner or admin
    const membership = await workspaceService.checkWorkspaceMembership(id, userId);
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new ApiError(403, 'You do not have permission to update member roles');
    }
    
    // Validate role (admins can only set viewer or editor roles)
    if (membership.role === 'admin' && role === 'admin') {
      throw new ApiError(403, 'Only workspace owners can assign admin roles');
    }
    
    // Update member role
    const updatedMember = await workspaceService.updateMemberRole(id, memberId, role);
    
    if (!updatedMember) {
      throw new ApiError(404, 'Member not found');
    }
    
    res.status(200).json({
      message: 'Member role updated successfully',
      member: updatedMember
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from workspace
const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    
    // Find workspace
    const workspace = await workspaceService.findWorkspaceById(id);
    
    if (!workspace) {
      throw new ApiError(404, 'Workspace not found');
    }
    
    // Check if user is owner, admin, or removing themselves
    const membership = await workspaceService.checkWorkspaceMembership(id, userId);
    const isSelfRemoval = memberId === userId.toString();
    
    if (!isSelfRemoval && (!membership || (membership.role !== 'owner' && membership.role !== 'admin'))) {
      throw new ApiError(403, 'You do not have permission to remove members');
    }
    
    // Get member's role
    const memberMembership = await workspaceService.checkWorkspaceMembership(id, memberId);
    
    if (!memberMembership) {
      throw new ApiError(404, 'Member not found');
    }
    
    // Admins can't remove other admins (only owners can)
    if (membership.role === 'admin' && memberMembership.role === 'admin') {
      throw new ApiError(403, 'Admins cannot remove other admins');
    }
    
    // Remove member
    await workspaceService.removeWorkspaceMember(id, memberId);
    
    res.status(200).json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserWorkspaces,
  createWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember
};