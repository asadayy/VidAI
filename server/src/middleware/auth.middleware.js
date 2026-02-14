import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { asyncHandler } from './error.middleware.js';

/**
 * Protect routes - Verify JWT token
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const error = new Error('Not authorized. No token provided.');
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      const error = new Error('User belonging to this token no longer exists.');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Your account has been deactivated. Contact admin.');
      error.statusCode = 403;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw error; // Will be caught by errorHandler
    }
    throw error;
  }
});

/**
 * Role-Based Access Control (RBAC)
 * Restrict route to specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Not authorized.');
      error.statusCode = 401;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error(
        `Role '${req.user.role}' is not authorized to access this resource.`
      );
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};
