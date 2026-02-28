import Budget from '../models/Budget.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';

/**
 * @route   POST /api/v1/budget
 * @desc    Create or update a budget
 * @access  Private (User)
 */
export const createBudget = asyncHandler(async (req, res) => {
  const { totalBudget, eventType, items } = req.body;

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
    await budget.save();
  } else {
    budget = await Budget.create({
      user: req.user._id,
      totalBudget,
      eventType: eventType || 'full_wedding',
      items: items || [],
    });
  }

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

  const { category, allocatedAmount, notes } = req.body;
  if (!category || allocatedAmount === undefined) {
    const error = new Error('Category and allocated amount are required.');
    error.statusCode = 400;
    throw error;
  }

  budget.items.push({ category, allocatedAmount, notes });
  await budget.save();

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

  const { category, allocatedAmount, spentAmount, notes } = req.body;
  if (category !== undefined) item.category = category;
  if (allocatedAmount !== undefined) item.allocatedAmount = allocatedAmount;
  if (spentAmount !== undefined) item.spentAmount = spentAmount;
  if (notes !== undefined) item.notes = notes;

  await budget.save();

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

  item.deleteOne();
  await budget.save();

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

  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/api/v1/budget-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalBudget: budget.totalBudget,
        eventType: budget.eventType,
        currency: budget.currency,
        userId: req.user._id.toString(),
        preferences: req.user.onboarding || {},
      }),
      signal: AbortSignal.timeout(200000), // 200 second timeout to match AI controller
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'AI service responded with an error.');
    }

    const aiResult = await response.json();

    // Save AI plan to budget
    budget.aiPlan = {
      generatedAt: new Date(),
      allocations: aiResult.data?.allocations || [],
      summary: aiResult.data?.summary || '',
      tips: aiResult.data?.tips || [],
    };
    await budget.save();

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
      { category: 'Venue', percentage: 30, amount: budget.totalBudget * 0.30, explanation: 'Wedding hall or marquee rental' },
      { category: 'Catering', percentage: 25, amount: budget.totalBudget * 0.25, explanation: 'Food and beverage services' },
      { category: 'Photography', percentage: 10, amount: budget.totalBudget * 0.10, explanation: 'Photography and videography' },
      { category: 'Decoration', percentage: 10, amount: budget.totalBudget * 0.10, explanation: 'Stage, floral, and event decoration' },
      { category: 'Attire & Makeup', percentage: 10, amount: budget.totalBudget * 0.10, explanation: 'Bridal/groom wear and makeup' },
      { category: 'Music & Entertainment', percentage: 5, amount: budget.totalBudget * 0.05, explanation: 'DJ, sound, lighting' },
      { category: 'Invitations', percentage: 3, amount: budget.totalBudget * 0.03, explanation: 'Physical and digital invitations' },
      { category: 'Transport', percentage: 3, amount: budget.totalBudget * 0.03, explanation: 'Wedding car and guest transport' },
      { category: 'Miscellaneous', percentage: 4, amount: budget.totalBudget * 0.04, explanation: 'Buffer for unexpected expenses' },
    ];

    budget.aiPlan = {
      generatedAt: new Date(),
      allocations: defaultAllocations,
      summary: 'Budget plan generated using standard Pakistani wedding allocation ratios (AI service unavailable - using defaults).',
      tips: [
        'Book venue early for better rates',
        'Get multiple catering quotes',
        'Keep 5-10% as emergency buffer',
      ],
    };
    await budget.save();

    res.status(200).json({
      success: true,
      message: 'AI service unavailable. Generated plan using standard allocations.',
      data: { budget },
    });
  }
});
