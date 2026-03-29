import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ['user', 'vendor'],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['vendor', 'portfolio_item', 'customer', 'review', 'portfolio_comment'],
      required: true,
    },
    reasonCategory: {
      type: String,
      enum: [
        'fraud_or_scam',
        'inappropriate_content',
        'fake_or_misleading',
        'harassment_or_abuse',
        'copyright_or_ip',
        'spam',
        'other',
      ],
      default: 'other',
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    // Targets (one or more depending on report type)
    targetVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    targetBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    portfolioItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    portfolioCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'in_review', 'resolved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
      default: '',
    },
    adminActionType: {
      type: String,
      enum: [
        'none',
        'warn_vendor',
        'warn_user',
        'remove_portfolio_comment',
        'deactivate_vendor',
        'deactivate_user',
        'hide_review',
        'remove_portfolio_item',
      ],
      default: 'none',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, createdAt: -1 });
reportSchema.index({ targetVendor: 1, createdAt: -1 });
reportSchema.index({ targetUser: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
