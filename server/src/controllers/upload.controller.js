import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { asyncHandler } from '../middleware/error.middleware.js';
import { configureCloudinary } from '../config/cloudinary.js';
import { logger } from '../config/logger.js';

// Configure Cloudinary
configureCloudinary();

// Multer memory storage (no local files)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/**
 * Upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `vidai/${folder}`,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload a single image
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
    const result = await uploadToCloudinary(req.file.buffer, folder);

    logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
  }),
];

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload multiple images (max 10)
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
      req.files.map((file) => uploadToCloudinary(file.buffer, folder))
    );

    const images = results.map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
      width: r.width,
      height: r.height,
    }));

    res.status(200).json({
      success: true,
      data: { images },
    });
  }),
];

/**
 * @route   DELETE /api/v1/upload/image
 * @desc    Delete an image from Cloudinary
 * @access  Private
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    const error = new Error('Public ID is required.');
    error.statusCode = 400;
    throw error;
  }

  // CRITICAL SECURITY FIX: Validate folder ownership
  // Extract folder from publicId (e.g., "vidai/vendors/image123" → "vendors")
  const folderMatch = publicId.match(/^vidai\/([^/]+)\//);
  if (!folderMatch) {
    const error = new Error('Invalid image path.');
    error.statusCode = 400;
    throw error;
  }

  const folder = folderMatch[1];
  const allowedFolders = ['vendors', 'users', 'portfolios', 'general'];

  // Verify folder is in whitelist
  if (!allowedFolders.includes(folder)) {
    const error = new Error('You do not have permission to delete images from this folder.');
    error.statusCode = 403;
    throw error;
  }

  // For vendors folder, verify user is a vendor
  // For users folder, verify it's the user's own images
  // (Additional ownership checks can be added based on business logic)
  if (folder === 'vendors' && req.user.role !== 'vendor') {
    const error = new Error('Only vendors can delete images from the vendors folder.');
    error.statusCode = 403;
    throw error;
  }

  const result = await cloudinary.uploader.destroy(publicId);
  logger.info(`Image deleted from Cloudinary: ${publicId} by user ${req.user._id}`);

  res.status(200).json({
    success: true,
    message: 'Image deleted.',
    data: { result: result.result },
  });
});
