import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Budget from '../models/Budget.model.js';
import WeddingEvent from '../models/WeddingEvent.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendEmail } from '../config/email.js';
import { logger } from '../config/logger.js';
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
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        city: user.city,
        area: user.area,
        zipCode: user.zipCode,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        onboarding: user.onboarding,
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
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        city: user.city,
        area: user.area,
        zipCode: user.zipCode,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        onboarding: user.onboarding,
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
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        city: user.city,
        area: user.area,
        zipCode: user.zipCode,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        onboarding: user.onboarding,
      },
      vendorProfile,
    },
  });
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user's profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name', 'phone', 'dateOfBirth', 'gender',
    'city', 'area', 'zipCode', 'bio', 'avatar',
  ];

  const allowedOnboardingFields = [
    'eventTypes', 'eventDate', 'weddingLocation',
    'venueType', 'guestCount', 'foodPreference', 'totalBudget',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Handle onboarding sub-fields
  if (req.body.onboarding && typeof req.body.onboarding === 'object') {
    for (const field of allowedOnboardingFields) {
      if (req.body.onboarding[field] !== undefined) {
        updates[`onboarding.${field}`] = req.body.onboarding[field];
      }
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  // Log profile update
  const changedFields = Object.keys(updates).map(k => k.replace('onboarding.', '')).join(', ');
  await ActivityLog.create({
    user: req.user._id,
    action: 'update_profile',
    resourceType: 'User',
    resourceId: req.user._id,
    details: `Profile updated: ${changedFields}`,
  });

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
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        city: user.city,
        area: user.area,
        zipCode: user.zipCode,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        onboarding: user.onboarding,
      },
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

  // Log password reset
  await ActivityLog.create({
    user: user._id,
    action: 'reset_password',
    resourceType: 'User',
    resourceId: user._id,
    details: 'Password reset via email token',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

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

  // Log password change
  await ActivityLog.create({
    user: req.user._id,
    action: 'update_password',
    resourceType: 'User',
    resourceId: req.user._id,
    details: 'Password changed',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

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

/**
 * @route   POST /api/v1/auth/onboarding
 * @desc    Submit user onboarding details
 * @access  Private
 */
export const completeOnboarding = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, phone,
    eventTypes, eventDate, weddingLocation,
    venueType, guestCount, foodPreference,
    totalBudget,
    // legacy fields (still accepted for backward compat)
    lookingFor, budgets
  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  user.onboarding = {
    isComplete: true,
    firstName,
    lastName,
    phone,
    eventTypes,
    eventDate,
    weddingLocation,
    venueType,
    guestCount,
    foodPreference,
    totalBudget: totalBudget || 0,
    lookingFor,
    budgets
  };

  // Update top-level phone if provided and not already set
  if (phone && !user.phone) {
    user.phone = phone;
  }

  // If the user's name is just the email prefix or empty, we can update it
  if (!user.name || user.name === user.email.split('@')[0]) {
    user.name = `${firstName} ${lastName}`.trim();
  }

  // Auto-create or update the Budget record so the Budget Planner shows the amount
  if (totalBudget && Number(totalBudget) > 0) {
    try {
      let budget = await Budget.findOne({ user: user._id });
      if (budget) {
        budget.totalBudget = Number(totalBudget);
        await budget.save();
        logger.info(`Budget updated during onboarding for user ${user._id}: ${totalBudget}`);
      } else {
        budget = await Budget.create({
          user: user._id,
          totalBudget: Number(totalBudget),
          eventType: (eventTypes && eventTypes.length > 0)
            ? eventTypes[0].toLowerCase().replace(/[- ]/g, '_')
            : 'full_wedding',
          items: [],
        });
        logger.info(`Budget created during onboarding for user ${user._id}: ${totalBudget}`);
      }

      // Auto-create WeddingEvent documents when multiple events selected
      if (eventTypes && eventTypes.length > 1) {
        const perEventBudget = Math.floor(Number(totalBudget) / eventTypes.length);
        const budgetEvents = [];

        for (let i = 0; i < eventTypes.length; i++) {
          const evtType = eventTypes[i].toLowerCase().replace(/[- ]/g, '_');
          // Skip if event already exists for this user + type
          const existing = await WeddingEvent.findOne({ user: user._id, eventType: evtType });
          if (!existing) {
            const evt = await WeddingEvent.create({
              user: user._id,
              eventType: evtType,
              eventDate: eventDate || undefined,
              venueType: venueType || undefined,
              guestCount: guestCount || undefined,
              allocatedBudget: perEventBudget,
              sortOrder: i,
            });
            budgetEvents.push({
              weddingEvent: evt._id,
              eventType: evtType,
              allocatedAmount: perEventBudget,
            });
          }
        }

        if (budgetEvents.length > 0) {
          budget.events.push(...budgetEvents);
          await budget.save();
          logger.info(`Created ${budgetEvents.length} WeddingEvent docs for user ${user._id}`);
        }
      }
    } catch (budgetErr) {
      logger.error(`Failed to create/update budget during onboarding: ${budgetErr.message}`);
      // Don't block onboarding completion if budget creation fails
    }
  }

  await user.save();

  // Log onboarding completion
  await ActivityLog.create({
    user: user._id,
    action: 'complete_onboarding',
    resourceType: 'User',
    resourceId: user._id,
    details: `Onboarding completed — events: ${(eventTypes || []).join(', ')}, budget: PKR ${totalBudget || 0}`,
  });

  res.status(200).json({
    success: true,
    message: 'Onboarding completed successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        onboarding: user.onboarding,
      }
    }
  });
});

/**
 * @route   POST /api/v1/auth/push-token
 * @desc    Register a device push notification token
 * @access  Private
 */
export const registerPushToken = asyncHandler(async (req, res) => {
  const { token, platform = 'android' } = req.body;

  if (!token) {
    const error = new Error('Push token is required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.user._id);

  // Remove existing token if it already exists (re-registration)
  user.pushTokens = (user.pushTokens || []).filter((t) => t.token !== token);

  // Add the new token
  user.pushTokens.push({ token, platform });

  // Keep only the latest 5 tokens per user (multiple devices)
  if (user.pushTokens.length > 5) {
    user.pushTokens = user.pushTokens.slice(-5);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Push token registered',
  });
});
