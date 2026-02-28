import express from 'express';
import {
    uploadImage,
    uploadMultipleImages,
    uploadVideo,
    deleteImage,
    uploadVendorCover,
    uploadVendorPortfolio,
    deleteVendorPortfolioItem,
} from '../controllers/upload.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── Generic upload (any authenticated user) ─────────────────────────────────
router.post('/image', protect, uploadImage);
router.post('/images', protect, uploadMultipleImages);
router.post('/video', protect, uploadVideo);
router.delete('/image', protect, deleteImage);

// ─── Vendor-specific (persist to MongoDB) ────────────────────────────────────
router.post('/vendor/cover', protect, authorize('vendor'), uploadVendorCover);
router.post('/vendor/portfolio', protect, authorize('vendor'), uploadVendorPortfolio);
router.delete('/vendor/portfolio/:itemId', protect, authorize('vendor'), deleteVendorPortfolioItem);

export default router;
