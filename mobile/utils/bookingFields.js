/**
 * Category-specific booking field configuration.
 * Returns which fields to render and which are required per vendor category.
 */

const CATEGORY_FIELDS = {
  venue: {
    guestCount: { required: true, label: 'Guest Count' },
    eventDate: { required: true, label: 'Event Date' },
    timeSlot: { required: true, label: 'Morning / Evening' },
    eventType: { required: true, label: 'Event Type' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
  caterer: {
    guestCount: { required: true, label: 'Guest Count' },
    eventDate: { required: true, label: 'Event Date' },
    timeSlot: { required: true, label: 'Morning / Evening' },
    eventType: { required: true, label: 'Event Type' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
  makeup_artist: {
    eventDate: { required: true, label: 'Event Date' },
    eventTime: { required: true, label: 'Time' },
    numberOfPeople: { required: true, label: 'No. of People' },
    eventType: { required: true, label: 'Event Type' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
  mehndi_artist: {
    eventDate: { required: true, label: 'Event Date' },
    eventTime: { required: true, label: 'Time' },
    numberOfPeople: { required: true, label: 'No. of People' },
    eventType: { required: true, label: 'Event Type' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
  photographer: {
    eventDate: { required: true, label: 'Event Date' },
    timeSlot: { required: true, label: 'Morning / Evening' },
    eventType: { required: true, label: 'Event Type' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
  decorator: {
    eventDate: { required: true, label: 'Event Date' },
    eventType: { required: true, label: 'Event Type' },
    venueType: { required: true, label: 'Venue Type' },
    eventLocation: { required: true, label: 'Venue Address' },
    notes: { required: false, label: 'Special Details / Notes' },
  },
};

const DEFAULT_FIELDS = {
  eventDate: { required: true, label: 'Event Date' },
  eventType: { required: true, label: 'Event Type' },
  guestCount: { required: false, label: 'Guest Count' },
  notes: { required: false, label: 'Special Details / Notes' },
};

export const getBookingFields = (category) => {
  return CATEGORY_FIELDS[category] || DEFAULT_FIELDS;
};

export const EVENT_TYPE_OPTIONS = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'mehndi', label: 'Mehndi' },
  { value: 'baraat', label: 'Baraat' },
  { value: 'walima', label: 'Walima' },
  { value: 'nikkah', label: 'Nikkah' },
  { value: 'other', label: 'Other' },
];

export const TIME_SLOT_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
];

export const VENUE_TYPE_OPTIONS = [
  { value: 'personal_residence', label: 'Personal Residence' },
  { value: 'booked_venue', label: 'Booked Venue' },
];
