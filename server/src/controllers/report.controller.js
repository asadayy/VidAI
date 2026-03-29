import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/error.middleware.js';
import Report from '../models/Report.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import Review from '../models/Review.model.js';
import Booking from '../models/Booking.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import Notification from '../models/Notification.model.js';
import { sendEmail } from '../config/email.js';

const ALLOWED_TARGETS_BY_ROLE = {
  user: ['vendor', 'portfolio_item'],
  vendor: ['customer', 'review', 'portfolio_comment'],
};

const ALLOWED_ADMIN_ACTIONS = [
  'none',
  'warn_vendor',
  'warn_user',
  'deactivate_vendor',
  'deactivate_user',
  'hide_review',
  'remove_portfolio_item',
  'remove_portfolio_comment',
];

const ALLOWED_REASON_CATEGORIES = [
  'fraud_or_scam',
  'inappropriate_content',
  'fake_or_misleading',
  'harassment_or_abuse',
  'copyright_or_ip',
  'spam',
  'other',
];

const asObjectId = (value, fieldName) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${fieldName} is invalid.`);
    error.statusCode = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(value);
};

const getVendorForReporter = async (reporterUserId) => {
  return Vendor.findOne({ user: reporterUserId }).select('_id businessName portfolio');
};

const ensureReportTypeAllowed = (role, targetType) => {
  const allowed = ALLOWED_TARGETS_BY_ROLE[role] || [];
  if (!allowed.includes(targetType)) {
    const error = new Error(`Role '${role}' cannot report target type '${targetType}'.`);
    error.statusCode = 403;
    throw error;
  }
};

/**
 * @route   POST /api/v1/reports
 * @desc    Submit a report (user/vendor)
 * @access  Private (user or vendor)
 */
export const createReport = asyncHandler(async (req, res) => {
  const reporterRole = req.user.role;
  const {
    targetType,
    reasonCategory = 'other',
    reason,
    description = '',
    targetVendorId,
    targetUserId,
    targetReviewId,
    targetBookingId,
    portfolioItemId,
    portfolioCommentId,
  } = req.body;

  if (!reason || !String(reason).trim()) {
    const error = new Error('Reason is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!targetType) {
    const error = new Error('targetType is required.');
    error.statusCode = 400;
    throw error;
  }

  ensureReportTypeAllowed(reporterRole, targetType);

  if (!ALLOWED_REASON_CATEGORIES.includes(reasonCategory)) {
    const error = new Error('Invalid reason category.');
    error.statusCode = 400;
    throw error;
  }

  const reportPayload = {
    reporter: req.user._id,
    reporterRole,
    targetType,
    reasonCategory,
    reason: String(reason).trim(),
    description: String(description || '').trim(),
  };

  if (reporterRole === 'user') {
    // User can report vendor or specific portfolio item.
    const vendorId = asObjectId(targetVendorId, 'targetVendorId');
    const vendor = await Vendor.findById(vendorId).select('_id portfolio businessName user');

    if (!vendor) {
      const error = new Error('Vendor not found.');
      error.statusCode = 404;
      throw error;
    }

    reportPayload.targetVendor = vendor._id;

    if (targetType === 'portfolio_item') {
      const pItemId = asObjectId(portfolioItemId, 'portfolioItemId');
      const itemExists = vendor.portfolio.some((item) => item._id.toString() === pItemId.toString());
      if (!itemExists) {
        const error = new Error('Portfolio item not found for this vendor.');
        error.statusCode = 404;
        throw error;
      }
      reportPayload.portfolioItemId = pItemId;
    }
  }

  if (reporterRole === 'vendor') {
    const myVendor = await getVendorForReporter(req.user._id);
    if (!myVendor) {
      const error = new Error('Vendor profile not found.');
      error.statusCode = 404;
      throw error;
    }

    if (targetType === 'customer') {
      const customerUserId = asObjectId(targetUserId, 'targetUserId');

      // Must have at least one booking relationship for this vendor/customer.
      const bookingFilter = { vendor: myVendor._id, user: customerUserId };
      if (targetBookingId) {
        bookingFilter._id = asObjectId(targetBookingId, 'targetBookingId');
      }

      const relatedBooking = await Booking.findOne(bookingFilter).select('_id');
      if (!relatedBooking) {
        const error = new Error('No matching booking found with this customer.');
        error.statusCode = 403;
        throw error;
      }

      const customer = await User.findById(customerUserId).select('_id role');
      if (!customer || customer.role !== 'user') {
        const error = new Error('Customer not found.');
        error.statusCode = 404;
        throw error;
      }

      reportPayload.targetVendor = myVendor._id;
      reportPayload.targetUser = customer._id;
      reportPayload.targetBooking = relatedBooking._id;
    }

    if (targetType === 'review') {
      const reviewId = asObjectId(targetReviewId, 'targetReviewId');
      const review = await Review.findById(reviewId).select('_id vendor user');

      if (!review) {
        const error = new Error('Review not found.');
        error.statusCode = 404;
        throw error;
      }

      if (review.vendor.toString() !== myVendor._id.toString()) {
        const error = new Error('You can only report reviews on your own vendor profile.');
        error.statusCode = 403;
        throw error;
      }

      reportPayload.targetVendor = myVendor._id;
      reportPayload.targetReview = review._id;
      reportPayload.targetUser = review.user;
    }

    if (targetType === 'portfolio_comment') {
      const pItemId = asObjectId(portfolioItemId, 'portfolioItemId');
      const pCommentId = asObjectId(portfolioCommentId, 'portfolioCommentId');

      const item = myVendor.portfolio.find((i) => i._id.toString() === pItemId.toString());
      if (!item) {
        const error = new Error('Portfolio item not found.');
        error.statusCode = 404;
        throw error;
      }

      const comment = item.comments.find((c) => c._id.toString() === pCommentId.toString());
      if (!comment) {
        const error = new Error('Portfolio comment not found.');
        error.statusCode = 404;
        throw error;
      }

      reportPayload.portfolioItemId = pItemId;
      reportPayload.portfolioCommentId = pCommentId;
      reportPayload.targetVendor = myVendor._id;
      reportPayload.targetUser = comment.user;
    }
  }

  const report = await Report.create(reportPayload);

  await ActivityLog.create({
    user: req.user._id,
    action: 'create_report',
    resourceType: 'Report',
    resourceId: report._id,
    details: `${reporterRole} submitted report (${targetType})`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || '',
  });

  const populatedReport = await Report.findById(report._id)
    .populate('reporter', 'name email role')
    .populate('targetVendor', 'businessName')
    .populate('targetUser', 'name email')
    .populate('targetReview', 'rating title comment')
    .lean();

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully.',
    data: { report: populatedReport },
  });
});

const formatReasonCategory = (category) => {
  if (!category) return 'General';
  return category.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const notifyReportedParties = async (report, finalStatus) => {
  if (!['resolved', 'rejected'].includes(finalStatus)) return;

  const recipients = [];

  if (report.targetVendor?.user) {
    recipients.push({
      userId: report.targetVendor.user,
      email: report.targetVendor.userEmail || '',
      name: report.targetVendor.businessName || 'Vendor',
      audience: 'vendor',
      relatedModel: 'Vendor',
      relatedId: report.targetVendor._id,
    });
  }

  if (report.targetUser) {
    recipients.push({
      userId: report.targetUser._id,
      email: report.targetUser.email || '',
      name: report.targetUser.name || 'User',
      audience: 'user',
      relatedModel: 'User',
      relatedId: report.targetUser._id,
    });
  }

  const uniqueRecipients = recipients.filter(
    (rec, index, arr) => arr.findIndex((x) => x.userId.toString() === rec.userId.toString()) === index
  );

  for (const recipient of uniqueRecipients) {
    const statusLabel = finalStatus === 'resolved' ? 'resolved' : 'closed';
    const title = `Report ${statusLabel}`;
    const reasonCategoryText = formatReasonCategory(report.reasonCategory);
    const message = `A report concerning your account/content has been ${statusLabel}. Category: ${reasonCategoryText}.`;

    await Notification.create({
      recipient: recipient.userId,
      type: 'system_alert',
      title,
      message,
      relatedModel: recipient.relatedModel,
      relatedId: recipient.relatedId,
      channels: { inApp: true, email: true },
    });

    if (recipient.email) {
      await sendEmail({
        to: recipient.email,
        subject: `VidAI - Report ${statusLabel}`,
        text: `${message}\n\nReason provided in report: ${report.reason}`,
      }).catch(() => null);
    }
  }
};

/**
 * @route   GET /api/v1/admin/reports
 * @desc    List system reports for admin
 * @access  Private (Admin)
 */
export const getAllReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetType) filter.targetType = req.query.targetType;
  if (req.query.reporterRole) filter.reporterRole = req.query.reporterRole;

  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const dateTo = new Date(req.query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = dateTo;
    }
  }

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'name email role')
      .populate('targetVendor', 'businessName category verificationStatus isActive')
      .populate('targetUser', 'name email role isActive')
      .populate('targetReview', 'rating title comment isApproved createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * @route   GET /api/v1/admin/reports/:id
 * @desc    Get report details for admin
 * @access  Private (Admin)
 */
export const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporter', 'name email role')
    .populate('targetVendor', 'businessName category verificationStatus isActive portfolio')
    .populate('targetUser', 'name email role isActive')
    .populate('targetReview', 'rating title comment isApproved createdAt user vendor')
    .populate('targetBooking', 'eventType eventDate status')
    .populate('resolvedBy', 'name email')
    .lean();

  if (!report) {
    const error = new Error('Report not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { report },
  });
});

const applyAdminAction = async (report, actionType) => {
  if (!actionType || actionType === 'none') return;

  if (actionType === 'deactivate_vendor' && report.targetVendor) {
    await Vendor.findByIdAndUpdate(report.targetVendor, { isActive: false }, { new: false });
    return;
  }

  if (actionType === 'deactivate_user' && report.targetUser) {
    await User.findByIdAndUpdate(report.targetUser, { isActive: false }, { new: false });
    return;
  }

  if (actionType === 'hide_review' && report.targetReview) {
    const review = await Review.findByIdAndUpdate(
      report.targetReview,
      { isApproved: false },
      { new: true }
    );

    if (review) {
      await Review.calcAverageRatings(review.vendor);
    }
    return;
  }

  if (
    actionType === 'remove_portfolio_item' &&
    report.targetVendor &&
    report.portfolioItemId
  ) {
    await Vendor.findByIdAndUpdate(
      report.targetVendor,
      { $pull: { portfolio: { _id: report.portfolioItemId } } },
      { new: false }
    );
  }
};

/**
 * @route   PATCH /api/v1/admin/reports/:id
 * @desc    Update report status and optionally take moderation action
 * @access  Private (Admin)
 */
export const updateReport = asyncHandler(async (req, res) => {
  const { status, adminNotes = '', adminActionType = 'none' } = req.body;

  if (status && !['pending', 'in_review', 'resolved', 'rejected'].includes(status)) {
    const error = new Error('Invalid status value.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_ADMIN_ACTIONS.includes(adminActionType)) {
    const error = new Error('Invalid admin action type.');
    error.statusCode = 400;
    throw error;
  }

  const report = await Report.findById(req.params.id);

  if (!report) {
    const error = new Error('Report not found.');
    error.statusCode = 404;
    throw error;
  }

  const previousStatus = report.status;

  if (status) report.status = status;
  report.adminNotes = String(adminNotes || '').trim();
  report.adminActionType = adminActionType;

  if (report.status === 'resolved' || report.status === 'rejected') {
    report.resolvedAt = new Date();
    report.resolvedBy = req.admin?._id || null;
  } else {
    report.resolvedAt = null;
    report.resolvedBy = null;
  }

  await applyAdminAction(report, adminActionType);
  await report.save();

  const reportWithTargets = await Report.findById(report._id)
    .populate('targetVendor', 'businessName user')
    .populate('targetUser', 'name email')
    .lean();

  if (reportWithTargets?.targetVendor?.user) {
    const vendorUser = await User.findById(reportWithTargets.targetVendor.user)
      .select('email')
      .lean();
    reportWithTargets.targetVendor.userEmail = vendorUser?.email || '';
  }

  if (previousStatus !== report.status && ['resolved', 'rejected'].includes(report.status)) {
    await notifyReportedParties(reportWithTargets, report.status);
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'admin_update_report',
    resourceType: 'Report',
    resourceId: report._id,
    details: `Admin updated report status to '${report.status}' with action '${adminActionType}'`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || '',
  });

  const updated = await Report.findById(report._id)
    .populate('reporter', 'name email role')
    .populate('targetVendor', 'businessName category verificationStatus isActive')
    .populate('targetUser', 'name email role isActive')
    .populate('targetReview', 'rating title comment isApproved createdAt')
    .populate('resolvedBy', 'name email')
    .lean();

  res.status(200).json({
    success: true,
    message: 'Report updated successfully.',
    data: { report: updated },
  });
});

/**
 * @route   PATCH /api/v1/admin/reports/bulk
 * @desc    Bulk update reports status/action
 * @access  Private (Admin)
 */
export const bulkUpdateReports = asyncHandler(async (req, res) => {
  const { reportIds, status, adminActionType = 'none', adminNotes = '' } = req.body;

  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    const error = new Error('reportIds must be a non-empty array.');
    error.statusCode = 400;
    throw error;
  }

  if (reportIds.length > 200) {
    const error = new Error('Cannot update more than 200 reports at once.');
    error.statusCode = 400;
    throw error;
  }

  if (status && !['pending', 'in_review', 'resolved', 'rejected'].includes(status)) {
    const error = new Error('Invalid status value.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_ADMIN_ACTIONS.includes(adminActionType)) {
    const error = new Error('Invalid admin action type.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedIds = [...new Set(reportIds)].map((id) => asObjectId(id, 'reportId'));
  const reports = await Report.find({ _id: { $in: normalizedIds } });

  if (reports.length !== normalizedIds.length) {
    const error = new Error('One or more reports were not found.');
    error.statusCode = 404;
    throw error;
  }

  const logEntries = [];

  for (const report of reports) {
    const previousStatus = report.status;

    if (status) report.status = status;
    report.adminNotes = String(adminNotes || '').trim();
    report.adminActionType = adminActionType;

    if (report.status === 'resolved' || report.status === 'rejected') {
      report.resolvedAt = new Date();
      report.resolvedBy = req.admin?._id || null;
    } else {
      report.resolvedAt = null;
      report.resolvedBy = null;
    }

    await applyAdminAction(report, adminActionType);
    await report.save();

    const reportWithTargets = await Report.findById(report._id)
      .populate('targetVendor', 'businessName user')
      .populate('targetUser', 'name email')
      .lean();

    if (reportWithTargets?.targetVendor?.user) {
      const vendorUser = await User.findById(reportWithTargets.targetVendor.user)
        .select('email')
        .lean();
      reportWithTargets.targetVendor.userEmail = vendorUser?.email || '';
    }

    if (previousStatus !== report.status && ['resolved', 'rejected'].includes(report.status)) {
      await notifyReportedParties(reportWithTargets, report.status);
    }

    logEntries.push({
      user: req.user._id,
      action: 'admin_update_report',
      resourceType: 'Report',
      resourceId: report._id,
      details: `Admin bulk-updated report to '${report.status}' with action '${adminActionType}'`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });
  }

  if (logEntries.length > 0) {
    await ActivityLog.insertMany(logEntries);
  }

  res.status(200).json({
    success: true,
    message: `Bulk update applied to ${reports.length} report(s).`,
    data: {
      updatedCount: reports.length,
      status: status || null,
      adminActionType,
    },
  });
});
