import express from 'express';
import {
  createBudget,
  getMyBudget,
  getBudgetSummary,
  updateBudgetItem,
  addBudgetItem,
  deleteBudgetItem,
  generateAIPlan,
  recommendVendors,
  getEventBudgetSummary,
} from '../controllers/budget.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('user'), createBudget);
router.get('/me', protect, authorize('user'), getMyBudget);
router.get('/summary', protect, authorize('user'), getBudgetSummary);
router.post('/items', protect, authorize('user'), addBudgetItem);
router.put('/items/:itemId', protect, authorize('user'), updateBudgetItem);
router.delete('/items/:itemId', protect, authorize('user'), deleteBudgetItem);
router.get('/event-summary', protect, authorize('user'), getEventBudgetSummary);
router.post('/ai-plan', protect, authorize('user'), generateAIPlan);
router.post('/vendor-picks', protect, authorize('user'), recommendVendors);

export default router;
