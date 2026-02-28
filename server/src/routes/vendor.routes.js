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
} from '../controllers/vendor.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateVendorProfile } from '../middleware/validate.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getVendors);
router.get('/search', searchVendors);
router.get('/slug/:slug', getVendorBySlug);
router.get('/:id', getVendorById);
router.get('/:id/reviews', getReviews);

// Protected vendor routes
router.post('/profile', protect, authorize('vendor'), validateVendorProfile, createVendorProfile);
router.get('/me/profile', protect, authorize('vendor'), getMyVendorProfile);
router.put('/me/profile', protect, authorize('vendor'), validateVendorProfile, updateVendorProfile);

// Review management
router.post('/:id/reviews', protect, authorize('user', 'admin'), addReview);

// Package management
router.post('/me/packages', protect, authorize('vendor'), addPackage);
router.put('/me/packages/:packageId', protect, authorize('vendor'), updatePackage);
router.delete('/me/packages/:packageId', protect, authorize('vendor'), deletePackage);

export default router;
