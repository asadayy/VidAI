import express from 'express';
import { uploadImage, uploadMultipleImages, deleteImage } from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/image', protect, uploadImage);
router.post('/images', protect, uploadMultipleImages);
router.delete('/image', protect, deleteImage);

export default router;
