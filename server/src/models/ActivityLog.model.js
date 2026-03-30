import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['User', 'Vendor', 'Booking', 'Review', 'Budget', 'Invitation', 'Payment', 'Report', 'System', 'WeddingEvent'],
      default: 'System',
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ user: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ resourceType: 1, action: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
