/**
 * Authentication routes
 * 
 * This file defines the routes for authentication operations.
 */

const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getCurrentUser, 
  updateProfile, 
  changePassword 
} = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', register);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Public
 */
router.post('/logout', logout);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticateJWT, getCurrentUser);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticateJWT, updateProfile);

/**
 * @route PUT /api/auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', authenticateJWT, changePassword);

module.exports = router;