import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import Notification from '../models/Notification.model.js';
import { logger } from './logger.js';

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

// Rate limiting: Map<socketId, { count, resetTime }>
const messageLimits = new Map();
const MAX_MESSAGES_PER_MINUTE = 30;

let io;

export function getIO() {
  return io;
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId.toString());
}

export function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Same origin policy as Express app
        if (!origin) return callback(null, true);
        if (/\.vercel\.app$/.test(origin)) return callback(null, true);
        if (/\.ngrok(-free)?\.(app|dev)$/.test(origin) || /\.ngrok\.io$/.test(origin))
          return callback(null, true);
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8081',
          'http://10.1.146.230:5173',
          'http://192.168.2.102:5173',
        ];
        if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Socket CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth middleware ───
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email role avatar');

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      };
      next();
    } catch (err) {
      logger.error('Socket auth error:', err.message);
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handler ───
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    logger.info(`Socket connected: ${userId} (${socket.user.name})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // Broadcast online status to conversations
    broadcastOnlineStatus(userId, true);

    // ─── Join a conversation room ───
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        socket.join(`conversation:${conversationId}`);
        logger.info(`User ${userId} joined conversation ${conversationId}`);
      } catch (err) {
        logger.error('join_conversation error:', err.message);
      }
    });

    // ─── Leave a conversation room ───
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ─── Send message ───
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'text' } = data;

        // Rate limiting
        if (!checkRateLimit(socket.id)) {
          socket.emit('error', { message: 'Too many messages. Please slow down.' });
          return;
        }

        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Message content is required.' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 chars).' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found.' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) {
          socket.emit('error', { message: 'Not a participant.' });
          return;
        }

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content: content.trim(),
          messageType,
          readBy: [{ user: userId }],
        });

        // Populate sender info
        await message.populate('sender', 'name email avatar');

        // Update conversation
        const recipientId = conversation.participants.find(
          (p) => p.toString() !== userId
        );
        const currentUnread = conversation.unreadCounts.get(recipientId.toString()) || 0;
        conversation.lastMessage = {
          text: content.trim(),
          sender: userId,
          createdAt: message.createdAt,
        };
        conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
        await conversation.save();

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', {
          message: {
            _id: message._id,
            conversation: message.conversation,
            sender: message.sender,
            content: message.content,
            messageType: message.messageType,
            readBy: message.readBy,
            createdAt: message.createdAt,
          },
        });

        // Send notification to recipient's personal room
        io.to(`user:${recipientId}`).emit('notification', {
          type: 'new_message',
          conversationId,
          message: {
            _id: message._id,
            content: message.content,
            sender: {
              _id: userId,
              name: socket.user.name,
              avatar: socket.user.avatar,
            },
          },
          createdAt: message.createdAt,
        });

        // Update unread count for recipient
        io.to(`user:${recipientId}`).emit('unread_update', {
          conversationId,
          unreadCount: currentUnread + 1,
        });

        // Create persistent notification for offline delivery
        await Notification.create({
          recipient: recipientId,
          type: 'new_message',
          title: `New message from ${socket.user.name}`,
          message: content.trim().substring(0, 100),
          relatedModel: 'Conversation',
          relatedId: conversationId,
          channels: { inApp: true },
        });

        // Send push notification if recipient is offline
        if (!isUserOnline(recipientId.toString())) {
          sendPushNotification(recipientId, socket.user.name, content.trim());
        }
      } catch (err) {
        logger.error('send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // ─── Typing indicators ───
    socket.on('typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        userName: socket.user.name,
        conversationId,
      });
    });

    socket.on('stop_typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId,
      });
    });

    // ─── Mark messages as read ───
    socket.on('mark_read', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        // Update unread count
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();

        // Mark messages as read
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

        // Notify sender that messages were read
        const recipientId = conversation.participants.find(
          (p) => p.toString() !== userId
        );
        io.to(`user:${recipientId}`).emit('messages_read', {
          conversationId,
          readBy: userId,
        });
      } catch (err) {
        logger.error('mark_read error:', err.message);
      }
    });

    // ─── Disconnect ───
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          broadcastOnlineStatus(userId, false);
        }
      }

      // Clean up rate limit
      messageLimits.delete(socket.id);
    });
  });

  return io;
}

// ─── Helpers ───

function checkRateLimit(socketId) {
  const now = Date.now();
  const limit = messageLimits.get(socketId);

  if (!limit || now > limit.resetTime) {
    messageLimits.set(socketId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

async function broadcastOnlineStatus(userId, isOnline) {
  try {
    const conversations = await Conversation.find({
      participants: userId,
    }).select('participants');

    for (const conv of conversations) {
      const recipientId = conv.participants.find((p) => p.toString() !== userId);
      if (recipientId) {
        io.to(`user:${recipientId}`).emit(isOnline ? 'user_online' : 'user_offline', {
          userId,
        });
      }
    }
  } catch (err) {
    logger.error('broadcastOnlineStatus error:', err.message);
  }
}

async function sendPushNotification(recipientId, senderName, messageText) {
  try {
    const user = await User.findById(recipientId).select('pushTokens');
    if (!user?.pushTokens?.length) return;

    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    const messages = user.pushTokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default',
        title: senderName,
        body: messageText.substring(0, 100),
        data: { type: 'new_message', recipientId: recipientId.toString() },
      }));

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    }
  } catch (err) {
    logger.error('Push notification error:', err.message);
  }
}
