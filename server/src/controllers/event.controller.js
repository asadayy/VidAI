import WeddingEvent from '../models/WeddingEvent.model.js';
import Budget from '../models/Budget.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * @route   POST /api/v1/events
 * @desc    Create a wedding event
 * @access  Private (User)
 */
export const createEvent = asyncHandler(async (req, res) => {
  const { eventType, title, eventDate, venue, venueType, guestCount, allocatedBudget, notes, sortOrder } = req.body;

  if (!eventType) {
    const error = new Error('Event type is required.');
    error.statusCode = 400;
    throw error;
  }

  // Check for duplicate event type for this user
  const existing = await WeddingEvent.findOne({ user: req.user._id, eventType });
  if (existing) {
    const error = new Error(`You already have a ${eventType} event. Edit it instead.`);
    error.statusCode = 409;
    throw error;
  }

  const event = await WeddingEvent.create({
    user: req.user._id,
    eventType,
    title: title || '',
    eventDate,
    venue,
    venueType,
    guestCount,
    allocatedBudget: allocatedBudget || 0,
    notes,
    sortOrder: sortOrder ?? (await WeddingEvent.countDocuments({ user: req.user._id })),
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create_event',
    resourceType: 'WeddingEvent',
    resourceId: event._id,
    details: `Created ${eventType} event`,
  });

  // Sync with Budget.events so the event tab shows up in budget planner
  try {
    const budget = await Budget.findOne({ user: req.user._id });
    if (budget) {
      const alreadyLinked = budget.events.some(
        e => e.weddingEvent?.toString() === event._id.toString()
      );
      if (!alreadyLinked) {
        budget.events.push({
          weddingEvent: event._id,
          eventType: event.eventType,
          allocatedAmount: event.allocatedBudget || 0,
        });
        await budget.save();
      }
    }
  } catch {
    // Non-critical — don't block event creation
  }

  res.status(201).json({
    success: true,
    message: 'Event created.',
    data: { event },
  });
});

/**
 * @route   GET /api/v1/events
 * @desc    List user's wedding events
 * @access  Private (User)
 */
export const getMyEvents = asyncHandler(async (req, res) => {
  const events = await WeddingEvent.find({ user: req.user._id }).sort('sortOrder eventDate');

  res.status(200).json({
    success: true,
    data: { events },
  });
});

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get single event details
 * @access  Private (User)
 */
export const getEvent = asyncHandler(async (req, res) => {
  const event = await WeddingEvent.findOne({ _id: req.params.id, user: req.user._id });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: { event },
  });
});

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update a wedding event
 * @access  Private (User)
 */
export const updateEvent = asyncHandler(async (req, res) => {
  const allowedFields = [
    'title', 'eventDate', 'venue', 'venueType',
    'guestCount', 'allocatedBudget', 'notes', 'sortOrder', 'status', 'color',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const event = await WeddingEvent.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Event updated.',
    data: { event },
  });
});

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete a wedding event
 * @access  Private (User)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await WeddingEvent.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete_event',
    resourceType: 'WeddingEvent',
    resourceId: event._id,
    details: `Deleted ${event.eventType} event`,
  });

  // Remove from budget.events and unlink any items tagged to this event
  try {
    const budget = await Budget.findOne({ user: req.user._id });
    if (budget) {
      budget.events = budget.events.filter(
        e => e.weddingEvent?.toString() !== event._id.toString()
      );
      // Unlink items that referenced this event
      for (const item of budget.items) {
        if (item.weddingEvent?.toString() === event._id.toString()) {
          item.weddingEvent = null;
        }
      }
      await budget.save();
    }
  } catch {
    // Non-critical
  }

  res.status(200).json({
    success: true,
    message: 'Event deleted.',
  });
});

/**
 * @route   PUT /api/v1/events/bulk-allocations
 * @desc    Update budget allocations for multiple events at once
 * @access  Private (User)
 */
export const updateBulkAllocations = asyncHandler(async (req, res) => {
  const { allocations } = req.body; // [{ eventId, allocatedBudget }]

  if (!Array.isArray(allocations) || allocations.length === 0) {
    const error = new Error('Allocations array is required.');
    error.statusCode = 400;
    throw error;
  }

  const ops = allocations.map(({ eventId, allocatedBudget }) => ({
    updateOne: {
      filter: { _id: eventId, user: req.user._id },
      update: { $set: { allocatedBudget: Number(allocatedBudget) || 0 } },
    },
  }));

  await WeddingEvent.bulkWrite(ops);

  // Also sync allocations to budget.events (upsert: update existing, add missing)
  try {
    const budget = await Budget.findOne({ user: req.user._id });
    if (budget) {
      for (const { eventId, allocatedBudget } of allocations) {
        const entry = budget.events.find(e => e.weddingEvent?.toString() === eventId);
        if (entry) {
          entry.allocatedAmount = Number(allocatedBudget) || 0;
        } else {
          // Event missing from budget.events — look up and add it
          const evt = await WeddingEvent.findById(eventId);
          if (evt) {
            budget.events.push({
              weddingEvent: evt._id,
              eventType: evt.eventType,
              allocatedAmount: Number(allocatedBudget) || 0,
            });
          }
        }
      }
      await budget.save();
    }
  } catch {
    // Non-critical
  }

  const events = await WeddingEvent.find({ user: req.user._id }).sort('sortOrder eventDate');

  res.status(200).json({
    success: true,
    message: 'Allocations updated.',
    data: { events },
  });
});
