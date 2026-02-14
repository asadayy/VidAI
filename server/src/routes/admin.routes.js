import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getAllVendors,
  verifyVendor,
  rejectVendor,
  toggleUserStatus,
  getActivityLogs,
  getSystemHealth,
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/vendors', getAllVendors);
router.patch('/vendors/:id/verify', verifyVendor);
router.patch('/vendors/:id/reject', rejectVendor);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.get('/activity-logs', getActivityLogs);
router.get('/system-health', getSystemHealth);

export default router;
