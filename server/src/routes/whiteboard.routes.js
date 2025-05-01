/**
 * Whiteboard routes
 * 
 * This file defines the routes for whiteboard operations.
 */

const express = require('express');
const { 
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
} = require('../controllers/whiteboard.controller');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all whiteboard routes
router.use(authenticateJWT);

/**
 * @route GET /api/workspaces/:workspaceId/whiteboards
 * @desc Get all whiteboards for a workspace
 * @access Private
 */
router.get('/workspaces/:workspaceId/whiteboards', getWorkspaceWhiteboards);

/**
 * @route POST /api/workspaces/:workspaceId/whiteboards
 * @desc Create a new whiteboard
 * @access Private
 */
router.post('/workspaces/:workspaceId/whiteboards', createWhiteboard);

/**
 * @route GET /api/whiteboards/:id
 * @desc Get whiteboard by ID
 * @access Private
 */
router.get('/:id', getWhiteboardById);

/**
 * @route PUT /api/whiteboards/:id
 * @desc Update whiteboard
 * @access Private
 */
router.put('/:id', updateWhiteboard);

/**
 * @route DELETE /api/whiteboards/:id
 * @desc Delete whiteboard
 * @access Private
 */
router.delete('/:id', deleteWhiteboard);

/**
 * @route POST /api/whiteboards/:id/versions
 * @desc Create a new whiteboard version
 * @access Private
 */
router.post('/:id/versions', createWhiteboardVersion);

/**
 * @route GET /api/whiteboards/:id/versions
 * @desc Get whiteboard versions
 * @access Private
 */
router.get('/:id/versions', getWhiteboardVersions);

/**
 * @route GET /api/whiteboards/:id/versions/:versionId
 * @desc Get specific whiteboard version
 * @access Private
 */
router.get('/:id/versions/:versionId', getWhiteboardVersion);

/**
 * @route POST /api/whiteboards/:id/elements
 * @desc Create or update whiteboard element
 * @access Private
 */
router.post('/:id/elements', createOrUpdateElement);

/**
 * @route DELETE /api/whiteboards/:id/elements/:elementId
 * @desc Delete whiteboard element
 * @access Private
 */
router.delete('/:id/elements/:elementId', deleteElement);

/**
 * @route GET /api/whiteboards/:id/elements
 * @desc Get whiteboard elements
 * @access Private
 */
router.get('/:id/elements', getWhiteboardElements);

/**
 * @route GET /api/whiteboards/:id/export
 * @desc Export whiteboard
 * @access Private
 */
router.get('/:id/export', exportWhiteboard);

module.exports = router;