import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Booking from '../models/Booking.model.js';
import Notification from '../models/Notification.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendEmail } from '../config/email.js';

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard stats
 * @access  Private (Admin)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalVendors,
    pendingVendors,
    approvedVendors,
    totalBookings,
    pendingBookings,
    recentUsers,
    recentBookings,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Vendor.countDocuments(),
    Vendor.countDocuments({ verificationStatus: 'pending' }),
    Vendor.countDocuments({ verificationStatus: 'approved' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
    Booking.find().sort({ createdAt: -1 }).limit(5)
      .populate('user', 'name')
      .populate('vendor', 'businessName')
      .select('eventType eventDate status createdAt')
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalVendors,
        pendingVendors,
        approvedVendors,
        totalBookings,
        pendingBookings,
      },
      recentUsers,
      recentBookings,
    },
  });
});

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (paginated)
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    // Escape special regex characters to prevent ReDoS attacks
    const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select('-password -refreshToken').lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * @route   GET /api/v1/admin/vendors
 * @desc    Get all vendors (admin view with all statuses)
 * @access  Private (Admin)
 */
export const getAllVendors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .populate('user', 'name email phone createdAt isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      vendors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * @route   PATCH /api/v1/admin/vendors/:id/verify
 * @desc    Approve a vendor
 * @access  Private (Admin)
 */
export const verifyVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('user', 'name email');

  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  vendor.verificationStatus = 'approved';
  vendor.verifiedAt = new Date();
  vendor.rejectionReason = '';
  await vendor.save({ validateBeforeSave: false });

  // Notify vendor
  await Notification.create({
    recipient: vendor.user._id,
    type: 'vendor_verified',
    title: 'Profile Verified!',
    message: 'Congratulations! Your vendor profile has been verified. You are now visible to customers.',
    relatedModel: 'Vendor',
    relatedId: vendor._id,
    channels: { inApp: true, email: true },
  });

  await sendEmail({
    to: vendor.user.email,
    subject: 'VidAI - Your Vendor Profile is Verified!',
    text: `Congratulations ${vendor.user.name}! Your vendor profile "${vendor.businessName}" has been verified. Customers can now find you on VidAI.`,
  });

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'verify_vendor',
    resourceType: 'Vendor',
    resourceId: vendor._id,
    details: `Admin verified vendor: ${vendor.businessName}`,
  });

  res.status(200).json({
    success: true,
    message: 'Vendor verified successfully.',
    data: { vendor },
  });
});

/**
 * @route   PATCH /api/v1/admin/vendors/:id/reject
 * @desc    Reject a vendor
 * @access  Private (Admin)
 */
export const rejectVendor = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const vendor = await Vendor.findById(req.params.id).populate('user', 'name email');

  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  vendor.verificationStatus = 'rejected';
  vendor.rejectionReason = reason || 'Did not meet verification criteria.';
  await vendor.save({ validateBeforeSave: false });

  // Notify vendor
  await Notification.create({
    recipient: vendor.user._id,
    type: 'vendor_rejected',
    title: 'Profile Verification Declined',
    message: `Your vendor profile was not approved. Reason: ${vendor.rejectionReason}`,
    relatedModel: 'Vendor',
    relatedId: vendor._id,
    channels: { inApp: true, email: true },
  });

  await sendEmail({
    to: vendor.user.email,
    subject: 'VidAI - Vendor Verification Update',
    text: `Your vendor profile "${vendor.businessName}" was not approved. Reason: ${vendor.rejectionReason}. Please update your profile and resubmit.`,
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'reject_vendor',
    resourceType: 'Vendor',
    resourceId: vendor._id,
    details: `Admin rejected vendor: ${vendor.businessName}. Reason: ${vendor.rejectionReason}`,
  });

  res.status(200).json({
    success: true,
    message: 'Vendor rejected.',
    data: { vendor },
  });
});

/**
 * @route   PATCH /api/v1/admin/users/:id/toggle-status
 * @desc    Activate/deactivate a user account
 * @access  Private (Admin)
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    const error = new Error('Cannot deactivate your own account.');
    error.statusCode = 400;
    throw error;
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  await ActivityLog.create({
    user: req.user._id,
    action: user.isActive ? 'activate_user' : 'deactivate_user',
    resourceType: 'User',
    resourceId: user._id,
    details: `Admin ${user.isActive ? 'activated' : 'deactivated'} user: ${user.email}`,
  });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
    data: { user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive } },
  });
});

/**
 * @route   GET /api/v1/admin/activity-logs
 * @desc    Get system activity logs
 * @access  Private (Admin)
 */
export const getActivityLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const dateTo = new Date(req.query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = dateTo;
    }
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * @route   GET /api/v1/admin/bookings
 * @desc    Get all bookings (admin view, paginated + filterable)
 * @access  Private (Admin)
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.search) {
    const esc = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter['$or'] = [
      { eventType: { $regex: esc, $options: 'i' } },
      { eventLocation: { $regex: esc, $options: 'i' } },
      { packageName: { $regex: esc, $options: 'i' } },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('user', 'name email')
      .populate('vendor', 'businessName category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * @route   GET /api/v1/admin/system-health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  const dbStatus = await import('mongoose').then((m) =>
    m.default.connection.readyState === 1 ? 'connected' : 'disconnected'
  );

  // Check AI service health
  let aiStatus = 'unknown';
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiResponse = await fetch(`${aiUrl}/health`, { signal: AbortSignal.timeout(3000) });
    aiStatus = aiResponse.ok ? 'healthy' : 'unhealthy';
  } catch {
    aiStatus = 'unavailable';
  }

  res.status(200).json({
    success: true,
    data: {
      server: 'running',
      database: dbStatus,
      aiService: aiStatus,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
  });
});
