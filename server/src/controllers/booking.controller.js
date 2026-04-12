import Booking from '../models/Booking.model.js';
import Vendor from '../models/Vendor.model.js';
import Notification from '../models/Notification.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import Budget from '../models/Budget.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendEmail } from '../config/email.js';

/**
 * Auto-transition approved bookings whose event date has passed:
 *  • paid   → completed
 *  • unpaid/partial → expired
 * Called before listing bookings so users always see up-to-date statuses.
 */
const autoTransitionBookings = async (filter) => {
  const now = new Date();
  // Mark paid bookings as completed
  await Booking.updateMany(
    { ...filter, status: 'approved', paymentStatus: 'paid', eventDate: { $lt: now } },
    { $set: { status: 'completed' } }
  );
  // Mark unpaid/partial bookings as expired
  await Booking.updateMany(
    { ...filter, status: 'approved', paymentStatus: { $in: ['unpaid', 'partial'] }, eventDate: { $lt: now } },
    { $set: { status: 'expired' } }
  );
};

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a new booking request
 * @access  Private (User only)
 */
export const createBooking = asyncHandler(async (req, res) => {
  const {
    vendorId, packageId, eventType, eventDate, eventEndDate,
    eventLocation, guestCount, notes, timeSlot, numberOfPeople,
    venueType, eventTime,
  } = req.body;

  // Verify vendor exists and is approved
  const vendor = await Vendor.findById(vendorId).populate('user', 'email name');
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  if (vendor.verificationStatus !== 'approved') {
    const error = new Error('This vendor is not yet verified.');
    error.statusCode = 400;
    throw error;
  }

  // Category-specific required-field validation
  const category = vendor.category;
  const fieldErrors = [];

  if (['venue', 'caterer'].includes(category)) {
    if (!guestCount && guestCount !== 0) fieldErrors.push('Guest count is required.');
    if (!timeSlot) fieldErrors.push('Time slot (morning/evening) is required.');
  }

  if (['makeup_artist', 'mehndi_artist'].includes(category)) {
    if (!numberOfPeople || numberOfPeople < 1) fieldErrors.push('Number of people is required.');
    if (!eventTime) fieldErrors.push('Event time is required.');
  }

  if (category === 'photographer') {
    if (!timeSlot) fieldErrors.push('Time slot (morning/evening) is required.');
  }

  if (category === 'decorator') {
    if (!venueType) fieldErrors.push('Venue type is required.');
    if (!eventLocation) fieldErrors.push('Venue address is required.');
  }

  if (fieldErrors.length > 0) {
    const error = new Error(fieldErrors.join(' '));
    error.statusCode = 400;
    throw error;
  }

  // Check for booking conflicts (same vendor, overlapping dates)
  const eventStart = new Date(eventDate);
  eventStart.setHours(0, 0, 0, 0);
  const eventEnd = new Date(eventDate);
  eventEnd.setHours(23, 59, 59, 999);

  const conflictQuery = {
    vendor: vendorId,
    eventDate: {
      $gte: eventStart,
      $lte: eventEnd,
    },
    status: { $in: ['pending', 'approved'] },
  };

  // For categories with timeSlot, only conflict within the same slot
  if (timeSlot && ['venue', 'caterer', 'photographer'].includes(category)) {
    conflictQuery.timeSlot = timeSlot;
  }

  // Makeup/mehndi artists can serve multiple clients per day — skip conflict check
  if (!['makeup_artist', 'mehndi_artist'].includes(category)) {
    const conflictingBooking = await Booking.findOne(conflictQuery);
    if (conflictingBooking) {
      const error = new Error('This vendor already has a booking on the selected date.');
      error.statusCode = 409;
      throw error;
    }
  }

  // Find package details if packageId provided
  let packageName = '';
  let agreedPrice = 0;
  if (packageId && vendor.packages) {
    const pkg = vendor.packages.id(packageId);
    if (pkg) {
      packageName = pkg.name;
      agreedPrice = pkg.price;

      // Makeup/mehndi: price × number of people
      if (['makeup_artist', 'mehndi_artist'].includes(category) && numberOfPeople > 1) {
        agreedPrice = pkg.price * numberOfPeople;
      }
    }
  }

  const booking = await Booking.create({
    user: req.user._id,
    vendor: vendorId,
    packageId,
    packageName,
    eventType,
    eventDate,
    eventEndDate,
    eventLocation,
    guestCount,
    notes,
    agreedPrice,
    timeSlot,
    numberOfPeople,
    venueType,
    eventTime,
  });

  // Notify vendor
  await Notification.create({
    recipient: vendor.user._id,
    type: 'booking_created',
    title: 'New Booking Request',
    message: `You have a new booking request for ${eventType} on ${new Date(eventDate).toLocaleDateString('en-PK')}.`,
    relatedModel: 'Booking',
    relatedId: booking._id,
    channels: { inApp: true, email: true },
  });

  // Send vendor email
  await sendEmail({
    to: vendor.email || vendor.user.email,
    subject: 'VidAI - New Booking Request',
    text: `You have a new booking request for ${eventType} on ${new Date(eventDate).toLocaleDateString('en-PK')}. Log in to your dashboard to respond.`,
  });

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'create_booking',
    resourceType: 'Booking',
    resourceId: booking._id,
    details: `Booking created for vendor ${vendor.businessName}`,
  });

  res.status(201).json({
    success: true,
    message: 'Booking request sent to vendor.',
    data: { booking },
  });
});

