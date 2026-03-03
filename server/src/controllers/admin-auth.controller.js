import Admin from '../models/Admin.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * @route   POST /api/v1/admin/auth/login
 * @desc    Login admin — separate from user/vendor auth
 * @access  Public
 */
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error('Please provide email and password.');
    error.statusCode = 400;
    throw error;
  }

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) {
    const error = new Error('Invalid admin credentials.');
    error.statusCode = 401;
    throw error;
  }

  if (!admin.isActive) {
    const error = new Error('Admin account is deactivated.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid admin credentials.');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = admin.generateAccessToken();

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Admin login successful.',
    data: {
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
      },
      accessToken,
    },
  });
});

/**
 * @route   GET /api/v1/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (Admin)
 */
export const getAdminMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: 'admin',
      },
    },
  });
});
