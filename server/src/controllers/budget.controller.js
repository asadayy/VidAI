import Budget from '../models/Budget.model.js';
import Vendor from '../models/Vendor.model.js';
import Booking from '../models/Booking.model.js';
import WeddingEvent from '../models/WeddingEvent.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';

const CATEGORY_ENUM_MAP = {
  Venue:         ['venue'],
  Catering:      ['caterer'],
  Photography:   ['photographer'],
  'Makeup/Mehndi': ['makeup_artist', 'mehndi_artist'],
  Decoration:    ['decorator'],
};

/**
 * @route   POST /api/v1/budget
 * @desc    Create or update a budget
 * @access  Private (User)
 */
export const createBudget = asyncHandler(async (req, res) => {
  const { totalBudget, eventType, items, events } = req.body;

  if (!totalBudget || totalBudget <= 0) {
    const error = new Error('Total budget is required and must be positive.');
    error.statusCode = 400;
    throw error;
  }

  // Upsert - one budget per user
  let budget = await Budget.findOne({ user: req.user._id });
  const isNewBudget = !budget;  // Track before save

  if (budget) {
    budget.totalBudget = totalBudget;
    if (eventType) budget.eventType = eventType;
    if (items) budget.items = items;
    if (events) budget.events = events;
    await budget.save();
  } else {
    budget = await Budget.create({
      user: req.user._id,
      totalBudget,
      eventType: eventType || 'full_wedding',
      items: items || [],
      events: events || [],
    });
  }

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: isNewBudget ? 'create_budget' : 'update_budget',
    resourceType: 'Budget',
    resourceId: budget._id,
    details: `Budget ${isNewBudget ? 'created' : 'updated'} with total PKR ${totalBudget}`,
  });

  res.status(isNewBudget ? 201 : 200).json({
    success: true,
    message: isNewBudget ? 'Budget created.' : 'Budget updated.',
    data: { budget },
  });
});

/**
 * @route   GET /api/v1/budget/me
 * @desc    Get current user's budget
 * @access  Private (User)
 */
export const getMyBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    return res.status(200).json({
      success: true,
      data: { budget: null },
      message: 'No budget found. Create one to get started.',
    });
  }

  // Defensive sync: ensure every WeddingEvent is represented in budget.events
  try {
    const userEvents = await WeddingEvent.find({ user: req.user._id });
    if (userEvents.length > 0) {
      let changed = false;
      for (const evt of userEvents) {
        const exists = budget.events.some(
          e => e.weddingEvent?.toString() === evt._id.toString()
        );
        if (!exists) {
          budget.events.push({
            weddingEvent: evt._id,
            eventType: evt.eventType,
            allocatedAmount: evt.allocatedBudget || 0,
          });
          changed = true;
        }
      }
      if (changed) await budget.save();
    }
  } catch {
    // Non-critical — don't block budget fetch
  }

  res.status(200).json({
    success: true,
    data: { budget },
  });
});

/**
 * @route   POST /api/v1/budget/items
 * @desc    Add a budget item
 * @access  Private (User)
 */
export const addBudgetItem = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    const error = new Error('No budget found. Create a budget first.');
    error.statusCode = 404;
    throw error;
  }

  const { category, allocatedAmount, notes, weddingEvent } = req.body;
  if (!category || allocatedAmount === undefined) {
    const error = new Error('Category and allocated amount are required.');
    error.statusCode = 400;
    throw error;
  }

  budget.items.push({ category, allocatedAmount, notes, weddingEvent: weddingEvent || null });
  await budget.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'add_budget_item',
    resourceType: 'Budget',
    resourceId: budget._id,
    details: `Added budget item: ${category} — PKR ${allocatedAmount}`,
  });

  res.status(201).json({
    success: true,
    message: 'Budget item added.',
    data: { budget },
  });
});

/**
 * @route   PUT /api/v1/budget/items/:itemId
 * @desc    Update a budget item
 * @access  Private (User)
 */
export const updateBudgetItem = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    const error = new Error('No budget found.');
    error.statusCode = 404;
    throw error;
  }

  const item = budget.items.id(req.params.itemId);
  if (!item) {
    const error = new Error('Budget item not found.');
    error.statusCode = 404;
    throw error;
  }

  const { category, allocatedAmount, spentAmount, notes, weddingEvent } = req.body;
  if (category !== undefined) item.category = category;
  if (allocatedAmount !== undefined) item.allocatedAmount = allocatedAmount;
  if (spentAmount !== undefined) item.spentAmount = spentAmount;
  if (notes !== undefined) item.notes = notes;
  if (weddingEvent !== undefined) item.weddingEvent = weddingEvent || null;

  await budget.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'update_budget_item',
    resourceType: 'Budget',
    resourceId: budget._id,
    details: `Updated budget item: ${item.category}`,
  });

  res.status(200).json({
    success: true,
    message: 'Budget item updated.',
    data: { budget },
  });
});

