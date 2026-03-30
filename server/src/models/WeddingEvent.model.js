import mongoose from 'mongoose';

const EVENT_COLORS = {
  dholki: '#f59e0b',
  mayun: '#eab308',
  mehndi: '#10b981',
  nikkah: '#6366f1',
  baraat: '#D7385E',
  walima: '#8b5cf6',
  engagement: '#ec4899',
  other: '#64748b',
};

const weddingEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['dholki', 'mayun', 'mehndi', 'nikkah', 'baraat', 'walima', 'engagement', 'other'],
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    eventDate: {
      type: Date,
    },
    venue: {
      type: String,
      trim: true,
      default: '',
    },
    venueType: {
      type: String,
      trim: true,
      default: '',
    },
    guestCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    allocatedBudget: {
      type: Number,
      min: 0,
      default: 0,
    },
    color: {
      type: String,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['planning', 'vendors_booked', 'ready', 'completed'],
      default: 'planning',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

weddingEventSchema.index({ user: 1 });

// Auto-set title and color before saving if not provided
weddingEventSchema.pre('save', function (next) {
  if (!this.title) {
    this.title = this.eventType.charAt(0).toUpperCase() + this.eventType.slice(1);
  }
  if (!this.color) {
    this.color = EVENT_COLORS[this.eventType] || EVENT_COLORS.other;
  }
  next();
});

const WeddingEvent = mongoose.model('WeddingEvent', weddingEventSchema);
export default WeddingEvent;
