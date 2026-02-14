import client from './client';

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  getMe: () => client.get('/auth/me'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (data) => client.post('/auth/reset-password', data),
  updatePassword: (data) => client.put('/auth/update-password', data),
  refreshToken: (refreshToken) => client.post('/auth/refresh-token', { refreshToken }),
};
