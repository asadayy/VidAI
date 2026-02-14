import Stripe from 'stripe';
import { logger } from './logger.js';

let stripe = null;

export const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('PASTE')) {
      logger.warn('Stripe secret key not configured. Payment features will be disabled.');
      return null;
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
    logger.info('Stripe initialized successfully');
  }
  return stripe;
};
