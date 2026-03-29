import client from './client.js';

export const vendorAPI = {
  getAll: (params) => client.get('/vendors', { params }),
  search: (params) => client.get('/vendors/search', { params }),
  getById: (id) => client.get(`/vendors/${id}`),
  getBySlug: (slug) => client.get(`/vendors/slug/${slug}`),
  getMyProfile: () => client.get('/vendors/me/profile'),
  createProfile: (data) => client.post('/vendors/profile', data),
  updateProfile: (data) => client.put('/vendors/me/profile', data),
  addPackage: (data) => client.post('/vendors/me/packages', data),
  updatePackage: (packageId, data) => client.put(`/vendors/me/packages/${packageId}`, data),
  deletePackage: (packageId) => client.delete(`/vendors/me/packages/${packageId}`),
  getReviews: (id) => client.get(`/vendors/${id}/reviews`),
  addReview: (id, data) => client.post(`/vendors/${id}/reviews`, data),
  togglePortfolioLike: (vendorId, itemId) => client.post(`/vendors/${vendorId}/portfolio/${itemId}/like`),
  addPortfolioComment: (vendorId, itemId, text) => client.post(`/vendors/${vendorId}/portfolio/${itemId}/comments`, { text }),
  deletePortfolioComment: (vendorId, itemId, commentId) => client.delete(`/vendors/${vendorId}/portfolio/${itemId}/comments/${commentId}`),
};
