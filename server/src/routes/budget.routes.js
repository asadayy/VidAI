import express from 'express';
import {
  createBudget,
  getMyBudget,
  updateBudgetItem,
  addBudgetItem,
  deleteBudgetItem,
  generateAIPlan,
} from '../controllers/budget.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('user'), createBudget);
router.get('/me', protect, authorize('user'), getMyBudget);
router.post('/items', protect, authorize('user'), addBudgetItem);
router.put('/items/:itemId', protect, authorize('user'), updateBudgetItem);
router.delete('/items/:itemId', protect, authorize('user'), deleteBudgetItem);
router.post('/ai-plan', protect, authorize('user'), generateAIPlan);

export default router;
