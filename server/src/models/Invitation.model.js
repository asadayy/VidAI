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
    // Essentials (The Content)
    content: {
      names: { type: String, required: true }, // e.g., "Ahmad & Sarah" or with parents
      date: { type: Date, required: true },
      time: { type: String, required: true },
      venue: {
        name: { type: String, required: true },
        city: { type: String, required: true },
        mapLink: { type: String, default: '' },
      }
    },
    // Style (The Vibe)
    style: {
      theme: {
        type: String,
        enum: ['Modern Minimalist', 'Traditional/Ornate', 'Floral/Bohemian', 'Whimsical'],
        default: 'Modern Minimalist'
      },
      colorPalette: {
        primary: { type: String, default: '#ec4899' },
        secondary: { type: String, default: '#f97316' },
        background: { type: String, default: '#ffffff' },
        text: { type: String, default: '#1f2937' },
      },
      orientation: {
        type: String,
        enum: ['Portrait', 'Landscape'],
        default: 'Portrait'
      },
      imagery: { type: String, default: '' }, // e.g., "minimalist line art", "lavender flowers"
    },
    // Tone of Voice
    tone: {
      type: String,
      enum: ['Formal', 'Casual/Modern', 'Poetic'],
      default: 'Formal'
    },
    // Generated output
    generatedContent: {
      headline: String,
      bodyText: String,
      footerText: String,
      rsvpInfo: String,
    },
    // Meta
    status: {
      type: String,
      enum: ['draft', 'saved', 'published'],
      default: 'draft'
    },
    isPublic: { type: Boolean, default: false },
    shareableLink: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ user: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
