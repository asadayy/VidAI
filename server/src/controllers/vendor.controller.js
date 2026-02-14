import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import slugify from 'slugify';

/**
 * @route   GET /api/v1/vendors
 * @desc    Get all approved vendors (public listing)
 * @access  Public
 */
export const getVendors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Build filter
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

  const vendors = await Vendor.find(
    {
      $text: { $search: q },
      verificationStatus: 'approved',
      isActive: true,
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .populate('user', 'name avatar')
    .limit(20)
    .lean();

  res.status(200).json({
    success: true,
    data: { vendors, count: vendors.length },
  });
});

/**
 * @route   GET /api/v1/vendors/:id
 * @desc    Get vendor by ID
 * @access  Public
 */
export const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('user', 'name email avatar phone');

  if (!vendor) {
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
    .populate('user', 'name email avatar phone');

  if (!vendor) {
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
    .populate('user', 'name email avatar phone');

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
