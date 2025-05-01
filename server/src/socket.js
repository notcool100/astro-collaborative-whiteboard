/**
 * WebSocket server configuration
 * 
 * This file sets up the Socket.IO server for real-time communication.
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { getClient } = require('./config/redis');
const logger = require('./utils/logger');
const userService = require('./services/user.service');
const whiteboardService = require('./services/whiteboard.service');
const workspaceService = require('./services/workspace.service');

// Store active users by whiteboard
const activeWhiteboards = new Map();

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 */
function initializeSocketServer(httpServer) {
  const io = socketIo(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Create whiteboard namespace
  const whiteboardNamespace = io.of('/whiteboard');

  // Authentication middleware
  whiteboardNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Check if token is blacklisted
      const redisClient = getClient();
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      
      if (isBlacklisted) {
        return next(new Error('Token has been revoked'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await userService.findUserById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      
      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  whiteboardNamespace.on('connection', (socket) => {
    const user = socket.user;
    
    logger.info(`User connected: ${user.name} (${user.id})`);
    
    // Join whiteboard room
    socket.on('join-whiteboard', async (data) => {
      try {
        const { whiteboardId } = data;
        
        // Check if whiteboard exists
        const whiteboard = await whiteboardService.findWhiteboardById(whiteboardId);
        
        if (!whiteboard) {
          return socket.emit('error', { message: 'Whiteboard not found' });
        }
        
        // Check if user has access to whiteboard
        const membership = await workspaceService.checkWorkspaceMembership(whiteboard.workspace_id, user.id);
        const workspace = await workspaceService.findWorkspaceById(whiteboard.workspace_id);
        
        const isPublic = workspace.settings && workspace.settings.isPublic;
        
        if (!membership && !isPublic) {
          return socket.emit('error', { message: 'You do not have access to this whiteboard' });
        }
        
        // Join room
        socket.join(`whiteboard:${whiteboardId}`);
        
        // Add user to active users
        if (!activeWhiteboards.has(whiteboardId)) {
          activeWhiteboards.set(whiteboardId, new Map());
        }
        
        const activeUsers = activeWhiteboards.get(whiteboardId);
        
        activeUsers.set(user.id, {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          cursor: null,
          lastActive: new Date()
        });
        
        // Get active users list
        const activeUsersList = Array.from(activeUsers.values());
        
        // Notify client
        socket.emit('joined-whiteboard', {
          whiteboardId,
          activeUsers: activeUsersList
        });
        
        // Notify other users
        socket.to(`whiteboard:${whiteboardId}`).emit('user-joined', {
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          },
          activeUsers: activeUsersList
        });
        
        logger.info(`User ${user.name} (${user.id}) joined whiteboard ${whiteboardId}`);
      } catch (error) {
        logger.error(`Error joining whiteboard: ${error.message}`);
        socket.emit('error', { message: 'Failed to join whiteboard' });
      }
    });
    
    // Leave whiteboard
    socket.on('leave-whiteboard', (data) => {
      try {
        const { whiteboardId } = data;
        
        // Leave room
        socket.leave(`whiteboard:${whiteboardId}`);
        
        // Remove user from active users
        if (activeWhiteboards.has(whiteboardId)) {
          const activeUsers = activeWhiteboards.get(whiteboardId);
          activeUsers.delete(user.id);
          
          // If no users left, remove whiteboard
          if (activeUsers.size === 0) {
            activeWhiteboards.delete(whiteboardId);
          } else {
            // Notify other users
            const activeUsersList = Array.from(activeUsers.values());
            
            socket.to(`whiteboard:${whiteboardId}`).emit('user-left', {
              userId: user.id,
              userName: user.name,
              activeUsers: activeUsersList
            });
          }
        }
        
        logger.info(`User ${user.name} (${user.id}) left whiteboard ${whiteboardId}`);
      } catch (error) {
        logger.error(`Error leaving whiteboard: ${error.message}`);
      }
    });
    
    // Element update
    socket.on('element-update', async (data) => {
      try {
        const { whiteboardId, element } = data;
        
        // Validate element
        if (!element || !element.id || !element.type) {
          return socket.emit('error', { message: 'Invalid element data' });
        }
        
        // Update active timestamp
        if (activeWhiteboards.has(whiteboardId)) {
          const activeUsers = activeWhiteboards.get(whiteboardId);
          
          if (activeUsers.has(user.id)) {
            const userData = activeUsers.get(user.id);
            userData.lastActive = new Date();
            activeUsers.set(user.id, userData);
          }
        }
        
        // Broadcast to other users
        socket.to(`whiteboard:${whiteboardId}`).emit('element-updated', {
          element,
          userId: user.id,
          userName: user.name
        });
        
        // Save to database (async, don't wait)
        whiteboardService.createOrUpdateElement({
          whiteboardId,
          elementId: element.id,
          type: element.type,
          properties: element.properties,
          zIndex: element.zIndex,
          createdBy: user.id,
          updatedBy: user.id
        }).catch(err => {
          logger.error(`Error saving element: ${err.message}`);
        });
      } catch (error) {
        logger.error(`Error updating element: ${error.message}`);
        socket.emit('error', { message: 'Failed to update element' });
      }
    });
    
    // Element deletion
    socket.on('element-delete', async (data) => {
      try {
        const { whiteboardId, elementId } = data;
        
        // Validate data
        if (!elementId) {
          return socket.emit('error', { message: 'Element ID is required' });
        }
        
        // Update active timestamp
        if (activeWhiteboards.has(whiteboardId)) {
          const activeUsers = activeWhiteboards.get(whiteboardId);
          
          if (activeUsers.has(user.id)) {
            const userData = activeUsers.get(user.id);
            userData.lastActive = new Date();
            activeUsers.set(user.id, userData);
          }
        }
        
        // Broadcast to other users
        socket.to(`whiteboard:${whiteboardId}`).emit('element-deleted', {
          elementId,
          userId: user.id,
          userName: user.name
        });
        
        // Delete from database (async, don't wait)
        whiteboardService.deleteElement(whiteboardId, elementId, user.id).catch(err => {
          logger.error(`Error deleting element: ${err.message}`);
        });
      } catch (error) {
        logger.error(`Error deleting element: ${error.message}`);
        socket.emit('error', { message: 'Failed to delete element' });
      }
    });
    
    // Cursor position
    socket.on('cursor-position', (data) => {
      try {
        const { whiteboardId, position } = data;
        
        // Update cursor position
        if (activeWhiteboards.has(whiteboardId)) {
          const activeUsers = activeWhiteboards.get(whiteboardId);
          
          if (activeUsers.has(user.id)) {
            const userData = activeUsers.get(user.id);
            userData.cursor = position;
            userData.lastActive = new Date();
            activeUsers.set(user.id, userData);
            
            // Broadcast to other users
            socket.to(`whiteboard:${whiteboardId}`).emit('cursor-position', {
              userId: user.id,
              userName: user.name,
              position
            });
          }
        }
      } catch (error) {
        logger.error(`Error updating cursor position: ${error.message}`);
      }
    });
    
    // Selection
    socket.on('element-select', (data) => {
      try {
        const { whiteboardId, elementId } = data;
        
        // Broadcast to other users
        socket.to(`whiteboard:${whiteboardId}`).emit('element-selected', {
          elementId,
          userId: user.id,
          userName: user.name
        });
      } catch (error) {
        logger.error(`Error broadcasting selection: ${error.message}`);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${user.name} (${user.id})`);
      
      // Remove user from all active whiteboards
      for (const [whiteboardId, activeUsers] of activeWhiteboards.entries()) {
        if (activeUsers.has(user.id)) {
          activeUsers.delete(user.id);
          
          // If no users left, remove whiteboard
          if (activeUsers.size === 0) {
            activeWhiteboards.delete(whiteboardId);
          } else {
            // Notify other users
            const activeUsersList = Array.from(activeUsers.values());
            
            whiteboardNamespace.to(`whiteboard:${whiteboardId}`).emit('user-left', {
              userId: user.id,
              userName: user.name,
              activeUsers: activeUsersList
            });
          }
        }
      }
    });
  });

  // Log when server starts
  logger.info('Socket.IO server initialized');

  return io;
}

module.exports = {
  initializeSocketServer
};