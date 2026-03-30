import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import Notification from '../models/Notification.model.js';
import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get all conversations for the authenticated user
 * @access  Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'name email avatar role phone city area zipCode gender dateOfBirth bio onboarding createdAt')
    .populate('vendor', 'businessName category coverImage slug')
    .sort({ updatedAt: -1 });

  // Add unread count for current user to each conversation
  const result = conversations.map((conv) => {
    const convObj = conv.toObject();
    convObj.unreadCount = conv.unreadCounts.get(userId.toString()) || 0;
    // Identify the other participant
    convObj.otherParticipant = convObj.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );
    return convObj;
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   POST /api/v1/chat/conversations
 * @desc    Create or find existing conversation with a vendor
 * @access  Private
 */
export const createConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { vendorId } = req.body;

  if (!vendorId) {
    const error = new Error('vendorId is required');
    error.statusCode = 400;
    throw error;
  }

  // Lookup vendor to get the vendor's User ID
  const vendor = await Vendor.findById(vendorId).select('user businessName');
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const vendorUserId = vendor.user;

  // Prevent chatting with yourself
  if (vendorUserId.toString() === userId.toString()) {
    const error = new Error('Cannot start a conversation with yourself');
    error.statusCode = 400;
    throw error;
  }

  // Check for existing conversation
  const existing = await Conversation.findOne({
    participants: { $all: [userId, vendorUserId] },
    vendor: vendorId,
  })
    .populate('participants', 'name email avatar role phone city area zipCode gender dateOfBirth bio onboarding createdAt')
    .populate('vendor', 'businessName category coverImage slug');

  if (existing) {
    const convObj = existing.toObject();
    convObj.unreadCount = existing.unreadCounts.get(userId.toString()) || 0;
    convObj.otherParticipant = convObj.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );
    return res.status(200).json({
      success: true,
      data: convObj,
      isNew: false,
    });
  }

  // Create new conversation
  const conversation = await Conversation.create({
    participants: [userId, vendorUserId],
    vendor: vendorId,
    unreadCounts: new Map([
      [userId.toString(), 0],
      [vendorUserId.toString(), 0],
    ]),
  });

  await conversation.populate('participants', 'name email avatar role phone city area zipCode gender dateOfBirth bio onboarding createdAt');
  await conversation.populate('vendor', 'businessName category coverImage slug');

  // Create a system message
  await Message.create({
    conversation: conversation._id,
    sender: userId,
    content: `Conversation started with ${vendor.businessName}`,
    messageType: 'system',
    readBy: [{ user: userId }, { user: vendorUserId }],
  });

  const convObj = conversation.toObject();
  convObj.unreadCount = 0;
  convObj.otherParticipant = convObj.participants.find(
    (p) => p._id.toString() !== userId.toString()
  );

  res.status(201).json({
    success: true,
    data: convObj,
    isNew: true,
  });
});

/**
 * @route   GET /api/v1/chat/conversations/:id/messages
 * @desc    Get paginated messages for a conversation
 * @access  Private (participants only)
 */
export const getMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id: conversationId } = req.params;
  const { cursor, limit = 50 } = req.query;

  // Validate participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    const error = new Error('Not authorized to view this conversation');
    error.statusCode = 403;
    throw error;
  }

  // Build query with cursor-based pagination
  const query = { conversation: conversationId };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const messages = await Message.find(query)
    .populate('sender', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) + 1); // Fetch one extra to check if there are more

  const hasMore = messages.length > parseInt(limit);
  if (hasMore) messages.pop(); // Remove the extra

  res.status(200).json({
    success: true,
    data: messages.reverse(), // Return in chronological order
    hasMore,
    nextCursor: hasMore ? messages[0]?.createdAt?.toISOString() : null,
  });
});

/**
 * @route   PATCH /api/v1/chat/conversations/:id/read
 * @desc    Mark all messages in a conversation as read
 * @access  Private (participants only)
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id: conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  // Reset unread count
  conversation.unreadCounts.set(userId.toString(), 0);
  await conversation.save();

  // Mark unread messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );

  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
  });
});

/**
 * @route   GET /api/v1/chat/unread-count
 * @desc    Get total unread message count across all conversations
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  }).select('unreadCounts');

  let totalUnread = 0;
  for (const conv of conversations) {
    totalUnread += conv.unreadCounts.get(userId) || 0;
  }

  res.status(200).json({
    success: true,
    data: { totalUnread },
  });
});

/**
 * @route   GET /api/v1/chat/notifications
 * @desc    Get recent notifications for the authenticated user
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 30 } = req.query;

  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: notifications,
  });
});

/**
 * @route   PATCH /api/v1/chat/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * @route   PATCH /api/v1/chat/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});
