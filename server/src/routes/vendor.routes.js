import express from 'express';
import {
  getVendors,
  getVendorById,
  getVendorBySlug,
  createVendorProfile,
  updateVendorProfile,
  addPackage,
  updatePackage,
  deletePackage,
  getMyVendorProfile,
  searchVendors,
  addReview,
  getReviews,
  togglePortfolioLike,
  addPortfolioComment,
  deletePortfolioComment,
} from '../controllers/vendor.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateVendorProfile } from '../middleware/validate.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getVendors);
router.get('/search', searchVendors);
router.get('/slug/:slug', getVendorBySlug);

// Protected vendor routes (must be before /:id to avoid shadowing)
router.post('/profile', protect, authorize('vendor'), validateVendorProfile, createVendorProfile);
router.get('/me/profile', protect, authorize('vendor'), getMyVendorProfile);
router.put('/me/profile', protect, authorize('vendor'), validateVendorProfile, updateVendorProfile);

// Parameterised public routes (keep after named routes)
router.get('/:id', getVendorById);
router.get('/:id/reviews', getReviews);

// Review management
router.post('/:id/reviews', protect, authorize('user', 'admin'), addReview);

// Portfolio social interactions
router.post('/:id/portfolio/:itemId/like', protect, authorize('user', 'admin'), togglePortfolioLike);
router.post('/:id/portfolio/:itemId/comments', protect, authorize('user', 'admin'), addPortfolioComment);
router.delete('/:id/portfolio/:itemId/comments/:commentId', protect, authorize('user', 'admin'), deletePortfolioComment);

// Package management
router.post('/me/packages', protect, authorize('vendor'), addPackage);
router.put('/me/packages/:packageId', protect, authorize('vendor'), updatePackage);
router.delete('/me/packages/:packageId', protect, authorize('vendor'), deletePackage);

export default router;