/**
 * @route   DELETE /api/v1/budget/items/:itemId
 * @desc    Delete a budget item
 * @access  Private (User)
 */
export const deleteBudgetItem = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    const error = new Error('No budget found.');
    error.statusCode = 404;
    throw error;
  }

  const item = budget.items.id(req.params.itemId);
  if (!item) {
    const error = new Error('Budget item not found.');
    error.statusCode = 404;
    throw error;
  }

  const deletedCategory = item.category;
  item.deleteOne();
  await budget.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete_budget_item',
    resourceType: 'Budget',
    resourceId: budget._id,
    details: `Deleted budget item: ${deletedCategory}`,
  });

  res.status(200).json({
    success: true,
    message: 'Budget item deleted.',
    data: { budget },
  });
});

/**
 * @route   POST /api/v1/budget/ai-plan
 * @desc    Generate AI budget plan via AI microservice
 * @access  Private (User)
 */
export const generateAIPlan = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    const error = new Error('No budget found. Create a budget first.');
    error.statusCode = 404;
    throw error;
  }

  // Per-event plan generation
  const { eventId } = req.query;
  let targetBudget = budget.totalBudget;
  let targetEventType = budget.eventType;

  if (eventId) {
    const eventEntry = budget.events.find(e => e.weddingEvent?.toString() === eventId);
    if (eventEntry) {
      targetBudget = eventEntry.allocatedAmount ?? budget.totalBudget;
      targetEventType = eventEntry.eventType || budget.eventType;
    }
  }

  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/api/v1/budget-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalBudget: targetBudget,
        eventType: targetEventType,
        currency: budget.currency,
        userId: req.user._id.toString(),
        preferences: req.user.onboarding || {},
      }),
      signal: AbortSignal.timeout(200000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'AI service responded with an error.');
    }

    const aiResult = await response.json();

    const aiPlan = {
      generatedAt: new Date(),
      allocations: aiResult.data?.allocations || [],
      summary: aiResult.data?.summary || '',
      tips: aiResult.data?.tips || [],
    };

    // Save to per-event slot or master
    if (eventId) {
      const eventEntry = budget.events.find(e => e.weddingEvent?.toString() === eventId);
      if (eventEntry) {
        eventEntry.aiPlan = aiPlan;
      }
    } else {
      budget.aiPlan = aiPlan;
    }
    await budget.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'generate_ai_plan',
      resourceType: 'Budget',
      resourceId: budget._id,
      details: `AI budget plan generated for ${eventId ? targetEventType : 'full wedding'} — PKR ${targetBudget}`,
    });

    res.status(200).json({
      success: true,
      message: 'AI budget plan generated.',
      data: { budget },
    });
  } catch (error) {
    logger.error('AI Budget Plan error:', error.message);
    logger.error('Full error:', error);

    // Fallback: provide a basic default plan
    const defaultAllocations = [
      { category: 'Venue', percentage: 30, amount: targetBudget * 0.30, explanation: 'Wedding hall or marquee rental' },
      { category: 'Catering', percentage: 25, amount: targetBudget * 0.25, explanation: 'Food and beverage services' },
      { category: 'Photography', percentage: 10, amount: targetBudget * 0.10, explanation: 'Photography and videography' },
      { category: 'Decoration', percentage: 10, amount: targetBudget * 0.10, explanation: 'Stage, floral, and event decoration' },
      { category: 'Attire & Makeup', percentage: 10, amount: targetBudget * 0.10, explanation: 'Bridal/groom wear and makeup' },
      { category: 'Music & Entertainment', percentage: 5, amount: targetBudget * 0.05, explanation: 'DJ, sound, lighting' },
      { category: 'Invitations', percentage: 3, amount: targetBudget * 0.03, explanation: 'Physical and digital invitations' },
      { category: 'Transport', percentage: 3, amount: targetBudget * 0.03, explanation: 'Wedding car and guest transport' },
      { category: 'Miscellaneous', percentage: 4, amount: targetBudget * 0.04, explanation: 'Buffer for unexpected expenses' },
    ];

    const fallbackPlan = {
      generatedAt: new Date(),
      allocations: defaultAllocations,
      summary: 'Budget plan generated using standard Pakistani wedding allocation ratios (AI service unavailable - using defaults).',
      tips: [
        'Book venue early for better rates',
        'Get multiple catering quotes',
        'Keep 5-10% as emergency buffer',
      ],
    };

    // Save to per-event slot or master
    if (eventId) {
      const eventEntry = budget.events.find(e => e.weddingEvent?.toString() === eventId);
      if (eventEntry) {
        eventEntry.aiPlan = fallbackPlan;
      }
    } else {
      budget.aiPlan = fallbackPlan;
    }
    await budget.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'generate_ai_plan',
      resourceType: 'Budget',
      resourceId: budget._id,
      details: `AI plan fallback generated for ${eventId ? targetEventType : 'full wedding'} — PKR ${targetBudget} (AI unavailable)`,
    });

    res.status(200).json({
      success: true,
      message: 'AI service unavailable. Generated plan using standard allocations.',
      data: { budget },
    });
  }
});

