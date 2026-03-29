import mongoose from 'mongoose';

const servicePackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  price: {
    type: Number,
    required: [true, 'Package price is required'],
    min: [0, 'Price cannot be negative'],
  },
  features: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true,
  },
});

const availabilitySlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
});

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'venue', 'photographer', 'videographer', 'caterer', 'decorator',
        'makeup_artist', 'mehndi_artist', 'dj_music', 'wedding_planner',
        'invitation_cards', 'bridal_wear', 'groom_wear', 'jewelry',
        'transport', 'florist', 'cake', 'other',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    googleMapLink: {
      type: String,
      trim: true,
      default: '',
    },
    socialMedia: {
      instagram: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      tiktok: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
    },
    // Service packages offered by this vendor
    packages: [servicePackageSchema],
    // Starting price (auto-calculated or manual)
    startingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Portfolio / gallery images and videos
    portfolio: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        resourceType: { type: String, enum: ['image', 'video'], default: 'image' },
        caption: { type: String, default: '' },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        comments: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            text: {
              type: String,
              required: true,
              trim: true,
              maxlength: [500, 'Comment cannot exceed 500 characters'],
            },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
    // Cover image
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    // Verification by admin
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verificationDocuments: [
      {
        url: { type: String },
        publicId: { type: String },
        type: { type: String }, // 'cnic', 'business_registration', 'other'
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verifiedAt: Date,
    rejectionReason: String,
    // Ratings & reviews summary
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    // Availability
    availability: [availabilitySlotSchema],
    // Profile completeness percentage
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stats
    totalBookings: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for search and filtering
vendorSchema.index({ category: 1, city: 1 });
vendorSchema.index({ verificationStatus: 1 });
vendorSchema.index({ startingPrice: 1 });
vendorSchema.index({ ratingsAverage: -1 });
// slug index already created by unique: true
vendorSchema.index({ location: '2dsphere' });
vendorSchema.index({
  businessName: 'text',
  description: 'text',
  city: 'text',
  category: 'text',
});

// Calculate profile completeness before saving
vendorSchema.pre('save', function (next) {
  const checks = [
    this.businessName, this.category, this.city, this.description,
    this.phone, this.address, this.coverImage?.url,
    this.packages?.length > 0, this.portfolio?.length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  this.profileCompleteness = Math.round((filled / checks.length) * 100);

  // Auto-set starting price from packages
  if (this.packages && this.packages.length > 0) {
    const activePrices = this.packages
      .filter((p) => p.isActive)
      .map((p) => p.price);
    if (activePrices.length > 0) {
      this.startingPrice = Math.min(...activePrices);
    }
  }

  next();
});

// Virtual: reviews
vendorSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'vendor',
});

// Virtual: bookings
vendorSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'vendor',
});

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
