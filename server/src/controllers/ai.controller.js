import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';
import ActivityLog from '../models/ActivityLog.model.js';

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
 * @route   POST /api/v1/ai/recommendations
 * @desc    Get AI vendor recommendations
 * @access  Private
 */
export const getRecommendations = asyncHandler(async (req, res) => {
  const { preferences, budget, city, category } = req.body;

  try {
    const aiResponse = await callAIService('/api/v1/recommendations', {
      preferences,
      budget,
      city,
      category,
      userId: req.user._id.toString(),
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'ai_recommendation',
      resourceType: 'System',
      details: `AI vendor recommendations requested — category: ${category || 'all'}, city: ${city || 'any'}, budget: ${budget || 'any'}`,
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
