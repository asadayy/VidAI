import client from './client';

export const paymentAPI = {
  createCheckout: (bookingId) => client.post('/payments/create-checkout-session', { bookingId }),
  getStatus: (bookingId) => client.get(`/payments/status/${bookingId}`),
};
