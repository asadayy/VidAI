import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { asyncHandler } from '../middleware/error.middleware.js';
import { configureCloudinary } from '../config/cloudinary.js';
import { logger } from '../config/logger.js';
import Vendor from '../models/Vendor.model.js';
import ActivityLog from '../models/ActivityLog.model.js';

// ─── Multer setup ─────────────────────────────────────────────────────────────

const storage = multer.memoryStorage();

// Accept images and common video formats
const fileFilter = (req, file, cb) => {
  const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideo = [
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'video/x-matroska', 'video/webm', 'video/mpeg',
  ];

  if ([...allowedImage, ...allowedVideo].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, MP4, MOV, AVI, MKV, WebM are allowed.'),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB to accommodate videos
});

// ─── Cloudinary helpers ───────────────────────────────────────────────────────

/**
 * Upload a buffer to Cloudinary with appropriate settings for images vs videos.
 */
const uploadToCloudinary = (buffer, folder, mimetype) => {
  // Configure here so env vars are guaranteed to be loaded (avoids ES-module hoisting issue)
  configureCloudinary();
  const isVideo = mimetype && mimetype.startsWith('video/');

  const uploadOptions = {
    folder: `vidai/${folder}`,
    resource_type: isVideo ? 'video' : 'image',
  };

  if (!isVideo) {
    // Optimise images
    uploadOptions.transformation = [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ];
  } else {
    // Optimise videos: cap resolution, compress
    uploadOptions.transformation = [
      { width: 1280, height: 720, crop: 'limit' },
      { quality: 'auto' },
    ];
    uploadOptions.eager = [
      { format: 'mp4', quality: 'auto' },
    ];
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete a resource from Cloudinary (works for both images and videos).
 */
const destroyFromCloudinary = (publicId, resourceType = 'image') => {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

// ─── Generic upload endpoints ─────────────────────────────────────────────────

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload a single image to Cloudinary
 * @access  Private
 */
export const uploadImage = [
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      const error = new Error('No image file provided.');
      error.statusCode = 400;
      throw error;
    }

    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(req.file.buffer, folder, req.file.mimetype);

    logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: 'image',
      },
    });
  }),
];

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload multiple images (max 10) to Cloudinary
 * @access  Private
 */
export const uploadMultipleImages = [
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      const error = new Error('No image files provided.');
      error.statusCode = 400;
      throw error;
    }

    const folder = req.body.folder || 'general';
    const results = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, folder, file.mimetype))
    );

    const images = results.map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      resourceType: 'image',
    }));

    res.status(200).json({
      success: true,
      data: { images },
    });
  }),
];

/**
 * @route   POST /api/v1/upload/video
 * @desc    Upload a single video to Cloudinary
 * @access  Private
 */
export const uploadVideo = [
  upload.single('video'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      const error = new Error('No video file provided.');
      error.statusCode = 400;
      throw error;
    }

    if (!req.file.mimetype.startsWith('video/')) {
      const error = new Error('File must be a video.');
      error.statusCode = 400;
      throw error;
    }

    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(req.file.buffer, folder, req.file.mimetype);

    logger.info(`Video uploaded to Cloudinary: ${result.public_id}`);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        resourceType: 'video',
      },
    });
  }),
];

/**
 * @route   DELETE /api/v1/upload/image
 * @desc    Delete an image or video from Cloudinary
 * @access  Private
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId, resourceType } = req.body;

  if (!publicId) {
    const error = new Error('Public ID is required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate folder ownership — publicId must start with "vidai/<folder>/"
  const folderMatch = publicId.match(/^vidai\/([^/]+)\//);
  if (!folderMatch) {
    const error = new Error('Invalid resource path.');
    error.statusCode = 400;
    throw error;
  }

  const folder = folderMatch[1];
  const allowedFolders = ['vendors', 'users', 'portfolios', 'general'];

  if (!allowedFolders.includes(folder)) {
    const error = new Error('You do not have permission to delete resources from this folder.');
    error.statusCode = 403;
    throw error;
  }

  if (folder === 'vendors' && req.user.role !== 'vendor') {
    const error = new Error('Only vendors can delete resources from the vendors folder.');
    error.statusCode = 403;
    throw error;
  }

  const type = resourceType === 'video' ? 'video' : 'image';
  const result = await destroyFromCloudinary(publicId, type);
  logger.info(`${type} deleted from Cloudinary: ${publicId} by user ${req.user._id}`);

  res.status(200).json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`,
    data: { result: result.result },
  });
});

// ─── Vendor-specific endpoints (persist to MongoDB) ──────────────────────────

/**
 * @route   POST /api/v1/upload/vendor/cover
 * @desc    Upload vendor cover image and save URL to Vendor model
 * @access  Private (Vendor only)
 */
