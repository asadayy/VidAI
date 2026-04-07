import client from './client.js';

export const bookingAPI = {
  create: (data) => client.post('/bookings', data),
  getMyBookings: (params) => client.get('/bookings/my-bookings', { params }),
  getVendorBookings: (params) => client.get('/bookings/vendor-bookings', { params }),
  getById: (id) => client.get(`/bookings/${id}`),
  updateStatus: (id, data) => client.patch(`/bookings/${id}/status`, data),
  updatePayment: (id, data) => client.patch(`/bookings/${id}/payment`, data),
  cancel: (id, data) => client.patch(`/bookings/${id}/cancel`, data),
};
