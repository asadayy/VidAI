import express from 'express';
import {
    generateInvitation,
    generateInvitationImage,
    getMyInvitations,
    getInvitation,
    updateInvitation,
    deleteInvitation
} from '../controllers/invitation.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/:id/public', getInvitation); // Special route for public viewing without auth

// Protected routes
router.use(protect);

router.post('/generate', generateInvitation);
router.post('/generate-image', generateInvitationImage);
router.get('/', getMyInvitations);
router.get('/:id', getInvitation);
router.patch('/:id', updateInvitation);
router.delete('/:id', deleteInvitation);

export default router;
