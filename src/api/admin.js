// Re-export from shared API
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
