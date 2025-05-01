/**
 * Authentication middleware
 * 
 * This middleware handles JWT authentication and role-based access control.
 */

const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const userService = require('../services/user.service');
const workspaceService = require('../services/workspace.service');
const whiteboardService = require('../services/whiteboard.service');
const redisClient = require('../config/redis').getClient;
const logger = require('../utils/logger');

// Verify JWT token
const authenticateJWT = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. No token provided.');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted (logged out)
    const isBlacklisted = await redisClient().get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new ApiError(401, 'Token has been revoked');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await userService.findUserById(decoded.userId);
    
    if (!user) {
      throw new ApiError(401, 'User not found');
    }
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    
    next(error);
  }
};

// Check if user has required role for workspace
const requireWorkspaceRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;
      
      // Find workspace and check user's role
      const workspace = await workspaceService.findWorkspaceById(workspaceId);
      
      if (!workspace) {
        throw new ApiError(404, 'Workspace not found');
      }
      
      // Check user's membership
      const membership = await workspaceService.checkWorkspaceMembership(workspaceId, userId);
      
      if (!membership) {
        throw new ApiError(403, 'You do not have access to this workspace');
      }
      
      // Check if user's role is in the required roles
      if (!requiredRoles.includes(membership.role)) {
        throw new ApiError(403, `This action requires ${requiredRoles.join(' or ')} role`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user has required role for whiteboard
const requireWhiteboardAccess = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      // Find whiteboard
      const whiteboard = await Whiteboard.findById(id).populate('workspaceId');
      
      if (!whiteboard) {
        throw new ApiError(404, 'Whiteboard not found');
      }
      
      const workspace = whiteboard.workspaceId;
      
      // Check if user is the workspace owner
      if (workspace.ownerId.toString() === userId.toString()) {
        return next(); // Owner has all permissions
      }
      
      // Find user's membership
      const membership = workspace.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      if (!membership) {
        throw new ApiError(403, 'You do not have access to this whiteboard');
      }
      
      // Check if user's role is in the required roles
      if (!requiredRoles.includes(membership.role)) {
        throw new ApiError(403, `This action requires ${requiredRoles.join(' or ')} role`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateJWT,
  requireWorkspaceRole,
  requireWhiteboardAccess
};