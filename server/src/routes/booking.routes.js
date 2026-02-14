import express from 'express';
import {
  createBooking,
  getUserBookings,
  getVendorBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} from '../controllers/booking.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateBooking } from '../middleware/validate.middleware.js';

const router = express.Router();

// User routes
router.post('/', protect, authorize('user'), validateBooking, createBooking);
router.get('/my-bookings', protect, authorize('user'), getUserBookings);

// Vendor routes
router.get('/vendor-bookings', protect, authorize('vendor'), getVendorBookings);
router.patch('/:id/status', protect, authorize('vendor'), updateBookingStatus);

// Shared routes
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, cancelBooking);

export default router;
