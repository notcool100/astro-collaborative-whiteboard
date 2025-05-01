/**
 * Authentication controller
 * 
 * This file handles user authentication operations.
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');
const { ApiError } = require('../middleware/errorHandler');
const redisClient = require('../config/redis').getClient;
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '24h' }
  );
};

// Register a new user
const register = async (req, res, next) => {
  try {
    const { email, password, name, avatar } = req.body;
    
    // Check if user already exists
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }
    
    // Create new user
    const user = await userService.createUser({
      email,
      password,
      name,
      avatar
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    // Return user data and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }
    
    // Check password
    const isPasswordValid = await userService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }
    
    // Update last active timestamp
    await userService.updateLastActive(user.id);
    
    // Generate token
    const token = generateToken(user.id);
    
    // Return user data and token
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
const logout = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ message: 'Logged out successfully' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get token expiration time
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(200).json({ message: 'Logged out successfully' });
    }
    
    // Calculate time until token expiration
    const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    // Add token to blacklist in Redis
    if (expirationTime > 0) {
      await redisClient().set(
        `blacklist:${token}`,
        'true',
        { EX: expirationTime }
      );
    }
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Get current user
const getCurrentUser = async (req, res, next) => {
  try {
    // User is attached to request by authenticateJWT middleware
    const user = req.user;
    
    res.status(200).json({
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        preferences: user.preferences,
        lastActive: user.last_active
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, preferences } = req.body;
    const userId = req.user.id;
    
    // Update user
    const user = await userService.updateUser(userId, {
      name,
      avatar,
      preferences
    });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Find user
    const user = await userService.findUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Verify current password
    const isPasswordValid = await userService.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    
    // Update password
    await userService.updatePassword(userId, newPassword);
    
    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword
};