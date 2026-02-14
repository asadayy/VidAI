import { getStripe } from '../config/stripe.js';
import Booking from '../models/Booking.model.js';
import Vendor from '../models/Vendor.model.js';
import Notification from '../models/Notification.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';

/**
 * @route   POST /api/v1/payments/create-checkout-session
 * @desc    Create a Stripe Checkout session for a booking
 * @access  Private (User)
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    const error = new Error('Payment service is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const { bookingId } = req.body;

  const booking = await Booking.findOne({
    _id: bookingId,
    user: req.user._id,
  }).populate('vendor', 'businessName');

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'approved') {
    const error = new Error('Booking must be approved before payment.');
    error.statusCode = 400;
    throw error;
  }

  if (booking.paymentStatus === 'paid') {
    const error = new Error('This booking is already paid.');
    error.statusCode = 400;
    throw error;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'pkr',
          product_data: {
            name: `${booking.vendor.businessName} - ${booking.packageName || booking.eventType}`,
            description: `Booking for ${booking.eventType} on ${new Date(booking.eventDate).toLocaleDateString('en-PK')}`,
          },
          unit_amount: Math.round(booking.agreedPrice * 100), // Stripe uses smallest currency unit
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking._id.toString(),
      userId: req.user._id.toString(),
    },
    success_url: `${process.env.CLIENT_URL}/bookings?payment=success`,
    cancel_url: `${process.env.CLIENT_URL}/bookings?payment=cancelled`,
  });

  booking.stripeSessionId = session.id;
  await booking.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: { sessionId: session.id, url: session.url },
  });
});

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe calls this)
 */
export const handleWebhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ success: false, message: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

      try {
        const booking = await Booking.findById(session.metadata.bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.paymentAmount = session.amount_total / 100;
          booking.stripePaymentIntentId = session.payment_intent;
          await booking.save({ validateBeforeSave: false });

          // Notify vendor - FIX: Properly await Vendor lookup
          const vendor = await Vendor.findById(booking.vendor);
          if (vendor) {
            await Notification.create({
              recipient: vendor.user,
              type: 'payment_received',
              title: 'Payment Received',
              message: `Payment of PKR ${booking.paymentAmount} received for booking.`,
              relatedModel: 'Booking',
              relatedId: booking._id,
            });
          }

          await ActivityLog.create({
            action: 'payment_completed',
            resourceType: 'Payment',
            resourceId: booking._id,
            details: `Payment of PKR ${booking.paymentAmount} completed for booking ${booking._id}`,
          });

          logger.info(`Payment completed for booking ${booking._id}: PKR ${booking.paymentAmount}`);
        }
      } catch (error) {
        logger.error(`Error processing webhook: ${error.message}`);
    }
  }

  res.status(200).json({ received: true });
};

/**
 * @route   GET /api/v1/payments/status/:bookingId
 * @desc    Get payment status for a booking
 * @access  Private
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  // CRITICAL SECURITY FIX: Verify user owns the booking before retrieving payment data
  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    user: req.user._id,  // Authorization check - user must own this booking
  }).select('paymentStatus paymentAmount stripeSessionId agreedPrice');

  if (!booking) {
    const error = new Error('Booking not found or you do not have permission to view this payment.');
    error.statusCode = 403;  // 403 Forbidden (not 404 to avoid information leakage)
    throw error;
  }

  res.status(200).json({
    success: true,
    data: {
      paymentStatus: booking.paymentStatus,
      paymentAmount: booking.paymentAmount,
      agreedPrice: booking.agreedPrice,
    },
  });
});
