import client from './client';

export const chatAPI = {
  getConversations: () => client.get('/chat/conversations'),

  getOrCreateConversation: (vendorId) =>
    client.post('/chat/conversations', { vendorId }),

  getMessages: (conversationId, cursor) => {
    const params = { limit: 50 };
    if (cursor) params.cursor = cursor;
    return client.get(`/chat/conversations/${conversationId}/messages`, { params });
  },

  markAsRead: (conversationId) =>
    client.patch(`/chat/conversations/${conversationId}/read`),

  getUnreadCount: () => client.get('/chat/unread-count'),
};