/**
 * @route   POST /api/v1/budget/vendor-picks
 * @desc    AI-powered vendor matching for user-selected categories with budget %
 * @access  Private (User)
 */
export const recommendVendors = asyncHandler(async (req, res) => {
  const { categories, eventId } = req.body;

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    const err = new Error('categories array is required.');
    err.statusCode = 400;
    throw err;
  }

  const totalPct = categories.reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  if (totalPct > 100) {
    const err = new Error(`Category percentages cannot exceed 100% (got ${totalPct}).`);
    err.statusCode = 400;
    throw err;
  }

  // Get user's budget document
  const budget = await Budget.findOne({ user: req.user._id });
  if (!budget) {
    const err = new Error('No budget found. Please create a budget first.');
    err.statusCode = 404;
    throw err;
  }

  // Determine active budget scope: event-specific or global
  let totalBudget = budget.totalBudget;
  let activeEventType = null;
  let activeEventDate = null;

  if (eventId) {
    // Per-event scope: use that event's allocated budget
    const eventEntry = budget.events.find(e => e.weddingEvent?.toString() === eventId);
    if (eventEntry && eventEntry.allocatedAmount > 0) {
      totalBudget = eventEntry.allocatedAmount;
      activeEventType = eventEntry.eventType || null;
    }
    // Fetch full event details for date context
    try {
      const weddingEvent = await WeddingEvent.findById(eventId).lean();
      if (weddingEvent) {
        activeEventDate = weddingEvent.eventDate || null;
        activeEventType = activeEventType || weddingEvent.eventType;
      }
    } catch { /* non-critical */ }
  }

  const preferences = req.user.onboarding || {};

  // Call AI service for category analysis
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  let aiPicks = [];

  try {
    const aiResponse = await fetch(`${aiServiceUrl}/api/v1/vendor-picks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalBudget,
        categoriesWithPercentages: categories.map(c => ({ name: c.name, percentage: Number(c.percentage) })),
        preferences,
        userId: req.user._id.toString(),
        eventType: activeEventType || '',
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI service responded with ${aiResponse.status}`);
    const aiData = await aiResponse.json();
    aiPicks = aiData?.data?.picks || [];
  } catch (aiErr) {
    logger.warn('AI vendor-picks failed, using fallback: %s', aiErr.message);
    // Fallback: use direct category map
    aiPicks = categories.map(c => ({
      category: c.name,
      vendorCategory: (CATEGORY_ENUM_MAP[c.name] || ['other'])[0],
      reasoning: 'AI unavailable — using default category mapping.',
      keyFeatures: [],
    }));
  }

  // For each AI pick, find the best matching vendor in the DB
  const city = preferences.weddingLocation || '';
  const eventDate = activeEventDate || preferences.eventDate || null;
  const picks = [];

  // Get booked vendor IDs for the event date to exclude them
  let bookedVendorIds = new Set();
  if (eventDate) {
    try {
      const dayStart = new Date(eventDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const bookingsOnDate = await Booking.find({
        eventDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ['pending', 'approved'] },
      }).select('vendor').lean();

      bookedVendorIds = new Set(bookingsOnDate.map(b => b.vendor?.toString()).filter(Boolean));
      if (bookedVendorIds.size > 0) {
        logger.info(`Excluding ${bookedVendorIds.size} vendor(s) booked on ${eventDate}`);
      }
    } catch (err) {
      logger.warn('Failed to check vendor bookings: %s', err.message);
    }
  }

  for (const pick of aiPicks) {
    const sourceCat = categories.find(c => c.name === pick.category);
    if (!sourceCat) continue;

    const pct = Number(sourceCat.percentage);
    const budgetAmount = Math.round(totalBudget * pct / 100);
    const maxPrice = Math.round(budgetAmount * 1.10); // 10% above budget cap
    const categoryEnums = CATEGORY_ENUM_MAP[pick.category] || [pick.vendorCategory];

    const baseFilter = {
      category: { $in: categoryEnums },
      verificationStatus: 'approved',
      ...(bookedVendorIds.size > 0 ? { _id: { $nin: [...bookedVendorIds].map(id => id) } } : {}),
    };
    const selectFields = 'businessName slug city startingPrice ratingsAverage coverImage category';

    let vendor = null;

    // Try: city + within 10% of budget — sorted by price closest to budget
    if (city) {
      const candidates = await Vendor.find({
        ...baseFilter,
        city: new RegExp(city, 'i'),
        startingPrice: { $gt: 0, $lte: maxPrice },
      })
        .select(selectFields)
        .lean();

      if (candidates.length > 0) {
        // Sort by price proximity to budget (closest first, prefer cheaper)
        candidates.sort((a, b) => {
          const diffA = Math.abs((a.startingPrice || 0) - budgetAmount);
          const diffB = Math.abs((b.startingPrice || 0) - budgetAmount);
          if (diffA !== diffB) return diffA - diffB;
          return (a.startingPrice || 0) - (b.startingPrice || 0); // prefer cheaper
        });
        vendor = candidates[0];
      }
    }

    // Fallback: city only (no price filter)
    if (!vendor && city) {
      vendor = await Vendor.findOne({ ...baseFilter, city: new RegExp(city, 'i') })
        .sort({ ratingsAverage: -1 })
        .select(selectFields);
    }

    // Fallback: any city within budget — closest price match
    if (!vendor) {
      const candidates = await Vendor.find({
        ...baseFilter,
        startingPrice: { $gt: 0, $lte: maxPrice },
      })
        .select(selectFields)
        .lean();

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const diffA = Math.abs((a.startingPrice || 0) - budgetAmount);
          const diffB = Math.abs((b.startingPrice || 0) - budgetAmount);
          if (diffA !== diffB) return diffA - diffB;
          return (a.startingPrice || 0) - (b.startingPrice || 0);
        });
        vendor = candidates[0];
      }
    }

    // Final fallback: any approved vendor in category
    if (!vendor) {
      vendor = await Vendor.findOne(baseFilter)
        .sort({ ratingsAverage: -1 })
        .select(selectFields);
    }

    if (!vendor) continue;

    picks.push({
      category: pick.category,
      percentage: pct,
      budgetAmount,
      reasoning: pick.reasoning,
      keyFeatures: pick.keyFeatures || [],
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
        slug: vendor.slug,
        city: vendor.city,
        startingPrice: vendor.startingPrice,
        ratingsAverage: vendor.ratingsAverage,
        coverImage: vendor.coverImage?.url || null,
        category: vendor.category,
      },
    });
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'ai_vendor_recommendation',
    resourceType: 'Budget',
    details: `AI vendor recommendation — ${categories.map(c => c.name).join(', ')} (${picks.length} match${picks.length !== 1 ? 'es' : ''})${activeEventType ? ` for ${activeEventType}` : ''} — budget PKR ${totalBudget}`,
  });

  res.status(200).json({
    success: true,
    message: `Found ${picks.length} vendor pick(s).`,
    data: {
      picks,
      totalBudget,
      currency: 'PKR',
      eventId: eventId || null,
      eventType: activeEventType || null,
    },
  });
});

