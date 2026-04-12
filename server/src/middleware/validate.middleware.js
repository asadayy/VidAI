import validator from 'validator';

/**
 * Validate registration input
 */
export const validateRegister = (req, res, next) => {
  const errors = [];
  const { name, email, password, role, phone } = req.body;

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
  }

  if (role && !['user', 'vendor'].includes(role)) {
    errors.push('Invalid role specified. Only user and vendor roles are allowed during registration.');
  }

  if (phone && !validator.isMobilePhone(phone, 'any')) {
    errors.push('Please provide a valid phone number.');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(' '));
    error.statusCode = 400;
    return next(error);
  }

  // Sanitize inputs
  req.body.email = validator.normalizeEmail(email);
  req.body.name = name.trim(); // Don't escape name - it corrupts names like O'Brien

  next();
};

/**
 * Validate login input
 */
export const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password) {
    errors.push('Please provide a password.');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(' '));
    error.statusCode = 400;
    return next(error);
  }

  req.body.email = validator.normalizeEmail(email);
  next();
};

/**
 * Validate vendor profile input
 */
export const validateVendorProfile = (req, res, next) => {
  const errors = [];
  const { businessName, category, city } = req.body;

  if (businessName !== undefined && businessName.trim().length < 2) {
    errors.push('Business name must be at least 2 characters.');
  }

  const validCategories = [
    'venue', 'photographer', 'videographer', 'caterer', 'decorator',
    'makeup_artist', 'mehndi_artist', 'dj_music', 'wedding_planner',
    'invitation_cards', 'bridal_wear', 'groom_wear', 'jewelry',
    'transport', 'florist', 'cake', 'other'
  ];

  if (category && !validCategories.includes(category)) {
    errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  if (city !== undefined && city.trim().length < 2) {
    errors.push('City must be at least 2 characters.');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(' '));
    error.statusCode = 400;
    return next(error);
  }

  next();
};

/**
 * Validate booking input
 */
export const validateBooking = (req, res, next) => {
  const errors = [];
  const { vendorId, eventDate, eventType, timeSlot, venueType } = req.body;

  if (!vendorId) errors.push('Vendor ID is required.');
  if (!eventDate) errors.push('Event date is required.');
  
  if (eventDate) {
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid event date format.');
    } else if (date <= new Date()) {
      errors.push('Event date must be in the future.');
    }
  }

  const validEventTypes = ['wedding', 'engagement', 'mehndi', 'baraat', 'walima', 'nikkah', 'other'];
  if (eventType && !validEventTypes.includes(eventType)) {
    errors.push(`Invalid event type. Must be one of: ${validEventTypes.join(', ')}`);
  }

  const validTimeSlots = ['morning', 'evening'];
  if (timeSlot && !validTimeSlots.includes(timeSlot)) {
    errors.push(`Invalid time slot. Must be one of: ${validTimeSlots.join(', ')}`);
  }

  const validVenueTypes = ['personal_residence', 'booked_venue'];
  if (venueType && !validVenueTypes.includes(venueType)) {
    errors.push(`Invalid venue type. Must be one of: ${validVenueTypes.join(', ')}`);
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(' '));
    error.statusCode = 400;
    return next(error);
  }

  next();
};
