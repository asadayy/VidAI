import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Invitation title is required'],
      trim: true,
    },
    // Template used
    templateId: {
      type: String,
      default: 'default',
    },
    // Customization data
    groomName: { type: String, trim: true, default: '' },
    brideName: { type: String, trim: true, default: '' },
    eventDate: { type: Date },
    eventTime: { type: String, default: '' },
    venue: { type: String, trim: true, default: '' },
    venueAddress: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    // Styling
    fontFamily: { type: String, default: 'serif' },
    primaryColor: { type: String, default: '#ec4899' },
    secondaryColor: { type: String, default: '#f97316' },
    backgroundColor: { type: String, default: '#fff7ed' },
    // Background image
    backgroundImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    // Generated output
    generatedImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    // Sharing
    shareableLink: { type: String, default: '' },
    isPublic: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ user: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