export const uploadVendorCover = [
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      const error = new Error('No image file provided.');
      error.statusCode = 400;
      throw error;
    }

    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      const error = new Error('Vendor profile not found.');
      error.statusCode = 404;
      throw error;
    }

    // Delete old cover from Cloudinary if it exists
    if (vendor.coverImage?.publicId) {
      try {
        await destroyFromCloudinary(vendor.coverImage.publicId, 'image');
      } catch (e) {
        logger.warn(`Failed to delete old cover image: ${e.message}`);
      }
    }

    const result = await uploadToCloudinary(req.file.buffer, 'vendors/covers', req.file.mimetype);

    vendor.coverImage = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await vendor.save();

    logger.info(`Vendor cover image updated: ${result.public_id} for vendor ${vendor._id}`);

    res.status(200).json({
      success: true,
      message: 'Cover image updated.',
      data: {
        coverImage: vendor.coverImage,
      },
    });
  }),
];

/**
 * @route   POST /api/v1/upload/vendor/portfolio
 * @desc    Upload portfolio images/videos and append to Vendor.portfolio in MongoDB
 * @access  Private (Vendor only)
 */
export const uploadVendorPortfolio = [
  upload.array('media', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      const error = new Error('No files provided.');
      error.statusCode = 400;
      throw error;
    }

    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      const error = new Error('Vendor profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const caption = req.body.caption || '';

    // Upload all files in parallel
    const results = await Promise.all(
      req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'vendors/portfolio', file.mimetype)
      )
    );

    const newItems = results.map((r, idx) => ({
      url: r.secure_url,
      publicId: r.public_id,
      resourceType: req.files[idx].mimetype.startsWith('video/') ? 'video' : 'image',
      caption,
    }));

    // Append to portfolio array and persist
    vendor.portfolio.push(...newItems);
    await vendor.save();

    logger.info(`${newItems.length} portfolio item(s) added for vendor ${vendor._id}`);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'add_portfolio_image',
      resourceType: 'Vendor',
      resourceId: vendor._id,
      details: `${newItems.length} portfolio item(s) uploaded by vendor ${vendor.businessName}`,
    });

    res.status(200).json({
      success: true,
      message: `${newItems.length} item(s) added to portfolio.`,
      data: {
        added: newItems,
        portfolio: vendor.portfolio,
      },
    });
  }),
];

/**
 * @route   DELETE /api/v1/upload/vendor/portfolio/:itemId
 * @desc    Remove a portfolio item from Vendor.portfolio and delete from Cloudinary
 * @access  Private (Vendor only)
 */
export const deleteVendorPortfolioItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    const error = new Error('Vendor profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const item = vendor.portfolio.id(itemId);
  if (!item) {
    const error = new Error('Portfolio item not found.');
    error.statusCode = 404;
    throw error;
  }

  // Delete from Cloudinary
  if (item.publicId) {
    try {
      await destroyFromCloudinary(item.publicId, item.resourceType || 'image');
    } catch (e) {
      logger.warn(`Failed to delete Cloudinary asset ${item.publicId}: ${e.message}`);
    }
  }

  item.deleteOne();
  await vendor.save();

  logger.info(`Portfolio item ${itemId} deleted by vendor ${vendor._id}`);

  res.status(200).json({
    success: true,
    message: 'Portfolio item removed.',
    data: { portfolio: vendor.portfolio },
  });
});
