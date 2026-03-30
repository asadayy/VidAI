import client from './client.js';

export const budgetAPI = {
  create: (data) => client.post('/budget', data),
  getMine: () => client.get('/budget/me'),
  addItem: (data) => client.post('/budget/items', data),
  updateItem: (itemId, data) => client.put(`/budget/items/${itemId}`, data),
  deleteItem: (itemId) => client.delete(`/budget/items/${itemId}`),
  generateAIPlan: (eventId) =>
    client.post(`/budget/ai-plan${eventId ? `?eventId=${eventId}` : ''}`),
  recommendVendors: (categories) => client.post('/budget/vendor-picks', { categories }),
  getEventSummary: () => client.get('/budget/event-summary'),
};
