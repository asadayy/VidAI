import express from 'express';
import {
  createEvent,
  getMyEvents,
  getUpcomingCount,
  getEvent,
  updateEvent,
  deleteEvent,
  updateBulkAllocations,
} from '../controllers/event.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('user'), createEvent);
router.get('/', protect, authorize('user'), getMyEvents);
router.get('/upcoming-count', protect, authorize('user'), getUpcomingCount);
router.put('/bulk-allocations', protect, authorize('user'), updateBulkAllocations);
router.get('/:id', protect, authorize('user'), getEvent);
router.put('/:id', protect, authorize('user'), updateEvent);
router.delete('/:id', protect, authorize('user'), deleteEvent);

export default router;