/**
 * @route   GET /api/v1/bookings/my-bookings
 * @desc    Get current user's bookings
 * @access  Private (User)
 */
export const getUserBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Auto-transition past-date bookings before querying
  await autoTransitionBookings({ user: req.user._id });

  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate({
        path: 'vendor',
        select: 'businessName category city coverImage',
        populate: { path: 'user', select: 'name avatar' },
      })
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
 * @route   GET /api/v1/bookings/vendor-bookings
 * @desc    Get bookings for current vendor
 * @access  Private (Vendor)
 */
export const getVendorBookings = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // Auto-transition past-date bookings before querying
  await autoTransitionBookings({ vendor: vendor._id });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { vendor: vendor._id };
  if (req.query.status) filter.status = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('user', 'name email phone avatar')
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
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'name email phone avatar')
    .populate({
      path: 'vendor',
      select: 'businessName category city coverImage user',
      populate: { path: 'user', select: 'name email' },
    });

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  // Only allow booking owner, vendor owner, or admin to view
  const isOwner = booking.user._id.toString() === req.user._id.toString();
  const isVendorOwner = booking.vendor.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isVendorOwner && !isAdmin) {
    const error = new Error('Not authorized to view this booking.');
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { booking },
  });
});

/**
 * @route   PATCH /api/v1/bookings/:id/status
 * @desc    Vendor approves or rejects a booking
 * @access  Private (Vendor)
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, message: responseMessage } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    const error = new Error('Status must be "approved" or "rejected".');
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const booking = await Booking.findOne({
    _id: req.params.id,
    vendor: vendor._id,
  }).populate('user', 'name email');

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'pending') {
    const error = new Error(`Cannot change status of a booking that is already ${booking.status}.`);
    error.statusCode = 400;
    throw error;
  }

  // Prevent double booking: ensure vendor doesn't already have an approved booking on the same date
  if (status === 'approved') {
    const eventStart = new Date(booking.eventDate);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = new Date(booking.eventDate);
    eventEnd.setHours(23, 59, 59, 999);

    const conflict = await Booking.findOne({
      vendor: vendor._id,
      _id: { $ne: booking._id },
      eventDate: { $gte: eventStart, $lte: eventEnd },
      status: 'approved',
    });

    if (conflict) {
      const error = new Error('You already have an approved booking on this date. Cannot approve another.');
      error.statusCode = 409;
      throw error;
    }
  }

  booking.status = status;
  booking.vendorResponse = {
    message: responseMessage || '',
    respondedAt: new Date(),
  };
  await booking.save();

  // Update vendor stats
  if (status === 'approved') {
    vendor.totalBookings += 1;
    await vendor.save({ validateBeforeSave: false });

    // Auto-add a budget item for the user when booking is confirmed
    try {
      const userBudget = await Budget.findOne({ user: booking.user._id });
      if (userBudget) {
        const categoryLabel = vendor.category
          ? vendor.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : 'Vendor';
        userBudget.items.push({
          category: categoryLabel,
          notes: `Booked: ${vendor.businessName}`,
          allocatedAmount: booking.agreedPrice || 0,
          spentAmount: booking.agreedPrice || 0,
          vendorId: vendor._id,
          bookingId: booking._id,
        });
        await userBudget.save();
      }
    } catch (budgetErr) {
      // Non-fatal — log but don't block booking approval
      console.error('Budget auto-update failed:', budgetErr.message);
    }
  }

  // Notify user
  const notifType = status === 'approved' ? 'booking_approved' : 'booking_rejected';
  await Notification.create({
    recipient: booking.user._id,
    type: notifType,
    title: `Booking ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: `Your booking with ${vendor.businessName} has been ${status}.${responseMessage ? ' Message: ' + responseMessage : ''}`,
    relatedModel: 'Booking',
    relatedId: booking._id,
    channels: { inApp: true, email: true },
  });

  await sendEmail({
    to: booking.user.email,
    subject: `VidAI - Booking ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    text: `Your booking with ${vendor.businessName} has been ${status}.`,
  });

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: status === 'approved' ? 'accept_booking' : 'reject_booking',
    resourceType: 'Booking',
    resourceId: booking._id,
    details: `Vendor ${vendor.businessName} ${status} booking #${booking._id}`,
  });

  res.status(200).json({
    success: true,
    message: `Booking ${status}.`,
    data: { booking },
  });
});

/**
 * @route   PATCH /api/v1/bookings/:id/cancel
 * @desc    Cancel a booking (by user or vendor)
 * @access  Private
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('vendor', 'user businessName');

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const isUser = booking.user.toString() === req.user._id.toString();
  const isVendor = booking.vendor.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isUser && !isVendor && !isAdmin) {
    const error = new Error('Not authorized to cancel this booking.');
    error.statusCode = 403;
    throw error;
  }

  if (['cancelled', 'completed', 'expired'].includes(booking.status)) {
    const error = new Error(`Cannot cancel a booking that is already ${booking.status}.`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'cancelled';
  booking.cancelledBy = isAdmin ? 'admin' : (isUser ? 'user' : 'vendor');
  booking.cancellationReason = req.body.reason || '';
  booking.cancelledAt = new Date();
  await booking.save();

  // Decrement vendor's totalBookings counter
  await Vendor.findByIdAndUpdate(booking.vendor._id, { $inc: { totalBookings: -1 } });

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'cancel_booking',
    resourceType: 'Booking',
    resourceId: booking._id,
    details: `Booking cancelled by ${booking.cancelledBy}${booking.cancellationReason ? ': ' + booking.cancellationReason : ''}`,
  });

  res.status(200).json({
    success: true,
    message: 'Booking cancelled.',
    data: { booking },
  });
});

/**
 * @route   PATCH /api/v1/bookings/:id/payment
 * @desc    Vendor marks a booking as paid
 * @access  Private (Vendor)
 */
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  if (!['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
    const error = new Error('Payment status must be "unpaid", "partial", or "paid".');
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const booking = await Booking.findOne({
    _id: req.params.id,
    vendor: vendor._id,
  }).populate('user', 'name email');

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'approved') {
    const error = new Error('Can only update payment for approved bookings.');
    error.statusCode = 400;
    throw error;
  }

  const prevStatus = booking.paymentStatus;
  booking.paymentStatus = paymentStatus;
  if (paymentStatus === 'paid') {
    booking.paymentAmount = booking.agreedPrice || 0;
  }
  await booking.save();

  // Notify user when marked as paid
  if (paymentStatus === 'paid' && prevStatus !== 'paid') {
    await Notification.create({
      recipient: booking.user._id,
      type: 'booking_approved',
      title: 'Booking Payment Confirmed',
      message: `Your booking with ${vendor.businessName} has been marked as paid and is now confirmed.`,
      relatedModel: 'Booking',
      relatedId: booking._id,
      channels: { inApp: true, email: true },
    });

    await sendEmail({
      to: booking.user.email,
      subject: 'VidAI - Booking Payment Confirmed',
      text: `Your booking with ${vendor.businessName} has been marked as paid and is now confirmed.`,
    });
  }

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'update_payment_status',
    resourceType: 'Booking',
    resourceId: booking._id,
    details: `Payment status changed from ${prevStatus} to ${paymentStatus} by vendor ${vendor.businessName}`,
  });

  res.status(200).json({
    success: true,
    message: `Payment status updated to ${paymentStatus}.`,
    data: { booking },
  });
});
