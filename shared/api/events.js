import client from './client.js';

export const eventAPI = {
  create: (data) => client.post('/events', data),
  getAll: () => client.get('/events'),
  get: (id) => client.get(`/events/${id}`),
  update: (id, data) => client.put(`/events/${id}`, data),
  delete: (id) => client.delete(`/events/${id}`),
  updateAllocations: (allocations) => client.put('/events/bulk-allocations', { allocations }),
  getUpcomingCount: () => client.get('/events/upcoming-count'),
};
