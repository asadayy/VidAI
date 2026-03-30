import mongoose from 'mongoose';

const budgetItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true,
  },
  allocatedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  spentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  weddingEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeddingEvent',
    default: null,
  },
});

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalBudget: {
      type: Number,
      required: [true, 'Total budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    eventType: {
      type: String,
      enum: ['wedding', 'engagement', 'mehndi', 'baraat', 'walima', 'nikkah', 'full_wedding', 'other'],
      default: 'full_wedding',
    },
    // Per-event budget allocations (empty = single-event mode)
    events: [
      {
        weddingEvent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WeddingEvent',
        },
        eventType: { type: String },
        allocatedAmount: { type: Number, default: 0 },
        aiPlan: {
          generatedAt: Date,
          allocations: [
            {
              category: String,
              percentage: Number,
              amount: Number,
              explanation: String,
            },
          ],
          summary: String,
          tips: [String],
        },
      },
    ],
    items: [budgetItemSchema],
    // AI-generated plan stored here
    aiPlan: {
      generatedAt: Date,
      allocations: [
        {
          category: String,
          percentage: Number,
          amount: Number,
          explanation: String,
        },
      ],
      summary: String,
      tips: [String],
    },
    // Computed totals
    totalAllocated: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

budgetSchema.index({ user: 1 });

// Calculate totals before saving
budgetSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAllocated = this.items.reduce((sum, item) => sum + item.allocatedAmount, 0);
    this.totalSpent = this.items.reduce((sum, item) => sum + item.spentAmount, 0);
  }
  next();
});

// Virtual: remaining budget
budgetSchema.virtual('remainingBudget').get(function () {
  return this.totalBudget - this.totalSpent;
});

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
