import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendEmail } from '../config/email.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (user, vendor, or admin)
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  // Ensure admin role cannot be registered via public API (admins must be created manually)
  const safeRole = (role === 'vendor') ? 'vendor' : 'user';

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: safeRole,
    phone,
  });

  // If vendor role, we'll create the vendor profile later via separate endpoint
  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'register',
    resourceType: 'User',
    resourceId: user._id,
    details: `New ${safeRole} registration: ${email}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send welcome email
  await sendEmail({
    to: email,
    subject: 'Welcome to VidAI!',
    text: `Hello ${name}, welcome to VidAI - AI-Powered Wedding Planning Platform!`,
    html: `<h2>Welcome to VidAI!</h2><p>Hello ${name},</p><p>Your account has been created successfully. ${safeRole === 'vendor' ? 'Please complete your vendor profile to get started.' : 'Start planning your dream wedding!'}</p>`,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return JWT tokens
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field included
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check if account is active
  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact admin.');
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Update user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'login',
    resourceType: 'User',
    resourceId: user._id,
    details: `User login: ${email}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // If vendor, check if they have a vendor profile
  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = await Vendor.findOne({ user: user._id }).select('businessName verificationStatus profileCompleteness');
  }

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      vendorProfile,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged-in user
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = await Vendor.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      vendorProfile,
    },
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user - clear refresh token
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset token via email
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists or not (security)
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  // Send email
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'VidAI - Password Reset Request',
    text: `You requested a password reset. Click this link to reset: ${resetUrl}. Valid for 30 minutes.`,
    html: `<h3>Password Reset</h3><p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 30 minutes.</p>`,
  });

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    const error = new Error('Token and new password are required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate new password strength
  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    error.statusCode = 400;
    throw error;
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    const error = new Error('Invalid or expired reset token.');
    error.statusCode = 400;
    throw error;
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
});

/**
 * @route   PUT /api/v1/auth/update-password
 * @desc    Update password while logged in
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    const error = new Error('Current password and new password are required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 401;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  const accessToken = user.generateAccessToken();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
    data: { accessToken },
  });
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    const error = new Error('Refresh token is required.');
    error.statusCode = 400;
    throw error;
  }

  // CRITICAL SECURITY FIX: Verify refresh token cryptographically
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Token expired - clean up database
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: '' });
      const error = new Error('Refresh token has expired. Please log in again.');
      error.statusCode = 401;
      throw error;
    }
    const error = new Error('Invalid refresh token.');
    error.statusCode = 401;
    throw error;
  }

  // Verify token type claim
  if (decoded.type !== 'refresh') {
    const error = new Error('Invalid token type. Access tokens cannot be used for refresh.');
    error.statusCode = 403;
    throw error;
  }

  // Verify token exists in database (for revocation)
  const user = await User.findOne({ _id: decoded.id, refreshToken: token });
  if (!user) {
    const error = new Error('Invalid refresh token.');
    error.statusCode = 401;
    throw error;
  }

  // Generate new access token
  const accessToken = user.generateAccessToken();

  res.status(200).json({
    success: true,
    data: { accessToken },
  });
});
