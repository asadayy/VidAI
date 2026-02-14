import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for booking'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor is required for booking'],
    },
    // Which service package was selected (optional)
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    packageName: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      enum: ['wedding', 'engagement', 'mehndi', 'baraat', 'walima', 'nikkah', 'other'],
      default: 'wedding',
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    eventEndDate: {
      type: Date,
    },
    // Venue / location of the event
    eventLocation: {
      type: String,
      trim: true,
      default: '',
    },
    guestCount: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    // Booking status workflow: pending → approved/rejected → completed/cancelled
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Pricing
    agreedPrice: {
      type: Number,
      min: 0,
    },
    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stripePaymentIntentId: String,
    stripeSessionId: String,
    // Vendor response
    vendorResponse: {
      message: { type: String, default: '' },
      respondedAt: Date,
    },
    // Cancellation
    cancelledBy: {
      type: String,
      enum: ['user', 'vendor', 'admin', null],
      default: null,
    },
    cancellationReason: String,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ vendor: 1, status: 1 });
bookingSchema.index({ eventDate: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
