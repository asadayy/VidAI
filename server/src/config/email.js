import sgMail from '@sendgrid/mail';
import { logger } from './logger.js';

export const configureEmail = () => {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey || apiKey.startsWith('PASTE')) {
    logger.warn('SendGrid API key not configured. Email features will use mock mode.');
    return false;
  }

  sgMail.setApiKey(apiKey);
  logger.info('SendGrid email service configured');
  return true;
};

/**
 * Send an email via SendGrid
 * Falls back to console logging if SendGrid is not configured
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey || apiKey.startsWith('PASTE')) {
    // Mock mode - log the email instead of sending
    logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@vidai.pk',
        name: process.env.SENDGRID_FROM_NAME || 'VidAI',
      },
      subject,
      text,
      html: html || text,
    };

    await sgMail.send(msg);
    logger.info(`Email sent to ${to}: ${subject}`);
    return { success: true, mock: false };
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    throw error;
  }
};

/**
 * Mock SMS sender - logs to console
 * Replace with Twilio or local SMS API when ready
 */
export const sendSMS = async ({ to, message }) => {
  logger.info(`[MOCK SMS] To: ${to} | Message: ${message}`);
  return { success: true, mock: true, to, message };
};
