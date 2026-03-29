import client from './client.js';

export const reportAPI = {
  create: (data) => client.post('/reports', data),
};
