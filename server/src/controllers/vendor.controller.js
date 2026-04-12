import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import Booking from '../models/Booking.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import slugify from 'slugify';
import Review from '../models/Review.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { configureCloudinary } from '../config/cloudinary.js';

const serializePortfolioItem = (item) => {
  if (!item) return null;

  return {
    ...item.toObject(),
    likesCount: item.likes?.length || 0,
    commentsCount: item.comments?.length || 0,
  };
};

/**
 * @route   GET /api/v1/vendors
 * @desc    Get all approved vendors (public listing)
 * @access  Public
 */
export const getVendors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter — only show admin-approved vendors
  const filter = { verificationStatus: 'approved', isActive: true };

  if (req.query.category) filter.category = req.query.category;
  if (req.query.city) filter.city = { $regex: req.query.city, $options: 'i' };
  if (req.query.minPrice) filter.startingPrice = { $gte: parseInt(req.query.minPrice) };
  if (req.query.maxPrice) {
    filter.startingPrice = { ...filter.startingPrice, $lte: parseInt(req.query.maxPrice) };
  }

  // Sort
  let sort = {};
  switch (req.query.sort) {
    case 'price_asc': sort = { startingPrice: 1 }; break;
    case 'price_desc': sort = { startingPrice: -1 }; break;
    case 'rating': sort = { ratingsAverage: -1 }; break;
    case 'newest': sort = { createdAt: -1 }; break;
    default: sort = { ratingsAverage: -1, createdAt: -1 };
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .populate('user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/vendors/search
 * @desc    Full-text search vendors
 * @access  Public
 */
export const searchVendors = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    const error = new Error('Search query must be at least 2 characters.');
    error.statusCode = 400;
    throw error;
  }

  // Build detailed filter for search — only approved vendors
  const textFilter = {
    $text: { $search: q },
    verificationStatus: 'approved',
    isActive: true,
  };

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Add additional filters if present
  if (req.query.category) textFilter.category = req.query.category;
  if (req.query.city) textFilter.city = { $regex: req.query.city, $options: 'i' };
  if (req.query.minPrice) textFilter.startingPrice = { $gte: parseInt(req.query.minPrice) };
  if (req.query.maxPrice) {
    textFilter.startingPrice = { ...textFilter.startingPrice, $lte: parseInt(req.query.maxPrice) };
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(
      textFilter,
      { score: { $meta: 'textScore' } }
    )
      .sort({ ratingsAverage: -1, score: { $meta: 'textScore' } })
      .populate('user', 'name avatar')
      .skip(skip)
      .limit(limit)
      .lean(),
    Vendor.countDocuments(textFilter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      count: vendors.length
    },
  });
});

/**
 * @route   GET /api/v1/vendors/:id
 * @desc    Get vendor by ID
 * @access  Public
 */
export const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('user', 'name email avatar phone')
    .populate('portfolio.comments.user', 'name avatar');

  if (!vendor || (vendor.verificationStatus !== 'approved' && !vendor.isActive)) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  // Increment profile views atomically (prevents race conditions)
  await Vendor.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });

  res.status(200).json({
    success: true,
    data: { vendor },
  });
});

/**
 * @route   GET /api/v1/vendors/slug/:slug
 * @desc    Get vendor by slug (SEO-friendly)
 * @access  Public
 */
export const getVendorBySlug = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ slug: req.params.slug })
    .populate('user', 'name email avatar phone')
    .populate('portfolio.comments.user', 'name avatar');

  if (!vendor || (vendor.verificationStatus !== 'approved' && !vendor.isActive)) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  // Increment profile views atomically (prevents race conditions)
  await Vendor.findOneAndUpdate({ slug: req.params.slug }, { $inc: { profileViews: 1 } });

  res.status(200).json({
    success: true,
    data: { vendor },
  });
});

/**
 * @route   POST /api/v1/vendors/profile
 * @desc    Create vendor profile (after vendor registration)
 * @access  Private (Vendor only)
 */
