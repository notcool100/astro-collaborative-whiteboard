/**
 * Workspace routes
 * 
 * This file defines the routes for workspace operations.
 */

const express = require('express');
const { 
  getUserWorkspaces, 
  createWorkspace, 
  getWorkspaceById, 
  updateWorkspace, 
  deleteWorkspace, 
  addWorkspaceMember, 
  updateMemberRole, 
  removeWorkspaceMember 
} = require('../controllers/workspace.controller');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all workspace routes
router.use(authenticateJWT);

/**
 * @route GET /api/workspaces
 * @desc Get all workspaces for the current user
 * @access Private
 */
router.get('/', getUserWorkspaces);

/**
 * @route POST /api/workspaces
 * @desc Create a new workspace
 * @access Private
 */
router.post('/', createWorkspace);

/**
 * @route GET /api/workspaces/:id
 * @desc Get workspace by ID
 * @access Private
 */
router.get('/:id', getWorkspaceById);

/**
 * @route PUT /api/workspaces/:id
 * @desc Update workspace
 * @access Private
 */
router.put('/:id', updateWorkspace);

/**
 * @route DELETE /api/workspaces/:id
 * @desc Delete workspace
 * @access Private
 */
router.delete('/:id', deleteWorkspace);

/**
 * @route POST /api/workspaces/:id/members
 * @desc Add member to workspace
 * @access Private
 */
router.post('/:id/members', addWorkspaceMember);

/**
 * @route PUT /api/workspaces/:id/members/:memberId
 * @desc Update member role
 * @access Private
 */
router.put('/:id/members/:memberId', updateMemberRole);

/**
 * @route DELETE /api/workspaces/:id/members/:memberId
 * @desc Remove member from workspace
 * @access Private
 */
router.delete('/:id/members/:memberId', removeWorkspaceMember);

module.exports = router;