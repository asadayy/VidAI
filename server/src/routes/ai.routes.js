import express from 'express';
import {
  chatWithAI,
  getRecommendations,
  getBudgetPlan,
} from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/chat', protect, chatWithAI);
router.post('/recommendations', protect, getRecommendations);
router.post('/budget-plan', protect, getBudgetPlan);

export default router;
