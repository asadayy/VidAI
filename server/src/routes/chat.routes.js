import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  markAsRead,
  getUnreadCount,
} from '../controllers/chat.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', getMessages);
router.patch('/conversations/:id/read', markAsRead);
router.get('/unread-count', getUnreadCount);

export default router;
