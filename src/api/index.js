// Re-export from shared API
export { authAPI } from '../../shared/api/auth.js';
export { vendorAPI } from '../../shared/api/vendors.js';
export { bookingAPI } from '../../shared/api/bookings.js';
export { budgetAPI } from '../../shared/api/budget.js';
export { paymentAPI } from '../../shared/api/payments.js';
export { default as client } from '../../shared/api/client.js';

// Web-only APIs (not needed in mobile)
import client from '../../shared/api/client.js';
export const adminAPI = {
  getDashboard: () => client.get('/admin/dashboard'),
  getUsers: (params) => client.get('/admin/users', { params }),
  getVendors: (params) => client.get('/admin/vendors', { params }),
  verifyVendor: (id) => client.patch(`/admin/vendors/${id}/verify`),
  rejectVendor: (id, data) => client.patch(`/admin/vendors/${id}/reject`, data),
  toggleUserStatus: (id) => client.patch(`/admin/users/${id}/toggle-status`),
  getActivityLogs: (params) => client.get('/admin/activity-logs', { params }),
  getSystemHealth: () => client.get('/admin/system-health'),
};

export const uploadAPI = {
  uploadImage: (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return client.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files, folder = 'general') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('folder', folder);
    return client.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (publicId) => client.delete('/upload/image', { data: { publicId } }),
};
