import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  refreshToken,
  completeOnboarding,
  registerPushToken,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateRegister, validateLogin } from '../middleware/validate.middleware.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/update-password', protect, updatePassword);
router.post('/refresh-token', refreshToken);
router.post('/onboarding', protect, completeOnboarding);
router.post('/push-token', protect, registerPushToken);

export default router;
