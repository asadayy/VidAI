import express from 'express';
import { protect, authorize, protectAdmin } from '../middleware/auth.middleware.js';
import {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  bulkUpdateReports,
} from '../controllers/report.controller.js';

const router = express.Router();

// User/vendor can submit reports.
router.post('/', protect, authorize('user', 'vendor'), createReport);

// Admin report moderation endpoints.
router.get('/admin', protectAdmin, getAllReports);
router.patch('/admin/bulk', protectAdmin, bulkUpdateReports);
router.get('/admin/:id', protectAdmin, getReportById);
router.patch('/admin/:id', protectAdmin, updateReport);

export default router;
