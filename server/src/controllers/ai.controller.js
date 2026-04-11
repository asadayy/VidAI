import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';
import ActivityLog from '../models/ActivityLog.model.js';
import User from '../models/User.model.js';
import WeddingEvent from '../models/WeddingEvent.model.js';
import Booking from '../models/Booking.model.js';

/**
 * Helper: call AI microservice
 */
const callAIService = async (endpoint, body) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  logger.info(`Calling AI service at ${AI_SERVICE_URL}${endpoint}`);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(200000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`AI service error (${response.status}):`, errorData);
      throw new Error(errorData.detail || `AI service error: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`AI service responded successfully from ${endpoint}`);
    return data;
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      logger.error(`AI service timeout at ${endpoint}`);
    } else {
      logger.error(`Failed to call AI service at ${endpoint}:`, error.message);
    }
    throw error;
  }
};

/**
 * @route   POST /api/v1/ai/chat
 * @desc    Chat with AI assistant
 * @access  Private
 */
export const chatWithAI = asyncHandler(async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message || message.trim().length === 0) {
    const error = new Error('Message is required.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const aiResponse = await callAIService('/api/v1/chat', {
      message,
      conversationHistory: conversationHistory || [],
      userId: req.user._id.toString(),
    });

    res.status(200).json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    logger.error('AI Chat error:', error.message);
    logger.error('Full error:', error);

    // Fallback response
    res.status(200).json({
      success: true,
      data: {
        response: 'I apologize, but I am currently unable to process your request. The AI assistant is temporarily unavailable. Please try again later or contact support.',
        fallback: true,
      },
    });
  }
});

/**
 * @route   POST /api/v1/ai/chat/stream
 * @desc    Stream chat with AI assistant (SSE)
 * @access  Private
 */
export const chatWithAIStream = asyncHandler(async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message || message.trim().length === 0) {
    const error = new Error('Message is required.');
    error.statusCode = 400;
    throw error;
  }

  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory || [],
        userId: req.user._id.toString(),
      }),
      signal: AbortSignal.timeout(200000),
    });

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (error) {
    logger.error('AI Stream Chat error:', error.message);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/**
 * @route   POST /api/v1/ai/recommendations
 * @desc    Get AI vendor recommendations
 * @access  Private
 */
export const getRecommendations = asyncHandler(async (req, res) => {
  const { preferences, budget, city, category } = req.body;

  try {
    // Fetch user profile for smart matching
    const user = await User.findById(req.user._id).select('onboarding city');
    const onboarding = user?.onboarding || {};

    // Fetch user's wedding events for event date context
    const weddingEvents = await WeddingEvent.find({ user: req.user._id })
      .select('eventType eventDate guestCount allocatedBudget venueType')
      .lean();

    const userProfile = {
      city: city || onboarding.weddingLocation || user?.city || '',
      eventDate: onboarding.eventDate || null,
      guestCount: onboarding.guestCount || 0,
      totalBudget: onboarding.totalBudget || 0,
      venueType: onboarding.venueType || '',
      foodPreference: onboarding.foodPreference || '',
      eventTypes: onboarding.eventTypes || [],
      weddingEvents: weddingEvents.map(e => ({
        eventType: e.eventType,
        eventDate: e.eventDate,
        guestCount: e.guestCount,
        allocatedBudget: e.allocatedBudget,
        venueType: e.venueType,
      })),
    };

    const aiResponse = await callAIService('/api/v1/recommendations', {
      preferences,
      budget,
      city: userProfile.city,
      category,
      userId: req.user._id.toString(),
      userProfile,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'ai_recommendation',
      resourceType: 'System',
      details: `AI vendor recommendations requested — category: ${category || 'all'}, city: ${userProfile.city || 'any'}, budget: ${budget || 'any'}`,
    });

    res.status(200).json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    logger.error('AI Recommendations error:', error.message);
    logger.error('Full error:', error);

    res.status(200).json({
      success: true,
      data: {
        recommendations: [],
        message: 'AI recommendation service is temporarily unavailable.',
        fallback: true,
      },
    });
  }
});

/**
 * @route   POST /api/v1/ai/budget-plan
 * @desc    Get AI budget planning suggestions
 * @access  Private
 */
export const getBudgetPlan = asyncHandler(async (req, res) => {
  const { totalBudget, eventType, preferences } = req.body;

  if (!totalBudget || totalBudget <= 0) {
    const error = new Error('Total budget is required and must be positive.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const aiResponse = await callAIService('/api/v1/budget-plan', {
      totalBudget,
      eventType: eventType || 'full_wedding',
      preferences,
      userId: req.user._id.toString(),
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'ai_budget_plan',
      resourceType: 'Budget',
      details: `AI budget plan requested — PKR ${totalBudget}, type: ${eventType || 'full_wedding'}`,
    });

    res.status(200).json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    logger.error('AI Budget Plan error:', error.message);
    logger.error('Full error:', error);

    res.status(200).json({
      success: true,
      data: {
        message: 'AI budget planning service is temporarily unavailable.',
        fallback: true,
      },
    });
  }
});
