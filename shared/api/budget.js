import client from './client.js';

export const budgetAPI = {
  create: (data) => client.post('/budget', data),
  getMine: () => client.get('/budget/me'),
  getSummary: () => client.get('/budget/summary'),
  addItem: (data) => client.post('/budget/items', data),
  updateItem: (itemId, data) => client.put(`/budget/items/${itemId}`, data),
  deleteItem: (itemId) => client.delete(`/budget/items/${itemId}`),
  generateAIPlan: (eventId) =>
    client.post(`/budget/ai-plan${eventId ? `?eventId=${eventId}` : ''}`),
  recommendVendors: (categories, eventId) =>
    client.post('/budget/vendor-picks', { categories, eventId: eventId || null }),
  getEventSummary: () => client.get('/budget/event-summary'),
};
