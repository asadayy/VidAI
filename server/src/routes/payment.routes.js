import express from 'express';
import {
  createCheckoutSession,
  handleWebhook,
  getPaymentStatus,
} from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Stripe webhook - must use raw body (no JSON parsing)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-checkout-session', protect, authorize('user'), createCheckoutSession);
router.get('/status/:bookingId', protect, getPaymentStatus);

export default router;