/**
 * @route   GET /api/v1/budget/event-summary
 * @desc    Get per-event budget breakdown (allocated, spent, remaining, item count)
 * @access  Private (User)
 */
export const getEventBudgetSummary = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ user: req.user._id });

  if (!budget) {
    const error = new Error('No budget found.');
    error.statusCode = 404;
    throw error;
  }

  const summary = budget.events.map(ev => {
    const eventItems = budget.items.filter(
      item => item.weddingEvent?.toString() === ev.weddingEvent?.toString()
    );
    const spent = eventItems.reduce((sum, item) => sum + (item.spent || 0), 0);
    const allocated = ev.allocatedAmount || 0;

    return {
      weddingEvent: ev.weddingEvent,
      eventType: ev.eventType,
      allocatedAmount: allocated,
      spent,
      remaining: allocated - spent,
      itemCount: eventItems.length,
      hasAiPlan: !!ev.aiPlan?.generatedAt,
    };
  });

  // Items not assigned to any event
  const unassignedItems = budget.items.filter(item => !item.weddingEvent);
  const unassignedSpent = unassignedItems.reduce((sum, item) => sum + (item.spent || 0), 0);
  const totalAllocated = budget.events.reduce((sum, ev) => sum + (ev.allocatedAmount || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      totalBudget: budget.totalBudget,
      totalAllocated,
      unallocated: budget.totalBudget - totalAllocated,
      unassignedItems: { count: unassignedItems.length, spent: unassignedSpent },
      events: summary,
    },
  });
});
