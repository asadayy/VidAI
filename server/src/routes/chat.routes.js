import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  markAsRead,
  getUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/chat.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', getMessages);
router.patch('/conversations/:id/read', markAsRead);
router.get('/unread-count', getUnreadCount);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
