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
  getAllBookings,
} from '../controllers/admin.controller.js';
import {
  getAllReports,
  getReportById,
  updateReport,
  bulkUpdateReports,
} from '../controllers/report.controller.js';
import { loginAdmin, getAdminMe } from '../controllers/admin-auth.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Admin auth (public) ──
router.post('/auth/login', loginAdmin);

// ── Admin auth (protected) ──
router.get('/auth/me', protectAdmin, getAdminMe);

// ── All remaining admin routes require admin token ──
router.use(protectAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/vendors', getAllVendors);
router.patch('/vendors/:id/verify', verifyVendor);
router.patch('/vendors/:id/reject', rejectVendor);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.get('/activity-logs', getActivityLogs);
router.get('/system-health', getSystemHealth);
router.get('/bookings', getAllBookings);
router.get('/reports', getAllReports);
router.patch('/reports/bulk', bulkUpdateReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id', updateReport);

export default router;