export const createVendorProfile = asyncHandler(async (req, res) => {
  // Check if vendor profile already exists
  const existingVendor = await Vendor.findOne({ user: req.user._id });
  if (existingVendor) {
    const error = new Error('Vendor profile already exists. Use PUT to update.');
    error.statusCode = 400;
    throw error;
  }

  const {
    businessName, category, description, city, address,
    phone, whatsapp, email, website,
    googleMapLink, socialMedia, personalDetails,
  } = req.body;

  const slug = slugify(businessName, { lower: true, strict: true }) + '-' + Date.now().toString(36);

  const vendor = await Vendor.create({
    user: req.user._id,
    businessName,
    slug,
    category,
    description,
    city,
    address,
    phone: phone || req.user.phone,
    whatsapp,
    email: email || req.user.email,
    website,
    googleMapLink: googleMapLink || '',
    socialMedia: socialMedia || {},
  });

  // Update user record with personal details from onboarding
  const user = await User.findById(req.user._id);
  if (user) {
    if (personalDetails) {
      const fullName = `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim();
      if (fullName && (!user.name || user.name === user.email.split('@')[0])) {
        user.name = fullName;
      }
      if (personalDetails.phone && !user.phone) {
        user.phone = personalDetails.phone;
      }
    }
    // Mark vendor onboarding as complete
    user.onboarding = {
      ...user.onboarding,
      isComplete: true,
      firstName: personalDetails?.firstName || '',
      lastName: personalDetails?.lastName || '',
      phone: personalDetails?.phone || '',
    };
    await user.save({ validateBeforeSave: false });
  }

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'create_vendor_profile',
    resourceType: 'Vendor',
    resourceId: vendor._id,
    details: `Vendor profile created: ${vendor.businessName}`,
  });

  res.status(201).json({
    success: true,
    message: 'Vendor profile created. Pending admin verification.',
    data: { vendor },
  });
});

/**
 * @route   GET /api/v1/vendors/me/profile
 * @desc    Get current vendor's own profile
 * @access  Private (Vendor only)
 */
export const getMyVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id })
    .populate('user', 'name email avatar phone')
    .populate('portfolio.likes', 'name avatar')
    .populate('portfolio.comments.user', 'name avatar');

  if (!vendor) {
    const error = new Error('Vendor profile not found. Please create one first.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { vendor },
  });
});

/**
 * @route   PUT /api/v1/vendors/me/profile
 * @desc    Update vendor profile
 * @access  Private (Vendor only)
 */
export const updateVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    'businessName', 'category', 'description', 'city', 'address',
    'phone', 'whatsapp', 'email', 'website', 'coverImage', 'location',
    'googleMapLink', 'socialMedia',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      vendor[field] = req.body[field];
    }
  });

  // Update slug if business name changed
  if (req.body.businessName) {
    vendor.slug = slugify(req.body.businessName, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }

  await vendor.save();

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'update_vendor_profile',
    resourceType: 'Vendor',
    resourceId: vendor._id,
    details: `Vendor profile updated: ${vendor.businessName}`,
  });

  res.status(200).json({
    success: true,
    message: 'Vendor profile updated.',
    data: { vendor },
  });
});

/**
 * @route   POST /api/v1/vendors/me/packages
 * @desc    Add a service package
 * @access  Private (Vendor only)
 */
export const addPackage = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const { name, description, price, features } = req.body;
  if (!name || price === undefined) {
    const error = new Error('Package name and price are required.');
    error.statusCode = 400;
    throw error;
  }

  vendor.packages.push({ name, description, price, features });
  await vendor.save();

  res.status(201).json({
    success: true,
    message: 'Package added.',
    data: { packages: vendor.packages },
  });
});

/**
 * @route   PUT /api/v1/vendors/me/packages/:packageId
 * @desc    Update a service package
 * @access  Private (Vendor only)
 */
export const updatePackage = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const pkg = vendor.packages.id(req.params.packageId);
  if (!pkg) {
    const error = new Error('Package not found.');
    error.statusCode = 404;
    throw error;
  }

  const { name, description, price, features, isActive } = req.body;
  if (name !== undefined) pkg.name = name;
  if (description !== undefined) pkg.description = description;
  if (price !== undefined) pkg.price = price;
  if (features !== undefined) pkg.features = features;
  if (isActive !== undefined) pkg.isActive = isActive;

  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Package updated.',
    data: { packages: vendor.packages },
  });
});

/**
 * @route   DELETE /api/v1/vendors/me/packages/:packageId
 * @desc    Delete a service package
 * @access  Private (Vendor only)
 */
export const deletePackage = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const pkg = vendor.packages.id(req.params.packageId);
  if (!pkg) {
    const error = new Error('Package not found.');
    error.statusCode = 404;
    throw error;
  }

  pkg.deleteOne();
  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Package deleted.',
    data: { packages: vendor.packages },
  });
});

/**
 * @route   POST /api/v1/vendors/:id/reviews
 * @desc    Add a review for a vendor
 * @access  Private (User only)
 */
export const addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;
  const vendorId = req.params.id;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  // Upload photos to Cloudinary (if any)
  let photos = [];
  if (req.files && req.files.length > 0) {
    configureCloudinary();
    const uploads = req.files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'vidai/reviews',
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(file.buffer);
        })
    );
    const results = await Promise.all(uploads);
    photos = results.map((r) => ({ url: r.secure_url, publicId: r.public_id }));
  }

  // Database unique index ensures a user can only review once
  try {
    const review = await Review.create({
      user: req.user._id,
      vendor: vendorId,
      rating: Number(rating),
      title,
      comment,
      photos,
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'leave_review',
      resourceType: 'Review',
      resourceId: review._id,
      details: `User left a ${rating}-star review for vendor ${vendor.businessName}`,
    });

    res.status(201).json({
      success: true,
      message: 'Review added successfully.',
      data: { review }
    });
  } catch (error) {
    // Check for duplicate key error (code 11000)
    if (error.code === 11000) {
      const duplicateError = new Error('You have already reviewed this vendor.');
      duplicateError.statusCode = 400;
      throw duplicateError;
    }
    throw error;
  }
});

/**
 * @route   GET /api/v1/vendors/:id/reviews
 * @desc    Get all reviews for a vendor
 * @access  Public
 */
export const getReviews = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;

  const reviews = await Review.find({ vendor: vendorId, isApproved: true })
    .populate('user', 'name avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: { reviews }
  });
});

/**
 * @route   POST /api/v1/vendors/:id/portfolio/:itemId/like
 * @desc    Toggle like on a vendor portfolio item
 * @access  Private (User/Admin)
 */
export const togglePortfolioLike = asyncHandler(async (req, res) => {
  const { id: vendorId, itemId } = req.params;

  const vendor = await Vendor.findById(vendorId).select('businessName portfolio');
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  const item = vendor.portfolio.id(itemId);
  if (!item) {
    const error = new Error('Portfolio item not found.');
    error.statusCode = 404;
    throw error;
  }

  const userId = req.user._id.toString();
  const alreadyLiked = item.likes?.some((id) => id.toString() === userId);

  if (alreadyLiked) {
    item.likes = item.likes.filter((id) => id.toString() !== userId);
  } else {
    item.likes.push(req.user._id);
  }

  await vendor.save();
  await vendor.populate('portfolio.comments.user', 'name avatar');
  const populatedItem = vendor.portfolio.id(itemId);

  res.status(200).json({
    success: true,
    message: alreadyLiked ? 'Portfolio item unliked.' : 'Portfolio item liked.',
    data: {
      liked: !alreadyLiked,
      portfolioItem: serializePortfolioItem(populatedItem),
    },
  });
});

/**
 * @route   POST /api/v1/vendors/:id/portfolio/:itemId/comments
 * @desc    Add a comment on a vendor portfolio item
 * @access  Private (User/Admin)
 */
export const addPortfolioComment = asyncHandler(async (req, res) => {
  const { id: vendorId, itemId } = req.params;
  const text = (req.body?.text || '').trim();

  if (!text) {
    const error = new Error('Comment text is required.');
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findById(vendorId).select('businessName portfolio');
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  const item = vendor.portfolio.id(itemId);
  if (!item) {
    const error = new Error('Portfolio item not found.');
    error.statusCode = 404;
    throw error;
  }

  item.comments.push({ user: req.user._id, text });
  await vendor.save();

  await vendor.populate('portfolio.comments.user', 'name avatar');
  const populatedItem = vendor.portfolio.id(itemId);

  res.status(201).json({
    success: true,
    message: 'Comment added successfully.',
    data: {
      portfolioItem: serializePortfolioItem(populatedItem),
    },
  });
});

/**
 * @route   DELETE /api/v1/vendors/:id/portfolio/:itemId/comments/:commentId
 * @desc    Delete own comment from a vendor portfolio item
 * @access  Private (User/Admin)
 */
export const deletePortfolioComment = asyncHandler(async (req, res) => {
  const { id: vendorId, itemId, commentId } = req.params;

  const vendor = await Vendor.findById(vendorId).select('businessName portfolio');
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.statusCode = 404;
    throw error;
  }

  const item = vendor.portfolio.id(itemId);
  if (!item) {
    const error = new Error('Portfolio item not found.');
    error.statusCode = 404;
    throw error;
  }

  const comment = item.comments.id(commentId);
  if (!comment) {
    const error = new Error('Comment not found.');
    error.statusCode = 404;
    throw error;
  }

  const commentOwnerId = (comment.user?._id || comment.user)?.toString();
  if (!commentOwnerId || commentOwnerId !== req.user._id.toString()) {
    const error = new Error('You can only delete your own comment.');
    error.statusCode = 403;
    throw error;
  }

  item.comments.pull(commentId);
  await vendor.save();

  await vendor.populate('portfolio.comments.user', 'name avatar');
  const populatedItem = vendor.portfolio.id(itemId);

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully.',
    data: {
      portfolioItem: serializePortfolioItem(populatedItem),
    },
  });
});

/**
 * @route   GET /api/v1/vendors/me/analytics
 * @desc    Get vendor sales analytics (monthly/annual)
 * @access  Private (vendor)
 */
export const getVendorAnalytics = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const period = req.query.period || 'monthly';

  let startDate, endDate, prevStartDate, prevEndDate;

  if (period === 'monthly') {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
    prevStartDate = new Date(year, month - 2, 1);
    prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
  } else {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    prevStartDate = new Date(year - 1, 0, 1);
    prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  }

  const baseMatch = { vendor: vendor._id };
  const periodMatch = { ...baseMatch, createdAt: { $gte: startDate, $lte: endDate } };
  const prevPeriodMatch = { ...baseMatch, createdAt: { $gte: prevStartDate, $lte: prevEndDate } };

  // Summary stats
  const [currentSummary] = await Booking.aggregate([
    { $match: periodMatch },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] },
        },
        pendingRevenue: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'approved'] }, { $in: ['$paymentStatus', ['unpaid', 'partial']] }] },
              '$agreedPrice',
              0,
            ],
          },
        },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        approvedBookings: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejectedBookings: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        expiredBookings: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        totalAgreed: { $sum: { $cond: [{ $gt: ['$agreedPrice', 0] }, '$agreedPrice', 0] } },
        agreedCount: { $sum: { $cond: [{ $gt: ['$agreedPrice', 0] }, 1, 0] } },
      },
    },
  ]);

  const s = currentSummary || {
    totalBookings: 0, totalRevenue: 0, pendingRevenue: 0,
    completedBookings: 0, cancelledBookings: 0, approvedBookings: 0,
    rejectedBookings: 0, pendingBookings: 0, expiredBookings: 0, totalAgreed: 0, agreedCount: 0,
  };

  // Previous period comparison
  const [prevSummary] = await Booking.aggregate([
    { $match: prevPeriodMatch },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } },
        totalBookings: { $sum: 1 },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
  ]);
  const prev = prevSummary || { totalRevenue: 0, totalBookings: 0, completedBookings: 0, cancelledBookings: 0 };

  const pctChange = (curr, p) => p > 0 ? Math.round(((curr - p) / p) * 100) : curr > 0 ? 100 : 0;

  // Monthly trend (12 months)
  const trendStart = period === 'monthly'
    ? new Date(year, month - 12, 1)
    : new Date(year - 1, 0, 1);

  const monthlyTrend = await Booking.aggregate([
    { $match: { ...baseMatch, createdAt: { $gte: trendStart, $lte: endDate } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } },
        bookings: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendMap = {};
  monthlyTrend.forEach((m) => { trendMap[`${m._id.year}-${m._id.month}`] = m; });

  const trend = [];
  if (period === 'annual') {
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${m + 1}`;
      const d = trendMap[key];
      trend.push({ month: MONTH_NAMES[m], revenue: d?.revenue || 0, bookings: d?.bookings || 0, completed: d?.completed || 0, cancelled: d?.cancelled || 0 });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      const d = trendMap[key];
      trend.push({ month: MONTH_NAMES[dt.getMonth()], revenue: d?.revenue || 0, bookings: d?.bookings || 0, completed: d?.completed || 0, cancelled: d?.cancelled || 0 });
    }
  }

  // Status distribution
  const statusDist = await Booking.aggregate([
    { $match: periodMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusMap = {};
  statusDist.forEach((item) => { statusMap[item._id] = item.count; });

  // Payment breakdown
  const paymentDist = await Booking.aggregate([
    { $match: periodMatch },
    { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
  ]);
  const paymentMap = {};
  paymentDist.forEach((p) => { paymentMap[p._id] = p.count; });

  // Event type breakdown
  const eventBreakdown = await Booking.aggregate([
    { $match: periodMatch },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const avgDealValue = s.agreedCount > 0 ? Math.round(s.totalAgreed / s.agreedCount) : 0;
  const conversionRate = s.totalBookings > 0 ? Math.round((s.completedBookings / s.totalBookings) * 100) : 0;
  const cancellationRate = s.totalBookings > 0 ? Math.round((s.cancelledBookings / s.totalBookings) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      period,
      year,
      month,
      summary: {
        totalRevenue: s.totalRevenue,
        pendingRevenue: s.pendingRevenue,
        totalBookings: s.totalBookings,
        completedBookings: s.completedBookings,
        cancelledBookings: s.cancelledBookings,
        approvedBookings: s.approvedBookings,
        rejectedBookings: s.rejectedBookings,
        pendingBookings: s.pendingBookings,
        expiredBookings: s.expiredBookings,
        avgDealValue,
        conversionRate,
        cancellationRate,
      },
      comparison: {
        revenue: pctChange(s.totalRevenue, prev.totalRevenue),
        bookings: pctChange(s.totalBookings, prev.totalBookings),
        completed: pctChange(s.completedBookings, prev.completedBookings),
        cancelled: pctChange(s.cancelledBookings, prev.cancelledBookings),
      },
      trend,
      statusDistribution: {
        pending: statusMap.pending || 0,
        approved: statusMap.approved || 0,
        completed: statusMap.completed || 0,
        rejected: statusMap.rejected || 0,
        cancelled: statusMap.cancelled || 0,
        expired: statusMap.expired || 0,
      },
      paymentBreakdown: {
        unpaid: paymentMap.unpaid || 0,
        partial: paymentMap.partial || 0,
        paid: paymentMap.paid || 0,
        refunded: paymentMap.refunded || 0,
      },
      eventBreakdown: eventBreakdown.map((e) => ({
        eventType: e._id || 'other',
        count: e.count,
        revenue: e.revenue,
      })),
      profile: {
        profileViews: vendor.profileViews || 0,
        ratingsAverage: vendor.ratingsAverage || 0,
        ratingsCount: vendor.ratingsCount || 0,
        totalBookingsAllTime: vendor.totalBookings || 0,
      },
    },
  });
});

