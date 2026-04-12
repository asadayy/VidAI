import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Review must belong to a vendor'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    photos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    // Admin moderation
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews: one user can only review a vendor once
reviewSchema.index({ user: 1, vendor: 1 }, { unique: true });

// Static method: calculate average rating for a vendor
reviewSchema.statics.calcAverageRatings = async function (vendorId) {
  const stats = await this.aggregate([
    { $match: { vendor: vendorId, isApproved: true } },
    {
      $group: {
        _id: '$vendor',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const Vendor = mongoose.model('Vendor');
  if (stats.length > 0) {
    await Vendor.findByIdAndUpdate(vendorId, {
      ratingsAverage: stats[0].avgRating,
      ratingsCount: stats[0].nRatings,
    });
  } else {
    await Vendor.findByIdAndUpdate(vendorId, {
      ratingsAverage: 0,
      ratingsCount: 0,
    });
  }
};

// Recalculate ratings after save
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.vendor);
});

// Recalculate ratings after delete
reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calcAverageRatings(doc.vendor);
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
